import { NextResponse } from "next/server";

import { ALL_TOOLS, isToolName, runTool, type ToolName } from "@/lib/agents/tools";
import { findDemoOrgId } from "@/lib/data/orgWorkspace";
import { logAgentExecution } from "@/lib/supabase/server";
import type { IndustryPack } from "@/lib/import/config";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tool?: string;
    prompt?: string;
    industry?: IndustryPack;
    params?: Record<string, unknown>;
    agent_id?: string;
  };

  const tool = body.tool;
  if (!tool || !isToolName(tool)) {
    return NextResponse.json(
      { error: "tool required", tools: ALL_TOOLS },
      { status: 400 },
    );
  }

  const result = await runTool(tool as ToolName, {
    industry: body.industry,
    prompt: body.prompt,
    params: body.params,
  });

  const industry =
    body.industry ??
    (/cpg|fmcg|india/i.test(body.prompt ?? "") ? "cpg" : "medtech");
  const orgId =
    result.orgId ??
    (typeof result.data === "object" &&
    result.data &&
    "orgId" in result.data &&
    typeof (result.data as { orgId?: unknown }).orgId === "string"
      ? (result.data as { orgId: string }).orgId
      : await findDemoOrgId(industry));

  const executionId = await logAgentExecution({
    org_id: orgId ?? undefined,
    agent_id: body.agent_id ?? result.agentId,
    tool_name: tool,
    input: { industry: body.industry, params: body.params, prompt: body.prompt },
    output: { summary: result.summary, data: result.data },
    confidence: result.confidence,
    requires_approval: result.requiresApproval,
    status: result.requiresApproval ? "needs_approval" : "completed",
  });

  return NextResponse.json({ ...result, executionId, persisted: Boolean(executionId) });
}
export async function GET() {
  return NextResponse.json({ tools: ALL_TOOLS });
}
