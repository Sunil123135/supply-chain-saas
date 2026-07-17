import { runSarvamChat } from "@/lib/sarvam/chatCore";
import type { IndustryPack } from "@/lib/import/config";
import { safeEqual } from "@/lib/auth/rbac";

export function botAuthorized(req: Request): boolean {
  if (process.env.BOT_OPEN_DEMO === "true") return true;
  const expected = process.env.BOT_SHARED_SECRET || process.env.VPS_WEBHOOK_SECRET;
  if (!expected) return false;
  const header = req.headers.get("x-bot-secret") || req.headers.get("x-vps-secret");
  if (!header) return false;
  return safeEqual(header, expected);
}

export async function handleBotMessage(opts: {
  req: Request;
  channel: "slack" | "teams" | "whatsapp";
  text: string;
  userId?: string;
  industry?: IndustryPack;
  /** When Slack HMAC already verified, skip shared-secret header. */
  skipSecretCheck?: boolean;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!opts.skipSecretCheck && !botAuthorized(opts.req)) {
    return {
      status: 401,
      body: {
        error: "Unauthorized",
        hint:
          opts.channel === "slack"
            ? "Set SLACK_SIGNING_SECRET (preferred) or BOT_SHARED_SECRET + x-bot-secret"
            : "Set BOT_SHARED_SECRET and send x-bot-secret",
      },
    };
  }
  if (!opts.text.trim()) {
    return { status: 400, body: { error: "empty message" } };
  }

  const result = await runSarvamChat({
    prompt: opts.text,
    industry: opts.industry,
    channel: opts.channel,
    externalUserId: opts.userId,
    useLlm: true,
  });

  const reply =
    opts.channel === "whatsapp"
      ? truncate(result.content, 3500)
      : opts.channel === "teams"
        ? result.content
        : result.content;

  return {
    status: 200,
    body: {
      ok: true,
      channel: opts.channel,
      reply,
      tool: result.tool,
      agentId: result.agentId,
      requiresApproval: result.requiresApproval,
      executionId: result.executionId,
      actions: result.actions,
      confidence: result.confidence,
    },
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}…\n(truncated)`;
}
