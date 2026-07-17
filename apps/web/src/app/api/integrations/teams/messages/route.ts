import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bots/adapter";
import type { IndustryPack } from "@/lib/import/config";

/**
 * Microsoft Teams Bot Framework-compatible endpoint.
 * Configure messaging endpoint to POST here; send x-bot-secret header via
 * Bot Framework middleware or use BOT_OPEN_DEMO=true for sandbox.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    text?: string;
    type?: string;
    from?: { id?: string; name?: string };
    recipient?: { id?: string };
    conversation?: { id?: string };
    message?: { text?: string };
    industry?: IndustryPack;
  };

  if (
    body.type === "conversationUpdate" ||
    body.type === "invoke" ||
    body.type === "installationUpdate"
  ) {
    return NextResponse.json({ ok: true });
  }

  const text = (body.text || body.message?.text || "").trim();
  if (!text) {
    return NextResponse.json({
      type: "message",
      text: "Ask Sarvam about FEFO, freight, MEIO, ATP, cold-chain, or plan-vs-actual.",
    });
  }

  const result = await handleBotMessage({
    req,
    channel: "teams",
    text,
    userId: body.from?.id,
    industry: body.industry,
  });

  if (result.status !== 200) {
    return NextResponse.json(
      {
        type: "message",
        text: String(result.body.error ?? "Unauthorized"),
      },
      { status: result.status },
    );
  }

  const reply = String(result.body.reply ?? "");
  const tool = result.body.tool ? ` _(via ${String(result.body.tool)})_` : "";
  return NextResponse.json({
    type: "message",
    text: `${reply}${tool}`,
    channelData: {
      yugam: {
        tool: result.body.tool,
        agentId: result.body.agentId,
        requiresApproval: result.body.requiresApproval,
        executionId: result.body.executionId,
        confidence: result.body.confidence,
      },
    },
  });
}

export async function GET() {
  return NextResponse.json({
    service: "yugam-teams-bot",
    auth: "x-bot-secret (or BOT_OPEN_DEMO=true)",
    tip: "Set messaging endpoint to this URL in Azure Bot registration",
  });
}
