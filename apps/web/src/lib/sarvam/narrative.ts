import { getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";
import { narrateWithDify } from "@/lib/dify/client";
import { agentName } from "@/lib/agents/tools";
import { PAIN_MAP } from "@/lib/painMap";

export interface NarrativeInput {
  prompt: string;
  tool: string;
  agentId: string;
  summary: string;
  data: unknown;
  requiresApproval: boolean;
  useLlm?: boolean;
}

function deterministicNarrative(input: NarrativeInput): string {
  return [
    `**Sarvam → ${agentName(input.agentId)}**`,
    "",
    `**Tool executed:** \`${input.tool}\` (real supply-chain math)`,
    "",
    `### Result`,
    input.summary,
    "",
    input.requiresApproval
      ? "⚠️ **Human approval required** before autonomous execution."
      : "✓ Within confidence threshold — ready to apply.",
    "",
    "### Data preview",
    "```json",
    JSON.stringify(input.data, null, 2).slice(0, 1800),
    "```",
  ].join("\n");
}

function painContext(): string {
  return PAIN_MAP.slice(0, 12)
    .map((p) => `- #${p.id} [${p.status}] ${p.pain} → ${p.how}`)
    .join("\n");
}

/** Prefer Dify RAG → Railway narrate → deterministic. */
export async function buildSarvamNarrative(input: NarrativeInput): Promise<string> {
  const fallback = deterministicNarrative(input);

  if (input.useLlm === false) return fallback;

  const dify = await narrateWithDify({
    prompt: input.prompt,
    tool: input.tool,
    summary: input.summary,
    painContext: painContext(),
    dataPreview: JSON.stringify(input.data).slice(0, 1200),
  });
  if (dify) return dify;

  const apiUrl = getApiUrl();
  if (!isMisconfiguredApiUrl(apiUrl)) {
    try {
      const res = await fetch(`${apiUrl}/api/sarvam/narrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input.prompt,
          tool: input.tool,
          summary: input.summary,
          data: input.data,
          pain_context: painContext(),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { narrative?: string };
        if (data.narrative?.trim()) return data.narrative;
      }
    } catch {
      /* keep fallback */
    }
  }

  return fallback;
}
