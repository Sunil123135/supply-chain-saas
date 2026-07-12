import { NextResponse } from "next/server";

import { runSarvamChat } from "@/lib/sarvam/chatCore";
import type { IndustryPack } from "@/lib/import/config";

/** Allow Dify narrate + tool math within Netlify Pro serverless budget. */
export const maxDuration = 26;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    prompt: string;
    industry?: IndustryPack;
    useLlm?: boolean;
  };

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const result = await runSarvamChat({
    prompt: body.prompt,
    industry: body.industry,
    useLlm: body.useLlm,
    channel: "web",
  });

  return NextResponse.json(result);
}
