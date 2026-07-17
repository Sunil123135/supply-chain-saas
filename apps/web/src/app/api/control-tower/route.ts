import { NextResponse } from "next/server";

import { runTool } from "@/lib/agents/tools";
import type { IndustryPack } from "@/lib/import/config";

/** Live Control Tower JSON for dashboard + module views. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") === "cpg" ? "cpg" : "medtech") as IndustryPack;
  const result = await runTool("control_tower", { industry });
  return NextResponse.json(result);
}
