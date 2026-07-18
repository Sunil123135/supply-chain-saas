import { NextResponse } from "next/server";

import { handleBotMessage } from "@/lib/bots/adapter";

/**
 * Voice channel — accepts browser STT transcript (or typed fallback).
 * POST { transcript, industry?, userId? }
 * Optional: { speak: true } returns reply only (TTS left to Web Speech API client).
 */
export async function POST(req: Request) {
  let body: {
    transcript?: string;
    text?: string;
    industry?: "medtech" | "cpg";
    userId?: string;
    speak?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.transcript ?? body.text ?? "").trim();
  if (!text) {
    return NextResponse.json(
      {
        error: "transcript required",
        hint: "Use Web Speech API on client, then POST transcript here",
      },
      { status: 400 },
    );
  }

  const result = await handleBotMessage({
    req,
    channel: "voice",
    text,
    userId: body.userId,
    industry: body.industry,
  });

  return NextResponse.json(
    {
      ...result.body,
      speak: body.speak ?? true,
      ttsHint: "Use window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply))",
    },
    { status: result.status },
  );
}

export async function GET() {
  return NextResponse.json({
    channel: "voice",
    method: "POST",
    body: { transcript: "which lots expire soon?", industry: "medtech", speak: true },
    auth: "BOT_OPEN_DEMO=true or x-bot-secret",
  });
}
