/**
 * Hermes agent card — roles map 1:1 to autonomy workflows.
 * Hermes (or any orchestrator) GETs this and POSTs runs back.
 */

import { AUTONOMY_WORKFLOWS, type AutonomyWorkflowId } from "@/lib/autonomy/workflows";
import { ALL_TOOLS } from "@/lib/agents/tools";

export function saasPublicBase(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    "https://nexova-web-production.up.railway.app"
  ).replace(/\/$/, "");
}

export function hermesConfigured(): boolean {
  return Boolean(process.env.HERMES_URL || process.env.VPS_HERMES_URL);
}

export function hermesBaseUrl(): string | null {
  const raw = process.env.HERMES_URL || process.env.VPS_HERMES_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export function buildHermesManifest() {
  const base = saasPublicBase();
  const roles = AUTONOMY_WORKFLOWS.map((w) => ({
    role: w.hermesRole,
    workflowId: w.id as AutonomyWorkflowId,
    name: w.name,
    description: w.description,
    scheduleHint: w.scheduleHint,
    tools: w.steps.map((s) => s.tool),
    kpis: w.kpis,
    ownerAgentId: w.ownerAgentId,
  }));

  const byRole = new Map<string, typeof roles>();
  for (const r of roles) {
    const list = byRole.get(r.role) ?? [];
    list.push(r);
    byRole.set(r.role, list);
  }

  return {
    agent: {
      id: "yugam-hermes",
      name: "Yugam Hermes Orchestrator",
      version: "1.1.0",
      description:
        "Hermes runs named Yugam autonomy workflows and tools against the SaaS control plane.",
    },
    saas: {
      baseUrl: base,
      authHeader: "x-vps-secret",
      authEnv: "VPS_WEBHOOK_SECRET",
      endpoints: {
        manifest: `${base}/api/integrations/hermes`,
        runWorkflow: `${base}/api/integrations/hermes`,
        autonomy: `${base}/api/autonomy/run`,
        vpsWebhook: `${base}/api/integrations/vps/webhook`,
        sarvamChat: `${base}/api/sarvam/chat`,
        schedules: `${base}/api/autonomy/schedules`,
        health: `${base}/api/health/wiring`,
      },
    },
    hermes: {
      configured: hermesConfigured(),
      baseUrl: hermesBaseUrl(),
      callbackHint: "POST /hooks/yugam (optional) when HERMES_URL is set",
    },
    roles: Array.from(byRole.entries()).map(([role, workflows]) => ({
      role,
      workflows,
    })),
    workflows: roles,
    tools: ALL_TOOLS,
    industries: ["medtech", "cpg"],
  };
}

export function resolveWorkflowForHermesRole(role: string): AutonomyWorkflowId | null {
  const hit = AUTONOMY_WORKFLOWS.find((w) => w.hermesRole === role);
  return hit ? hit.id : null;
}
