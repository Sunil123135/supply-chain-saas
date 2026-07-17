import { NextResponse } from "next/server";

import { logAuditEvent, logAgentExecution, getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * ERP write-back stub — pushes approved plans / indents / ATP allocations.
 * Does not call live SAP; stages a writeback job + audit event for connector workers.
 *
 * POST {
 *   org_id?, document_type: "indent" | "atp" | "production_plan" | "sto",
 *   execution_id?, payload: object, dry_run?: boolean
 * }
 */
export async function POST(req: Request) {
  const secret = process.env.INTEGRATION_SECRET;
  const header = req.headers.get("x-integration-secret");
  if (secret && header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    org_id?: string;
    document_type?: string;
    execution_id?: string;
    payload?: Record<string, unknown>;
    dry_run?: boolean;
  };

  const docType = body.document_type ?? "indent";
  const allowed = new Set(["indent", "atp", "production_plan", "sto", "fefo_reallocation"]);
  if (!allowed.has(docType)) {
    return NextResponse.json(
      { error: "document_type invalid", allowed: Array.from(allowed) },
      { status: 400 },
    );
  }

  const payload = body.payload ?? {};
  const dryRun = body.dry_run !== false; // default safe: dry-run until live connector

  const staged = {
    document_type: docType,
    execution_id: body.execution_id ?? null,
    target: "SAP",
    idoc_type:
      docType === "indent"
        ? "ORDERS05"
        : docType === "sto"
          ? "WMMBID02"
          : docType === "production_plan"
            ? "LOIPRO01"
            : "SYSTAT01",
    lines: Array.isArray(payload.lines) ? payload.lines.length : 1,
    dry_run: dryRun,
    status: dryRun ? "staged_dry_run" : "queued_for_connector",
  };

  const sb = getSupabaseAdmin();
  let jobId: string | null = null;
  if (sb) {
    const { data } = await sb
      .from("integration_sync_jobs")
      .insert({
        connection_id: null,
        job_type: `erp_writeback_${docType}`,
        payload: { ...staged, body: payload },
        result: { message: dryRun ? "Dry-run only — set dry_run:false to queue" : "Queued" },
        status: dryRun ? "completed" : "pending",
        completed_at: dryRun ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    jobId = (data?.id as string) ?? null;
  }

  await logAgentExecution({
    org_id: body.org_id,
    agent_id: "erp-writeback",
    tool_name: "erp_writeback",
    input: { document_type: docType, dry_run: dryRun, execution_id: body.execution_id },
    output: staged,
    confidence: dryRun ? 0.9 : 0.7,
    status: dryRun ? "completed" : "pending",
    requires_approval: !dryRun,
  });

  await logAuditEvent({
    org_id: body.org_id,
    actor_id: "erp-writeback",
    actor_role: "system",
    action: dryRun ? "erp.writeback.dry_run" : "erp.writeback.queued",
    resource_type: docType,
    resource_id: jobId ?? body.execution_id,
    confidence: dryRun ? 0.9 : 0.7,
    auto_executed: dryRun,
    payload: staged,
  });

  return NextResponse.json({
    ok: true,
    jobId,
    ...staged,
    tip: dryRun
      ? "Pass dry_run:false + INTEGRATION_SECRET to queue a live connector job"
      : "Connector worker should poll integration_sync_jobs status=pending",
  });
}
