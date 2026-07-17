import { NextResponse } from "next/server";

import { runContinuousSync } from "@/lib/integrations/erpSync";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  logAgentExecution,
  logAuditEvent,
} from "@/lib/supabase/server";

/**
 * Continuous ERP sync loop.
 * GET  — pending job counts + connector config
 * POST — process pending write-backs and/or pull inbound feed
 *   { direction?: "outbound"|"inbound"|"both", limit?: number, org_id? }
 */
function authorized(req: Request): boolean {
  const secret =
    process.env.INTEGRATION_SECRET ||
    process.env.VPS_WEBHOOK_SECRET ||
    process.env.BOT_SHARED_SECRET;
  const header =
    req.headers.get("x-integration-secret") ||
    req.headers.get("x-vps-secret") ||
    req.headers.get("x-bot-secret");
  const open =
    process.env.BOT_OPEN_DEMO === "true" ||
    (!secret && process.env.NODE_ENV !== "production");
  if (secret && header !== secret && !open) return false;
  return true;
}

export async function GET() {
  const sb = getSupabaseAdmin();
  let pending = 0;
  let completed24h = 0;
  if (sb) {
    const { count: p } = await sb
      .from("integration_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    pending = p ?? 0;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: c } = await sb
      .from("integration_sync_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("completed_at", since);
    completed24h = c ?? 0;
  }

  return NextResponse.json({
    service: "yugam-erp-sync",
    supabase: isSupabaseConfigured(),
    erpWebhookConfigured: Boolean(process.env.ERP_WEBHOOK_URL),
    erpFeedConfigured: Boolean(process.env.ERP_FEED_URL),
    pendingJobs: pending,
    completedLast24h: completed24h,
    tip: "POST with direction=both to drain write-back queue + pull feed",
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    direction?: "outbound" | "inbound" | "both";
    limit?: number;
    org_id?: string;
  };

  const result = await runContinuousSync({
    direction: body.direction,
    limit: body.limit,
    orgId: body.org_id,
  });

  await logAgentExecution({
    org_id: body.org_id,
    agent_id: "erp-sync",
    tool_name: "erp_continuous_sync",
    input: { direction: result.direction, limit: body.limit },
    output: result,
    confidence: 0.85,
    status: "completed",
  });

  await logAuditEvent({
    org_id: body.org_id,
    actor_id: "erp-sync",
    actor_role: "system",
    action: "erp.sync",
    resource_type: "integration_sync_jobs",
    auto_executed: true,
    payload: result,
  });

  return NextResponse.json({ ok: true, ...result });
}
