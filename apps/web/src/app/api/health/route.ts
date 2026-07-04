import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    phase: "P0",
    app: "Yugam",
    version: "0.1.0",
    deploy: { frontend: "netlify", backend: "railway" },
    timestamp: new Date().toISOString(),
  });
}
