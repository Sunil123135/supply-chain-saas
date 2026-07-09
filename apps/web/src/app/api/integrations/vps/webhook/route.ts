import { NextResponse } from "next/server";

import { logAgentExecution } from "@/lib/supabase/server";

/**
 * VPS agent stack ingress — Temporal / n8n / Hermes / Flowise callbacks.
 * Set VPS_WEBHOOK_SECRET on Netlify; callers send x-vps-secret header.
 */
export async function POST(req: Request) {
  const secret = process.env.VPS_WEBHOOK_SECRET;
  const header = req.headers.get("x-vps-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized — set VPS_WEBHOOK_SECRET" }, { status: 401 });
  }

  const body = (await req.json()) as {
    source?: string;
    workflow?: string;
    agent_id?: string;
    payload?: unknown;
  };

  const executionId = await logAgentExecution({
    agent_id: body.agent_id ?? "vps-orchestrator",
    tool_name: body.workflow ?? "vps_webhook",
    input: { source: body.source, payload: body.payload },
    output: { received: true, at: new Date().toISOString() },
    confidence: 1,
    status: "received",
  });

  return NextResponse.json({
    ok: true,
    executionId,
    message: "Webhook received — Yugam agent queue",
    next: ["/api/agents/execute", "/api/sarvam/chat"],
  });
}

export async function GET() {
  return NextResponse.json({
    service: "yugam-vps-webhook",
    sources: ["temporal", "n8n", "hermes", "flowise", "dify"],
    auth: "x-vps-secret header",
  });
}
