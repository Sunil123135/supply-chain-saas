import { NextResponse } from "next/server";

import { runTool, type ToolName } from "@/lib/agents/tools";
import { logAgentExecution } from "@/lib/supabase/server";
import type { IndustryPack } from "@/lib/import/config";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tool?: ToolName;
    prompt?: string;
    industry?: IndustryPack;
    params?: Record<string, unknown>;
    agent_id?: string;
  };

  const tool = body.tool;
  if (!tool) {
    return NextResponse.json({ error: "tool required" }, { status: 400 });
  }

  const result = await runTool(tool, {
    industry: body.industry,
    prompt: body.prompt,
    params: body.params,
  });

  const executionId = await logAgentExecution({
    agent_id: body.agent_id ?? result.agentId,
    tool_name: tool,
    input: { industry: body.industry, params: body.params, prompt: body.prompt },
    output: result.data,
    confidence: result.confidence,
    requires_approval: result.requiresApproval,
  });

  return NextResponse.json({ ...result, executionId, persisted: Boolean(executionId) });
}

export async function GET() {
  return NextResponse.json({
    tools: [
      "inventory_fefo",
      "freight_audit",
      "demand_forecast",
      "control_tower",
      "dispatch_analysis",
      "risk_scan",
      "scenario_baseline",
    ],
  });
}
