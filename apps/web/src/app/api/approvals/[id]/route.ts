import { NextResponse } from "next/server";

import { parseRole } from "@/lib/auth/rbac";
import { toolToWritebackDoc } from "@/lib/integrations/erpSync";
import { getSupabaseAdmin, isSupabaseConfigured, logAgentExecution } from "@/lib/supabase/server";

/**
 * Approve or reject an agent execution.
 * PATCH /api/approvals/[id] { action: "approve" | "reject", note?: string }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    action?: "approve" | "reject";
    note?: string;
    actorId?: string;
    role?: string;
  };

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const sb = getSupabaseAdmin()!;
  const { data: existing, error: getErr } = await sb
    .from("agent_executions")
    .select("id, org_id, agent_id, tool_name, status, requires_approval, confidence, output")
    .eq("id", id)
    .maybeSingle();

  if (getErr || !existing) {
    return NextResponse.json({ error: getErr?.message ?? "Not found" }, { status: 404 });
  }

  const nextStatus = body.action === "approve" ? "approved" : "rejected";
  const { error } = await sb
    .from("agent_executions")
    .update({
      status: nextStatus,
      requires_approval: false,
      approved_at: body.action === "approve" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const role = parseRole(body.role ?? process.env.YUGAM_DEMO_ROLE);
  await logAgentExecution({
    org_id: existing.org_id ?? undefined,
    agent_id: existing.agent_id,
    tool_name: "approval_decision",
    input: { executionId: id, action: body.action, note: body.note ?? null },
    output: { summary: `${body.action}d ${existing.tool_name}`, priorStatus: existing.status },
    confidence: 1,
    status: "completed",
    requires_approval: false,
  });

  await sb.from("audit_events").insert({
    org_id: existing.org_id,
    actor_id: body.actorId ?? "planner",
    actor_role: role,
    action: `execution_${body.action}`,
    resource_type: "agent_execution",
    resource_id: id,
    confidence: existing.confidence,
    auto_executed: false,
    payload: {
      tool_name: existing.tool_name,
      agent_id: existing.agent_id,
      note: body.note ?? null,
    },
  });

  let writebackJobId: string | null = null;
  if (body.action === "approve") {
    const docType = toolToWritebackDoc(String(existing.tool_name ?? ""));
    if (docType) {
      const output = (existing.output ?? {}) as Record<string, unknown>;
      const { data: job } = await sb
        .from("integration_sync_jobs")
        .insert({
          connection_id: null,
          job_type: `erp_writeback_${docType}`,
          payload: {
            document_type: docType,
            execution_id: id,
            body: output,
            dry_run: false,
          },
          status: "pending",
        })
        .select("id")
        .single();
      writebackJobId = (job?.id as string) ?? null;
    }
  }

  return NextResponse.json({
    ok: true,
    id,
    status: nextStatus,
    writebackJobId,
    tip: writebackJobId
      ? "Queued ERP write-back — Temporal erp_sync_hourly or POST /api/integrations/erp/sync drains it"
      : undefined,
  });
}
