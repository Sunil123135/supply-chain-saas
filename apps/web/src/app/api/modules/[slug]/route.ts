import { NextResponse } from "next/server";

import { runTool } from "@/lib/agents/tools";
import { getModule } from "@/lib/product/catalog";
import type { IndustryPack } from "@/lib/import/config";

const MODULE_TOOLS: Record<string, string> = {
  "inventory-optimisation": "inventory_fefo",
  "freight-settlement": "freight_audit",
  "demand-forecasting": "demand_forecast",
  "control-tower": "control_tower",
  "dispatch-planning": "dispatch_analysis",
  "risk-management": "risk_scan",
  "scenario-modelling": "scenario_baseline",
};

type Params = { params: { slug: string } };

export async function GET(req: Request, { params }: Params) {
  const mod = getModule(params.slug);
  if (!mod) return NextResponse.json({ error: "module not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") as IndustryPack) ?? "medtech";
  const tool = MODULE_TOOLS[params.slug];

  if (tool) {
    const result = await runTool(tool as Parameters<typeof runTool>[0], { industry });
    return NextResponse.json({ module: mod.slug, ...result, engine: "yugam-math" });
  }

  return NextResponse.json({
    module: mod.slug,
    engine: "scaffold",
    status: mod.status,
    message: `${mod.name} UI ready — optimizer ships in next phase`,
    kpis: mod.kpis,
  });
}
