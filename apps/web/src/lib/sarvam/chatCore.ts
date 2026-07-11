import { agentName, resolveToolFromPrompt, runTool } from "@/lib/agents/tools";
import { buildSarvamNarrative } from "@/lib/sarvam/narrative";
import { logAgentExecution } from "@/lib/supabase/server";
import type { IndustryPack } from "@/lib/import/config";

export interface SarvamChatInput {
  prompt: string;
  industry?: IndustryPack;
  useLlm?: boolean;
  channel?: "web" | "slack" | "teams" | "whatsapp" | "hermes" | "temporal";
  externalUserId?: string;
}

export interface SarvamChatOutput {
  role: "sarvam";
  content: string;
  agentId: string;
  tool: string;
  confidence: number;
  requiresApproval: boolean;
  executionId: string | null;
  data: unknown;
  channel: string;
  actions: string[];
}

function orgIdFromToolData(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || !("orgId" in data)) return undefined;
  const value = (data as { orgId?: unknown }).orgId;
  return typeof value === "string" ? value : undefined;
}

export async function runSarvamChat(input: SarvamChatInput): Promise<SarvamChatOutput> {
  const prompt = input.prompt.trim();
  const tool = resolveToolFromPrompt(prompt);
  const toolResult = await runTool(tool, { industry: input.industry, prompt });
  const orgId = orgIdFromToolData(toolResult.data);

  const executionId = await logAgentExecution({
    org_id: orgId,
    agent_id: toolResult.agentId,
    tool_name: tool,
    input: {
      prompt,
      industry: input.industry,
      channel: input.channel ?? "web",
      externalUserId: input.externalUserId,
    },
    output: { summary: toolResult.summary, data: toolResult.data },
    confidence: toolResult.confidence,
    requires_approval: toolResult.requiresApproval,
    status: toolResult.requiresApproval ? "needs_approval" : "completed",
  });

  const narrative = await buildSarvamNarrative({
    prompt,
    tool,
    agentId: toolResult.agentId,
    summary: toolResult.summary,
    data: toolResult.data,
    requiresApproval: toolResult.requiresApproval,
    useLlm: input.useLlm !== false,
  });

  return {
    role: "sarvam",
    content: narrative,
    agentId: toolResult.agentId,
    tool,
    confidence: toolResult.confidence,
    requiresApproval: toolResult.requiresApproval,
    executionId,
    data: toolResult.data,
    channel: input.channel ?? "web",
    actions: [
      `Review ${agentName(toolResult.agentId)} workspace`,
      toolResult.requiresApproval ? "Approve in agent queue" : "Apply recommendation",
      "Export audit trail",
    ],
  };
}
