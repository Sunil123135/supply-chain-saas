import { NextResponse } from "next/server";

import { getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";
import { getOptimizerUrl } from "@/lib/forecast/optimizer";

/**
 * Stack wiring status — no secrets returned.
 * GET /api/health/wiring
 */
export async function GET() {
  const apiUrl = getApiUrl();
  const optimizerUrl = getOptimizerUrl();
  const apiMisconfigured = isMisconfiguredApiUrl(apiUrl);
  const optimizerIsLocal =
    optimizerUrl.includes("localhost") || optimizerUrl.includes("127.0.0.1");
  const apiIsLocal = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");

  let backendHealth: { ok: boolean; status?: number; body?: string } = { ok: false };
  let optimizerHealth: { ok: boolean; status?: number; body?: string } = { ok: false };

  if (!apiMisconfigured && !apiIsLocal) {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/health`, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 0 },
      });
      const text = await res.text();
      backendHealth = { ok: res.ok, status: res.status, body: text.slice(0, 200) };
    } catch (e) {
      backendHealth = {
        ok: false,
        body: e instanceof Error ? e.message : "fetch failed",
      };
    }
  }

  if (!optimizerIsLocal) {
    try {
      const res = await fetch(`${optimizerUrl.replace(/\/$/, "")}/health`, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 0 },
      });
      const text = await res.text();
      optimizerHealth = { ok: res.ok, status: res.status, body: text.slice(0, 200) };
    } catch (e) {
      optimizerHealth = {
        ok: false,
        body: e instanceof Error ? e.message : "fetch failed",
      };
    }
  }

  const checks = {
    netlify: true,
    supabase_public: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    seed_secret: Boolean(process.env.SEED_SECRET),
    vps_webhook_secret: Boolean(process.env.VPS_WEBHOOK_SECRET),
    integration_secret: Boolean(process.env.INTEGRATION_SECRET),
    api_url_set: Boolean(process.env.NEXT_PUBLIC_API_URL),
    api_url_valid: !apiMisconfigured,
    api_url_not_local: !apiIsLocal,
    backend_reachable: backendHealth.ok,
    optimizer_url_set: Boolean(
      process.env.OPTIMIZER_URL ?? process.env.NEXT_PUBLIC_OPTIMIZER_URL,
    ),
    optimizer_not_local: !optimizerIsLocal,
    optimizer_reachable: optimizerHealth.ok,
  };

  const missing: string[] = [];
  if (!checks.api_url_set || !checks.api_url_valid)
    missing.push("Set NEXT_PUBLIC_API_URL to https://YOUR_BACKEND.up.railway.app");
  if (!checks.backend_reachable && checks.api_url_valid && !apiIsLocal)
    missing.push("Backend /health not reachable — check Railway domain + deploy");
  if (!checks.optimizer_url_set || !checks.optimizer_not_local)
    missing.push("Set OPTIMIZER_URL to https://YOUR_OPTIMIZER.up.railway.app");
  if (!checks.optimizer_reachable && checks.optimizer_not_local)
    missing.push("Optimizer /health not reachable — check Railway domain + deploy");
  if (!checks.supabase_public) missing.push("Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY");
  if (!checks.supabase_service_role) missing.push("Set SUPABASE_SERVICE_ROLE_KEY (for seed)");
  if (!checks.seed_secret) missing.push("Set SEED_SECRET");

  const ready =
    checks.api_url_valid &&
    checks.backend_reachable &&
    checks.optimizer_reachable &&
    checks.supabase_public;

  return NextResponse.json({
    status: ready ? "ready" : "incomplete",
    phase: "P3",
    app: "Yugam",
    checks,
    urls: {
      api: apiMisconfigured ? "(misconfigured — railway.com dashboard URL)" : apiUrl,
      optimizer: optimizerIsLocal ? "(default localhost — set OPTIMIZER_URL)" : optimizerUrl,
    },
    probes: { backend: backendHealth, optimizer: optimizerHealth },
    missing,
    next_steps: ready
      ? [
          "Open /app/modules/demand-forecasting — expect engine: yugam-optimizer",
          "Run Supabase COMBINED_p0_p1_p2.sql if not done",
          "POST /api/seed/supabase?industry=all with x-seed-secret",
        ]
      : missing,
  });
}
