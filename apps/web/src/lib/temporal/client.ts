/** Client for the VPS Temporal HTTP gateway (docs/temporal/gateway.py). */

export function getTemporalGatewayUrl(): string | null {
  const raw = process.env.TEMPORAL_GATEWAY_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function isTemporalConfigured(): boolean {
  return Boolean(getTemporalGatewayUrl());
}

function authHeaders(): HeadersInit {
  const secret = process.env.VPS_WEBHOOK_SECRET || process.env.BOT_SHARED_SECRET;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers["x-vps-secret"] = secret;
  return headers;
}

export type TemporalHealth = {
  ok: boolean;
  connected?: boolean;
  temporalHost?: string;
  taskQueue?: string;
  workflows?: string[];
  error?: string;
  gatewayUrl?: string;
};

export async function fetchTemporalHealth(): Promise<TemporalHealth> {
  const base = getTemporalGatewayUrl();
  if (!base) {
    return { ok: false, error: "TEMPORAL_GATEWAY_URL not set" };
  }
  try {
    const res = await fetch(`${base}/health`, {
      headers: authHeaders(),
      next: { revalidate: 0 },
    });
    const data = (await res.json()) as TemporalHealth;
    return { ...data, gatewayUrl: base, ok: res.ok && data.ok !== false };
  } catch (e) {
    return {
      ok: false,
      gatewayUrl: base,
      error: e instanceof Error ? e.message : "Gateway unreachable",
    };
  }
}

export async function startTemporalWorkflow(opts: {
  workflowId: string;
  industry?: string;
}): Promise<{
  ok: boolean;
  temporalWorkflowId?: string;
  runId?: string;
  error?: string;
  mode?: string;
}> {
  const base = getTemporalGatewayUrl();
  if (!base) {
    return { ok: false, error: "TEMPORAL_GATEWAY_URL not set" };
  }
  try {
    const res = await fetch(`${base}/workflows/start`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        workflowId: opts.workflowId,
        industry: opts.industry ?? "medtech",
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      temporalWorkflowId?: string;
      runId?: string;
      error?: string;
      mode?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Gateway HTTP ${res.status}` };
    }
    return {
      ok: true,
      temporalWorkflowId: data.temporalWorkflowId,
      runId: data.runId,
      mode: data.mode ?? "temporal",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gateway unreachable",
    };
  }
}

export async function syncTemporalSchedules(industry = "medtech"): Promise<{
  ok: boolean;
  results?: unknown[];
  error?: string;
}> {
  const base = getTemporalGatewayUrl();
  if (!base) {
    return { ok: false, error: "TEMPORAL_GATEWAY_URL not set" };
  }
  try {
    const res = await fetch(`${base}/schedules/sync`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ industry }),
    });
    const data = (await res.json()) as { ok?: boolean; results?: unknown[]; error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true, results: data.results };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gateway unreachable",
    };
  }
}
