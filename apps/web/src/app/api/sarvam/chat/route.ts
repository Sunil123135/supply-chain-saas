import { NextResponse } from "next/server";

import { agentName, resolveToolFromPrompt, runTool } from "@/lib/agents/tools";
import { getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";
import { logAgentExecution } from "@/lib/supabase/server";
import type { IndustryPack } from "@/lib/import/config";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prompt: string;
    industry?: IndustryPack;
    useLlm?: boolean;
  };

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const tool = resolveToolFromPrompt(body.prompt);
  const toolResult = await runTool(tool, { industry: body.industry, prompt: body.prompt });

  const executionId = await logAgentExecution({
    agent_id: toolResult.agentId,
    tool_name: tool,
    input: { prompt: body.prompt, industry: body.industry },
    output: toolResult.data,
    confidence: toolResult.confidence,
    requires_approval: toolResult.requiresApproval,
  });

  let narrative = [
    `**Sarvam → ${agentName(toolResult.agentId)}**`,
    "",
    `**Tool executed:** \`${tool}\` (real supply-chain math, not keyword template)`,
    "",
    `### Result`,
    toolResult.summary,
    "",
    toolResult.requiresApproval
      ? "⚠️ **Human approval required** before autonomous execution."
      : "✓ Within confidence threshold — ready to apply.",
    "",
    "### Data preview",
    "```json",
    JSON.stringify(toolResult.data, null, 2).slice(0, 2000),
    "```",
  ].join("\n");

  const apiUrl = getApiUrl();
  if (body.useLlm && !isMisconfiguredApiUrl(apiUrl)) {
    try {
      const res = await fetch(`${apiUrl}/api/sarvam/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: body.prompt,
          tool,
          summary: toolResult.summary,
          data: toolResult.data,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { narrative?: string };
        if (data.narrative) narrative = data.narrative;
      }
    } catch {
      /* keep deterministic narrative */
    }
  }

  return NextResponse.json({
    role: "sarvam",
    content: narrative,
    agentId: toolResult.agentId,
    tool,
    confidence: toolResult.confidence,
    requiresApproval: toolResult.requiresApproval,
    executionId,
    data: toolResult.data,
    actions: [
      `Review module workspace`,
      toolResult.requiresApproval ? "Approve in agent queue" : "Apply recommendation",
      "Export audit trail",
    ],
  });
}
