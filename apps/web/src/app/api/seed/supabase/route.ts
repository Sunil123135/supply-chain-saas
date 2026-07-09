import { NextResponse } from "next/server";

import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";

/**
 * Optional: push bundled CSV data into Supabase when service role is configured.
 * Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on Netlify/Railway.
 * Call once: POST /api/seed/supabase?industry=medtech|cpg|all
 * Header: x-seed-secret: <SEED_SECRET>
 */
export async function POST(req: Request) {
  const secret = process.env.SEED_SECRET;
  const header = req.headers.get("x-seed-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized — set SEED_SECRET env" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("industry") ?? "all";
  const industries: IndustryPack[] =
    target === "all" ? ["medtech", "cpg"] : target === "cpg" || target === "medtech" ? [target] : [];

  if (industries.length === 0) {
    return NextResponse.json({ error: "industry must be medtech, cpg, or all" }, { status: 400 });
  }

  const results: Record<string, unknown> = {};

  for (const industry of industries) {
    const pack = await loadIndustryPack(industry);
    const orgRes = await fetch(`${url}/rest/v1/organizations`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: `Yugam Demo ${industry}`,
        org_type: industry === "cpg" ? "cpg" : "medtech",
      }),
    });
    const orgs = (await orgRes.json()) as { id: string }[];
    const orgId = orgs[0]?.id;
    if (!orgId) {
      results[industry] = { error: "org create failed", detail: orgs };
      continue;
    }

    const skus = pack.files.sku_master?.rows ?? [];
    const skuPayload = skus.map((s) => ({
      org_id: orgId,
      sku_id: s.sku_id,
      sku_name: s.sku_name,
      category: s.category,
      subcategory: s.subcategory,
      abc_class: s.abc_class,
      lead_time_days: Number(s.lead_time_days) || null,
      data_provenance: s.data_provenance ?? "synthetic",
    }));

    const skuRes = await fetch(`${url}/rest/v1/skus`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(skuPayload),
    });

    const nodes = pack.files.nodes?.rows ?? [];
    const nodePayload = nodes.map((n) => ({
      org_id: orgId,
      node_id: n.node_id,
      node_type: n.node_type,
      city: n.city,
      pincode: n.pincode,
    }));

    await fetch(`${url}/rest/v1/nodes`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(nodePayload),
    });

    const lots = pack.files.lots_inventory?.rows ?? [];
    const lotPayload = lots.map((l) => ({
      org_id: orgId,
      sku_id: l.sku_id,
      lot_id: l.lot_id,
      mfg_date: l.mfg_date || null,
      expiry_date: l.expiry_date || null,
      qty: Number(l.qty) || 0,
      node_id: l.node_id,
      data_provenance: l.data_provenance ?? "synthetic",
    }));

    const lotsRes = await fetch(`${url}/rest/v1/lots_inventory`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(lotPayload),
    });

    await fetch(`${url}/rest/v1/import_jobs`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        org_id: orgId,
        industry,
        status: "completed",
        summary: pack.stats,
      }),
    });

    results[industry] = {
      orgId,
      skusInserted: skuRes.ok ? skuPayload.length : await skuRes.text(),
      nodesInserted: nodePayload.length,
      lotsInserted: lotsRes.ok ? lotPayload.length : await lotsRes.text(),
      stats: pack.stats,
    };
  }

  return NextResponse.json({ ok: true, results });
}
