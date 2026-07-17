import { NextResponse } from "next/server";

import {
  fetchTemporalHealth,
  getTemporalGatewayUrl,
  syncTemporalSchedules,
} from "@/lib/temporal/client";

/** GET — Temporal gateway health + config presence */
export async function GET() {
  const gatewayUrl = getTemporalGatewayUrl();
  if (!gatewayUrl) {
    return NextResponse.json({
      configured: false,
      ok: false,
      hint: "Set TEMPORAL_GATEWAY_URL (e.g. http://localhost:8090) after docs/temporal/install.ps1",
      docs: "docs/temporal/README.md",
    });
  }
  const health = await fetchTemporalHealth();
  return NextResponse.json({
    configured: true,
    ...health,
  });
}

/** POST — sync cron schedules on Temporal { industry? } */
export async function POST(req: Request) {
  const secret = process.env.VPS_WEBHOOK_SECRET || process.env.BOT_SHARED_SECRET;
  const header = req.headers.get("x-vps-secret") || req.headers.get("x-bot-secret");
  const open =
    process.env.BOT_OPEN_DEMO === "true" ||
    (!secret && process.env.NODE_ENV !== "production");
  if (secret && header !== secret && !open) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { industry?: string };
  const result = await syncTemporalSchedules(body.industry ?? "medtech");
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
