import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bots/adapter";
import type { IndustryPack } from "@/lib/import/config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || process.env.BOT_SHARED_SECRET;

  if (mode === "subscribe" && token && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    service: "yugam-whatsapp-bot",
    auth: "x-bot-secret + hub.verify_token",
    tip: "Meta webhook → this URL; replies truncated to WhatsApp limits",
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{ from?: string; text?: { body?: string }; type?: string }>;
          metadata?: { phone_number_id?: string };
        };
      }>;
    }>;
    text?: string;
    from?: string;
    industry?: IndustryPack;
  };

  if (body.text) {
    const result = await handleBotMessage({
      req,
      channel: "whatsapp",
      text: body.text,
      userId: body.from,
      industry: body.industry,
    });
    return NextResponse.json(
      {
        ...result.body,
        messaging_product: "whatsapp",
      },
      { status: result.status },
    );
  }

  const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  const text = msg?.text?.body ?? "";
  if (!text) {
    return NextResponse.json({ ok: true, ignored: "no_text" });
  }

  const result = await handleBotMessage({
    req,
    channel: "whatsapp",
    text,
    userId: msg?.from,
    industry: body.industry,
  });

  // Meta expects 200 quickly; reply text is available for your sender worker
  return NextResponse.json(
    {
      ...result.body,
      messaging_product: "whatsapp",
      to: msg?.from,
      phone_number_id: body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id,
    },
    { status: result.status },
  );
}
