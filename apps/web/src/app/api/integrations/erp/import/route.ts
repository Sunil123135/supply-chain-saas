import { NextResponse } from "next/server";

import { flattenIdocPayload, mapSapIdocRecords } from "@/lib/integrations/sapIdoc";
import { parseCsv } from "@/lib/import/parseCsv";
import { getSupabaseAdmin, logAgentExecution, logAuditEvent } from "@/lib/supabase/server";

/**
 * ERP / TMS / WMS connector — CSV upload or SAP-style IDoc JSON export.
 * POST multipart: file + system_type (erp|tms|wms|csv|sap_export|sap_idoc)
 * POST JSON: { system_type, records | idoc, org_id? }
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
      records?: Record<string, unknown>[];
      idoc?: unknown;
      org_id?: string;
      persist?: boolean;
    };
    const system = body.system_type ?? "sap_export";
    const rawRecords =
      body.records ??
      (body.idoc ? flattenIdocPayload(body.idoc) : []);

    const mapped =
      system === "sap_idoc" || system === "sap_export" || body.format === "idoc"
        ? mapSapIdocRecords(rawRecords)
        : null;

    await logAgentExecution({
      org_id: body.org_id,
      agent_id: "integration-connector",
      tool_name: "erp_import",
      input: { system, format: body.format, count: rawRecords.length },
      output: mapped
        ? { summary: mapped.summary, sampleLots: mapped.lots.slice(0, 5) }
        : { preview: rawRecords.slice(0, 5) },
      confidence: mapped ? 0.95 : 0.8,
    });

    await logAuditEvent({
      org_id: body.org_id,
      actor_id: "integration-connector",
      actor_role: "system",
      action: "erp.import",
      resource_type: system,
      confidence: mapped ? 0.95 : 0.8,
      auto_executed: true,
      payload: mapped?.summary ?? { count: rawRecords.length },
    });

    const sb = getSupabaseAdmin();
    if (sb && body.org_id) {
      await sb.from("integration_sync_jobs").insert({
        connection_id: null,
        job_type: `${system}_import`,
        payload: { count: rawRecords.length, mapped: mapped?.summary },
        result: { preview: mapped?.lots.slice(0, 3) ?? rawRecords.slice(0, 3) },
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      if (body.persist && mapped) {
        for (const lot of mapped.lots.slice(0, 500)) {
          await sb.from("lots_inventory").upsert(
            {
              org_id: body.org_id,
              sku_id: lot.sku_id,
              node_id: lot.node_id,
              lot_id: lot.lot_id,
              qty_on_hand: lot.qty_on_hand,
              expiry_date: lot.expiry_date ?? null,
            },
            { onConflict: "org_id,lot_id" },
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      system,
      recordsReceived: rawRecords.length,
      mapped,
      message: mapped
        ? `Mapped ${mapped.summary.lots} lots / ${mapped.summary.skus} SKUs / ${mapped.summary.nodes} plants (MATNR→sku, WERKS→node, CHARG→lot)`
        : "ERP export ingested — pass system_type=sap_idoc for field mapping",
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
  const mapped =
    system === "sap_idoc" || system === "sap_export"
      ? mapSapIdocRecords(parsed.rows as Record<string, unknown>[])
      : null;

  await logAgentExecution({
    agent_id: "integration-connector",
    tool_name: "csv_import",
    input: { system, filename: file.name, rows: parsed.rows.length },
    output: mapped
      ? { summary: mapped.summary, headers: parsed.headers }
      : { headers: parsed.headers, sample: parsed.rows.slice(0, 3) },
    confidence: mapped ? 0.95 : 1,
  });

  return NextResponse.json({
    ok: true,
    system,
    filename: file.name,
    rows: parsed.rows.length,
    headers: parsed.headers,
    sample: parsed.rows.slice(0, 5),
    mapped,
    message: mapped
      ? "CSV mapped via SAP IDoc aliases"
      : "CSV connector — data ready for module pipelines",
  });
}
