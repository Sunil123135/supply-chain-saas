import { NextResponse } from "next/server";

import { getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";
import {
  isDifyConfigured,
  isDifyLocalhostUrl,
  normalizeDifyBaseUrl,
} from "@/lib/dify/client";
import { getOptimizerUrl } from "@/lib/forecast/optimizer";
import { hermesConfigured, hermesBaseUrl } from "@/lib/hermes/manifest";
import { isOpenRouterConfigured } from "@/lib/rag/localPlaybook";

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

  const difyRaw = process.env.DIFY_API_URL ?? process.env.DIFY_BASE_URL ?? "";
  const difyConfigured = isDifyConfigured();
  const difyIsLocal = difyConfigured && isDifyLocalhostUrl(difyRaw);
  const difyBase = difyConfigured ? normalizeDifyBaseUrl(difyRaw) : null;

  let difyProbe: { ok: boolean; status?: number; body?: string; skipped?: string } = {
    ok: false,
  };
  if (!difyConfigured) {
    difyProbe = { ok: false, skipped: "DIFY_API_URL / DIFY_API_KEY not set" };
  } else if (difyIsLocal && process.env.NETLIFY === "true") {
    difyProbe = {
      ok: false,
      skipped: "Dify URL is localhost — Netlify cannot reach VPS tunnel; use Dokploy HTTPS",
    };
  } else if (difyBase) {
    try {
      const res = await fetch(`${difyBase}/v1/parameters`, {
        headers: {
          Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 0 },
      });
      const text = res.ok ? "reachable" : (await res.text()).slice(0, 120);
      // 200 = published; 400 often still means API/auth reachable (app config messages).
      difyProbe = {
        ok: res.ok || res.status === 401 || res.status === 400,
        status: res.status,
        body: text,
      };
    } catch (e) {
      difyProbe = {
        ok: false,
        body: e instanceof Error ? e.message : "fetch failed",
      };
    }
  }

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
    vps_public_url_set: Boolean(process.env.VPS_PUBLIC_URL),
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
    dify_configured: difyConfigured,
    dify_not_localhost: difyConfigured && !difyIsLocal,
    dify_reachable: difyProbe.ok,
    openrouter_rag: isOpenRouterConfigured(),
    voice_excel_channels: true,
    hermes_url_set: hermesConfigured(),
    hermes_ingress: true,
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
  if (!checks.dify_configured && !checks.openrouter_rag)
    missing.push("Set OPENROUTER_API_KEY (Railway RAG) or DIFY_API_URL + DIFY_API_KEY");
  else if (checks.dify_configured && !checks.dify_not_localhost)
    missing.push(
      "Dify is localhost — expose via Dokploy HTTPS or rely on OpenRouter RAG (docs/DIFY_RAILWAY.md)",
    );

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
      vps: process.env.VPS_PUBLIC_URL || null,
      hermes: hermesBaseUrl(),
      hermes_api: "/api/integrations/hermes",
      dify: difyBase
        ? difyIsLocal
          ? "(localhost — local tunnel only)"
          : difyBase
        : null,
    },
    probes: { backend: backendHealth, optimizer: optimizerHealth, dify: difyProbe },
    missing,
    next_steps: ready
      ? [
          "Open /app/modules/demand-forecasting — expect engine: yugam-optimizer",
          "Run Supabase COMBINED_p0_p1_p2.sql if not done",
          "Sarvam LLM: Dify if set, else OpenRouter RAG on Railway",
          "Voice: POST /api/integrations/voice { transcript }",
          "Excel: POST /api/integrations/excel multipart file",
          "Hermes: GET/POST /api/integrations/hermes — docs/hermes/README.md",
        ]
      : missing,
  });
}
