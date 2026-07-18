import { NextResponse } from "next/server";

import {
  AUTONOMY_WORKFLOWS,
  getWorkflow,
  runAutonomyWorkflow,
  type AutonomyWorkflowId,
} from "@/lib/autonomy/workflows";
import type { IndustryPack } from "@/lib/import/config";
import { hermesConfigured, hermesBaseUrl, saasPublicBase } from "@/lib/hermes/manifest";
import {
  fetchTemporalHealth,
  isTemporalConfigured,
  startTemporalWorkflow,
} from "@/lib/temporal/client";

export async function GET() {
  const temporal = isTemporalConfigured()
    ? await fetchTemporalHealth()
    : { configured: false, ok: false };
  return NextResponse.json({
    service: "yugam-autonomy",
    orchestrators: ["hermes", "temporal", "n8n"],
    hermes: {
      ingress: "/api/integrations/hermes",
      configured: hermesConfigured(),
      baseUrl: hermesBaseUrl(),
      saasBase: saasPublicBase(),
      docs: "docs/hermes/README.md",
    },
    temporal: {
      configured: isTemporalConfigured(),
      ...temporal,
    },
    workflows: AUTONOMY_WORKFLOWS.map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      scheduleHint: w.scheduleHint,
      hermesRole: w.hermesRole,
      steps: w.steps.map((s) => s.tool),
    })),
  });
}

/**
 * Run a named Hermes/Temporal workflow on Netlify (short jobs).
 * Auth: x-vps-secret or x-bot-secret
 * POST { workflowId, industry?, source? }
 */
export async function POST(req: Request) {
  const secret = process.env.VPS_WEBHOOK_SECRET || process.env.BOT_SHARED_SECRET;
  const header = req.headers.get("x-vps-secret") || req.headers.get("x-bot-secret");
  const open =
    process.env.BOT_OPEN_DEMO === "true" ||
    (!secret && process.env.NODE_ENV !== "production");
  if (secret && header !== secret && !open) {
    return NextResponse.json(
      { error: "Unauthorized — set x-vps-secret or BOT_OPEN_DEMO=true for UI demos" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    workflowId?: string;
    industry?: IndustryPack;
    source?: string;
    /** "temporal" starts on VPS Temporal gateway; default runs inline on Netlify */
    via?: "inline" | "temporal";
  };

  if (!body.workflowId || !getWorkflow(body.workflowId)) {
    return NextResponse.json(
      { error: "workflowId required", workflows: AUTONOMY_WORKFLOWS.map((w) => w.id) },
      { status: 400 },
    );
  }

  if (body.via === "temporal") {
    if (!isTemporalConfigured()) {
      return NextResponse.json(
        {
          error: "TEMPORAL_GATEWAY_URL not set — run docs/temporal/install.ps1 (or install.sh)",
        },
        { status: 503 },
      );
    }
    const started = await startTemporalWorkflow({
      workflowId: body.workflowId,
      industry: body.industry,
    });
    if (!started.ok) {
      return NextResponse.json(started, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      mode: "temporal",
      workflowId: body.workflowId,
      industry: body.industry ?? "medtech",
      temporalWorkflowId: started.temporalWorkflowId,
      runId: started.runId,
      summary: `Queued on Temporal: ${started.temporalWorkflowId}`,
    });
  }

  const result = await runAutonomyWorkflow({
    workflowId: body.workflowId as AutonomyWorkflowId,
    industry: body.industry,
    source: body.source ?? "hermes",
  });

  return NextResponse.json({
    ok: true,
    mode: "inline",
    ...result,
    next: result.needsApproval ? ["/approvals"] : [],
  });
}
