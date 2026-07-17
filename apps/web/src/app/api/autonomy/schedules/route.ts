import { NextResponse } from "next/server";

import { AUTONOMY_WORKFLOWS } from "@/lib/autonomy/workflows";
import { findDemoOrgId } from "@/lib/data/orgWorkspace";
import type { IndustryPack } from "@/lib/import/config";
import { getSupabaseAdmin, isSupabaseConfigured, logAuditEvent } from "@/lib/supabase/server";

/**
 * GET — list agent_schedules (+ catalog KPIs even without DB)
 * POST — upsert AUTONOMY_WORKFLOWS into agent_schedules for an org
 *   { industry?: "medtech"|"cpg", org_id?: string }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const industry = (url.searchParams.get("industry") as IndustryPack) || "medtech";
  const catalog = AUTONOMY_WORKFLOWS.map((w) => ({
    workflow_id: w.id,
    name: w.name,
    owner_agent_id: w.ownerAgentId,
    cron_hint: w.scheduleHint,
    kpis: w.kpis,
    enabled: true,
  }));

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ source: "catalog", schedules: catalog });
  }

  const sb = getSupabaseAdmin()!;
  const orgId = await findDemoOrgId(industry);
  let query = sb.from("agent_schedules").select("*").order("workflow_id");
  if (orgId) query = query.eq("org_id", orgId);
  const { data, error } = await query;

  if (error || !data?.length) {
    return NextResponse.json({
      source: data?.length ? "db" : "catalog",
      orgId,
      schedules: catalog,
      dbError: error?.message,
    });
  }

  return NextResponse.json({
    source: "db",
    orgId,
    schedules: data.map((row) => {
      const def = AUTONOMY_WORKFLOWS.find((w) => w.id === row.workflow_id);
      return {
        ...row,
        name: def?.name,
        kpis: row.kpi_json ?? def?.kpis ?? [],
      };
    }),
  });
}

export async function POST(req: Request) {
  const secret = process.env.VPS_WEBHOOK_SECRET || process.env.BOT_SHARED_SECRET;
  const header = req.headers.get("x-vps-secret") || req.headers.get("x-bot-secret");
  const open =
    process.env.BOT_OPEN_DEMO === "true" ||
    (!secret && process.env.NODE_ENV !== "production");
  if (secret && header !== secret && !open) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Supabase not configured — run migration 0004_p4_enterprise.sql",
        catalog: AUTONOMY_WORKFLOWS.map((w) => w.id),
      },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    industry?: IndustryPack;
    org_id?: string;
  };

  const orgId = body.org_id ?? (await findDemoOrgId(body.industry ?? "medtech"));
  if (!orgId) {
    return NextResponse.json({ error: "org_id required (or seed demo org)" }, { status: 400 });
  }

  const sb = getSupabaseAdmin()!;
  const rows = AUTONOMY_WORKFLOWS.map((w) => ({
    org_id: orgId,
    workflow_id: w.id,
    owner_agent_id: w.ownerAgentId,
    cron_hint: w.scheduleHint,
    kpi_json: w.kpis,
    enabled: true,
  }));

  const { data, error } = await sb
    .from("agent_schedules")
    .upsert(rows, { onConflict: "org_id,workflow_id" })
    .select("id, workflow_id, owner_agent_id, enabled");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    org_id: orgId,
    actor_id: "autonomy-schedules",
    actor_role: "system",
    action: "schedules.sync",
    resource_type: "agent_schedules",
    auto_executed: true,
    payload: { count: data?.length ?? 0 },
  });

  return NextResponse.json({
    ok: true,
    orgId,
    upserted: data?.length ?? 0,
    schedules: data,
  });
}
