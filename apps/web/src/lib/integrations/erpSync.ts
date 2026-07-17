/**
 * ERP continuous sync — process queued write-back jobs and optional inbound feeds.
 * Live SAP RFC/IDoc partner still requires ERP_WEBHOOK_URL (or connector worker).
 */

import { flattenIdocPayload, mapSapIdocRecords } from "@/lib/integrations/sapIdoc";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type WritebackDocType =
  | "indent"
  | "atp"
  | "production_plan"
  | "sto"
  | "fefo_reallocation";

export function idocTypeFor(docType: WritebackDocType): string {
  switch (docType) {
    case "indent":
      return "ORDERS05";
    case "sto":
      return "WMMBID02";
    case "production_plan":
      return "LOIPRO01";
    case "atp":
    case "fefo_reallocation":
      return "SYSTAT01";
    default: {
      const _exhaustive: never = docType;
      return _exhaustive;
    }
  }
}

/** Build a SAP-friendly IDoc JSON envelope (connector / middleware consumes this). */
export function buildIdocEnvelope(opts: {
  documentType: WritebackDocType;
  payload: Record<string, unknown>;
  executionId?: string | null;
}): {
  idoc_type: string;
  document_type: WritebackDocType;
  execution_id: string | null;
  created_at: string;
  segments: Record<string, unknown>[];
} {
  const lines = Array.isArray(opts.payload.lines)
    ? (opts.payload.lines as Record<string, unknown>[])
    : [opts.payload];

  return {
    idoc_type: idocTypeFor(opts.documentType),
    document_type: opts.documentType,
    execution_id: opts.executionId ?? null,
    created_at: new Date().toISOString(),
    segments: lines.map((line, i) => ({
      SEGNAM: "E1EDP01",
      POSNR: String(i + 1).padStart(6, "0"),
      MATNR: String(line.sku_id ?? line.MATNR ?? ""),
      WERKS: String(line.node_id ?? line.WERKS ?? ""),
      CHARG: String(line.lot_id ?? line.CHARG ?? ""),
      MENGE: String(line.qty ?? line.MENGE ?? 0),
      MEINS: String(line.uom ?? line.MEINS ?? "EA"),
    })),
  };
}

export function toolToWritebackDoc(toolName: string): WritebackDocType | null {
  const t = toolName.toLowerCase();
  if (t.includes("indent") || t.includes("auto_indent")) return "indent";
  if (t.includes("atp")) return "atp";
  if (t.includes("production")) return "production_plan";
  if (t.includes("fefo") || t.includes("mortgage")) return "fefo_reallocation";
  if (t.includes("sto") || t.includes("dispatch")) return "sto";
  if (t.startsWith("workflow:")) return "indent";
  return null;
}

export async function pushToErpWebhook(
  envelope: unknown,
): Promise<{ delivered: boolean; status?: number; error?: string }> {
  const url = process.env.ERP_WEBHOOK_URL?.trim();
  if (!url) {
    return { delivered: false, error: "ERP_WEBHOOK_URL not set — job staged locally only" };
  }
  try {
    const secret = process.env.INTEGRATION_SECRET ?? process.env.VPS_WEBHOOK_SECRET ?? "";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-integration-secret": secret } : {}),
      },
      body: JSON.stringify(envelope),
    });
    if (!res.ok) {
      return { delivered: false, status: res.status, error: await res.text() };
    }
    return { delivered: true, status: res.status };
  } catch (e) {
    return {
      delivered: false,
      error: e instanceof Error ? e.message : "ERP webhook failed",
    };
  }
}

export async function runContinuousSync(opts: {
  direction?: "outbound" | "inbound" | "both";
  limit?: number;
  orgId?: string;
}) {
  const direction = opts.direction ?? "both";
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const outbound =
    direction === "outbound" || direction === "both"
      ? await processOutbound(limit)
      : { processed: 0, delivered: 0, results: [] as unknown[] };
  const inbound =
    direction === "inbound" || direction === "both"
      ? await processInbound(opts.orgId)
      : { pulled: 0, mappedLots: 0, error: null as string | null };

  return { direction, outbound, inbound };
}

async function processOutbound(limit: number) {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return { processed: 0, delivered: 0, results: [] as unknown[], error: "Supabase not configured" };
  }

  const { data: jobs, error } = await sb
    .from("integration_sync_jobs")
    .select("id, job_type, payload, status")
    .eq("status", "pending")
    .like("job_type", "erp_writeback_%")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return { processed: 0, delivered: 0, results: [] as unknown[], error: error.message };
  }

  const results: unknown[] = [];
  let delivered = 0;

  for (const job of jobs ?? []) {
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    const body = (payload.body as Record<string, unknown>) ?? payload;
    const docType = String(payload.document_type ?? "indent") as WritebackDocType;
    const envelope = buildIdocEnvelope({
      documentType: docType,
      payload: body,
      executionId: (payload.execution_id as string) ?? null,
    });
    const push = await pushToErpWebhook(envelope);
    if (push.delivered) delivered += 1;

    const nextStatus = push.delivered ? "completed" : "staged";
    await sb
      .from("integration_sync_jobs")
      .update({
        status: nextStatus,
        result: { envelope, push },
        completed_at: push.delivered ? new Date().toISOString() : null,
      })
      .eq("id", job.id);

    results.push({
      jobId: job.id,
      status: nextStatus,
      idoc_type: envelope.idoc_type,
      delivered: push.delivered,
      error: push.error,
    });
  }

  return { processed: results.length, delivered, results };
}

async function processInbound(orgId?: string) {
  const feed = process.env.ERP_FEED_URL?.trim();
  if (!feed) {
    return { pulled: 0, mappedLots: 0, error: "ERP_FEED_URL not set" as string | null };
  }

  try {
    const secret = process.env.INTEGRATION_SECRET ?? "";
    const res = await fetch(feed, {
      headers: secret ? { "x-integration-secret": secret } : {},
    });
    if (!res.ok) {
      return { pulled: 0, mappedLots: 0, error: `Feed HTTP ${res.status}` };
    }
    const json: unknown = await res.json();
    const rows = flattenIdocPayload(json);
    const mapped = mapSapIdocRecords(rows);
    const sb = getSupabaseAdmin();
    if (sb) {
      await sb.from("integration_sync_jobs").insert({
        connection_id: null,
        job_type: "erp_feed_pull",
        payload: { org_id: orgId, count: rows.length },
        result: mapped.summary,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      if (orgId && mapped.lots.length) {
        const lotRows = mapped.lots.slice(0, 500).map((lot) => ({
          org_id: orgId,
          sku_id: lot.sku_id,
          node_id: lot.node_id,
          lot_id: lot.lot_id,
          qty: lot.qty_on_hand,
          expiry_date: lot.expiry_date ?? null,
        }));
        await sb.from("lots_inventory").insert(lotRows);
      }
    }

    return {
      pulled: rows.length,
      mappedLots: mapped.lots.length,
      error: null as string | null,
      summary: mapped.summary,
    };
  } catch (e) {
    return {
      pulled: 0,
      mappedLots: 0,
      error: e instanceof Error ? e.message : "Inbound feed failed",
    };
  }
}
