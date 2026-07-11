import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    phase: "P3",
    app: "Yugam",
    version: "0.2.0",
    deploy: { frontend: "netlify", backend: "railway", optimizer: "railway" },
    wiring: "/api/health/wiring",
    timestamp: new Date().toISOString(),
  });
}
