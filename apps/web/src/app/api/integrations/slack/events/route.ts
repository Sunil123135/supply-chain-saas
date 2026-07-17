import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bots/adapter";
import { verifySlackSignature } from "@/lib/auth/rbac";
import type { IndustryPack } from "@/lib/import/config";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  let hmacOk = false;
  if (signingSecret) {
    const verified = verifySlackSignature({
      signingSecret,
      timestamp: req.headers.get("x-slack-request-timestamp"),
      signature: req.headers.get("x-slack-signature"),
      rawBody,
    });
    if (!verified.ok) {
      return NextResponse.json(
        { error: "Slack signature failed", reason: verified.reason },
        { status: 401 },
      );
    }
    hmacOk = true;
  }

  const body = JSON.parse(rawBody || "{}") as {
    type?: string;
    challenge?: string;
    event?: { type?: string; text?: string; user?: string; bot_id?: string; channel?: string };
    text?: string;
    industry?: IndustryPack;
  };

  if (body.type === "url_verification" && body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.event?.bot_id) {
    return NextResponse.json({ ok: true, ignored: "bot_message" });
  }

  // Rebuild Request for shared-secret path when HMAC not configured
  const forward = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: rawBody,
  });

  const text = (body.event?.text || body.text || "").replace(/<@[A-Z0-9]+>/g, "").trim();
  const result = await handleBotMessage({
    req: forward,
    channel: "slack",
    text,
    userId: body.event?.user,
    industry: body.industry,
    skipSecretCheck: hmacOk,
  });
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET() {
  return NextResponse.json({
    service: "yugam-slack-bot",
    auth: process.env.SLACK_SIGNING_SECRET
      ? "SLACK_SIGNING_SECRET (HMAC v0)"
      : "x-bot-secret (set SLACK_SIGNING_SECRET for production)",
    tip: "Point Slack Event Subscriptions here; prefer SLACK_SIGNING_SECRET on Netlify",
  });
}
