import { NextResponse } from "next/server";

import { ensureDemoOrg } from "@/lib/data/orgWorkspace";
import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";
import { getSupabaseAdmin, isSupabaseConfigured, logAgentExecution } from "@/lib/supabase/server";

/**
 * Persist current industry pack (CSV or already-hydrated) into the demo org workspace.
 * POST /api/import/persist { industry: "medtech"|"cpg", mode?: "starter"|"replace" }
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    industry?: IndustryPack;
    mode?: "starter" | "replace";
  };
  const industry: IndustryPack = body.industry === "cpg" ? "cpg" : "medtech";
  const sb = getSupabaseAdmin()!;
  const orgId = await ensureDemoOrg(industry);
  if (!orgId) {
    return NextResponse.json({ error: "Could not resolve demo organization" }, { status: 500 });
  }

  // Always read CSV pack for persist so we write the starter/upload baseline, not a circular read.
  const pack = await loadIndustryPack(industry, { preferSupabase: false });
  const skus = pack.files.sku_master?.rows ?? [];
  const nodes = pack.files.nodes?.rows ?? [];
  const lots = pack.files.lots_inventory?.rows ?? [];

  if (body.mode === "replace") {
    await sb.from("lots_inventory").delete().eq("org_id", orgId);
    await sb.from("skus").delete().eq("org_id", orgId);
    await sb.from("nodes").delete().eq("org_id", orgId);
  }

  const skuPayload = skus.map((s) => ({
    org_id: orgId,
    sku_id: s.sku_id,
    sku_name: s.sku_name,
    category: s.category,
    subcategory: s.subcategory,
    abc_class: s.abc_class,
    lead_time_days: Number(s.lead_time_days) || null,
    data_provenance: s.data_provenance ?? "import_wizard",
  }));

  const nodePayload = nodes.map((n) => ({
    org_id: orgId,
    node_id: n.node_id,
    node_type: n.node_type,
    city: n.city,
    pincode: n.pincode,
  }));

  const lotPayload = lots.map((l) => ({
    org_id: orgId,
    sku_id: l.sku_id,
    lot_id: l.lot_id,
    mfg_date: l.mfg_date || null,
    expiry_date: l.expiry_date || null,
    qty: Number(l.qty) || 0,
    node_id: l.node_id,
    unit_cost_inr: Number(l.unit_cost_inr) || null,
    data_provenance: l.data_provenance ?? "import_wizard",
  }));

  const [skuRes, nodeRes, lotRes] = await Promise.all([
    skuPayload.length
      ? sb.from("skus").upsert(skuPayload, { onConflict: "org_id,sku_id" })
      : Promise.resolve({ error: null }),
    nodePayload.length
      ? sb.from("nodes").upsert(nodePayload, { onConflict: "org_id,node_id" })
      : Promise.resolve({ error: null }),
    lotPayload.length
      ? sb.from("lots_inventory").upsert(lotPayload, { onConflict: "org_id,lot_id" })
      : Promise.resolve({ error: null }),
  ]);

  const err = skuRes.error?.message || nodeRes.error?.message || lotRes.error?.message;
  if (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }

  await sb.from("import_jobs").insert({
    org_id: orgId,
    industry,
    status: "completed",
    summary: {
      ...pack.stats,
      source: "import_wizard",
      skus: skuPayload.length,
      nodes: nodePayload.length,
      lots: lotPayload.length,
    },
  });

  await logAgentExecution({
    org_id: orgId,
    agent_id: "ai-inventory-strategist",
    tool_name: "import_persist",
    input: { industry, mode: body.mode ?? "starter" },
    output: {
      summary: `Persisted ${skuPayload.length} SKUs, ${lotPayload.length} lots to workspace`,
      stats: pack.stats,
    },
    confidence: 1,
    status: "completed",
    requires_approval: false,
  });

  return NextResponse.json({
    ok: true,
    orgId,
    industry,
    skus: skuPayload.length,
    nodes: nodePayload.length,
    lots: lotPayload.length,
    stats: pack.stats,
  });
}
