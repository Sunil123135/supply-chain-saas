import { NextResponse } from "next/server";

import { isToolName, runTool, type ToolName } from "@/lib/agents/tools";
import {
  getWorkflow,
  runAutonomyWorkflow,
  type AutonomyWorkflowId,
} from "@/lib/autonomy/workflows";
import type { IndustryPack } from "@/lib/import/config";
import { logAgentExecution } from "@/lib/supabase/server";

/**
 * VPS agent stack ingress — Temporal / n8n / Hermes / Flowise / Dokploy / Dify.
 * Auth: VPS_WEBHOOK_SECRET → header x-vps-secret
 * Pass `tool` OR `workflow`/`workflowId`.
 */
export async function POST(req: Request) {
  const secret = process.env.VPS_WEBHOOK_SECRET;
  const header = req.headers.get("x-vps-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized — set VPS_WEBHOOK_SECRET" }, { status: 401 });
  }

  const body = (await req.json()) as {
    source?: string;
    workflow?: string;
    workflowId?: string;
    agent_id?: string;
    tool?: string;
    industry?: IndustryPack;
    params?: Record<string, unknown>;
    payload?: unknown;
  };

  const workflowId = body.workflowId || body.workflow;
  if (workflowId && getWorkflow(workflowId)) {
    const result = await runAutonomyWorkflow({
      workflowId: workflowId as AutonomyWorkflowId,
      industry: body.industry ?? "medtech",
      source: body.source ?? "temporal",
    });
    return NextResponse.json({
      ok: true,
      executed: true,
      kind: "workflow",
      ...result,
      message: `Ran workflow ${workflowId} from ${body.source ?? "vps"}`,
    });
  }

  if (body.tool && isToolName(body.tool)) {
    const tool = body.tool as ToolName;
    const result = await runTool(tool, {
      industry: body.industry ?? "medtech",
      params: body.params,
      prompt: body.workflow,
    });

    const executionId = await logAgentExecution({
      agent_id: body.agent_id ?? result.agentId,
      tool_name: tool,
      input: {
        source: body.source,
        workflow: body.workflow,
        industry: body.industry,
        params: body.params,
        payload: body.payload,
      },
      output: { summary: result.summary, data: result.data },
      confidence: result.confidence,
      requires_approval: result.requiresApproval,
      status: result.requiresApproval ? "needs_approval" : "completed",
    });

    return NextResponse.json({
      ok: true,
      executed: true,
      kind: "tool",
      executionId,
      ...result,
      message: `Ran ${tool} from ${body.source ?? "vps"}`,
    });
  }

  const executionId = await logAgentExecution({
    agent_id: body.agent_id ?? "vps-orchestrator",
    tool_name: body.workflow ?? "vps_webhook",
    input: { source: body.source, payload: body.payload, tool: body.tool },
    output: { received: true, at: new Date().toISOString() },
    confidence: 1,
    status: "received",
  });

  return NextResponse.json({
    ok: true,
    executed: false,
    executionId,
    message: body.tool
      ? `Unknown tool "${body.tool}" — ping only.`
      : "Webhook received — pass tool or workflowId",
    next: ["/api/agents/execute", "/api/autonomy/run", "/api/sarvam/chat"],
  });
}

export async function GET() {
  return NextResponse.json({
    service: "yugam-vps-webhook",
    sources: ["temporal", "n8n", "hermes", "flowise", "dify", "dokploy"],
    auth: "x-vps-secret header",
    execute: "POST { tool | workflowId, industry?, params?, agent_id?, source? }",
    saas_base:
      process.env.URL || process.env.DEPLOY_PRIME_URL || "https://sctransformation.netlify.app",
    vps_public_url: process.env.VPS_PUBLIC_URL || null,
  });
}
