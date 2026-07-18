/**
 * Optional outbound notify to Hermes when a workflow completes.
 */

import { hermesBaseUrl, hermesConfigured } from "@/lib/hermes/manifest";

export async function notifyHermes(event: {
  type: "workflow.completed" | "workflow.needs_approval" | "ping";
  workflowId?: string;
  hermesRole?: string;
  industry?: string;
  summary?: string;
  executionId?: string | null;
  needsApproval?: boolean;
}): Promise<{ ok: boolean; skipped?: boolean; status?: number; error?: string }> {
  if (!hermesConfigured()) {
    return { ok: true, skipped: true };
  }

  const base = hermesBaseUrl()!;
  const secret =
    process.env.VPS_WEBHOOK_SECRET ||
    process.env.HERMES_SHARED_SECRET ||
    process.env.BOT_SHARED_SECRET ||
    "";

  const paths = ["/hooks/yugam", "/api/hooks/yugam", "/webhook/yugam"];
  let lastError = "no path succeeded";

  for (const path of paths) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "x-vps-secret": secret, Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          source: "yugam-saas",
          ...event,
          at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok || res.status === 202) {
        return { ok: true, status: res.status };
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : "fetch failed";
    }
  }

  return { ok: false, error: lastError };
}

export async function pingHermes(): Promise<{
  configured: boolean;
  ok: boolean;
  baseUrl: string | null;
  error?: string;
}> {
  const base = hermesBaseUrl();
  if (!base) {
    return { configured: false, ok: false, baseUrl: null, error: "HERMES_URL not set" };
  }
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(6000),
    });
    return { configured: true, ok: res.ok || res.status === 404, baseUrl: base };
  } catch (e) {
    return {
      configured: true,
      ok: false,
      baseUrl: base,
      error: e instanceof Error ? e.message : "unreachable",
    };
  }
}
