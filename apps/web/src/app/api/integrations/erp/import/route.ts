import { NextResponse } from "next/server";

import { parseCsv } from "@/lib/import/parseCsv";
import { getSupabaseAdmin, logAgentExecution } from "@/lib/supabase/server";

/**
 * ERP / TMS / WMS connector — CSV upload or SAP-style IDoc JSON export.
 * POST multipart: file + system_type (erp|tms|wms|csv|sap_export)
 */
export async function POST(req: Request) {
  const secret = process.env.INTEGRATION_SECRET;
  const header = req.headers.get("x-integration-secret");
  if (secret && header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json()) as {
      system_type?: string;
      format?: string;
      records?: Record<string, string>[];
      org_id?: string;
    };
    const records = body.records ?? [];
    const system = body.system_type ?? "sap_export";

    await logAgentExecution({
      org_id: body.org_id,
      agent_id: "integration-connector",
      tool_name: "erp_import",
      input: { system, format: body.format, count: records.length },
      output: { preview: records.slice(0, 5) },
      confidence: 1,
    });

    const sb = getSupabaseAdmin();
    if (sb && body.org_id) {
      await sb.from("integration_sync_jobs").insert({
        connection_id: null,
        job_type: `${system}_import`,
        payload: { count: records.length },
        result: { preview: records.slice(0, 3) },
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      system,
      recordsReceived: records.length,
      message: "SAP/ERP export ingested — map to SKUs/lots in P2.1",
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  const system = String(form.get("system_type") ?? "csv");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseCsv(text);

  await logAgentExecution({
    agent_id: "integration-connector",
    tool_name: "csv_import",
    input: { system, filename: file.name, rows: parsed.rows.length },
    output: { headers: parsed.headers, sample: parsed.rows.slice(0, 3) },
    confidence: 1,
  });

  return NextResponse.json({
    ok: true,
    system,
    filename: file.name,
    rows: parsed.rows.length,
    headers: parsed.headers,
    sample: parsed.rows.slice(0, 5),
    message: "CSV connector — data ready for module pipelines",
  });
}
