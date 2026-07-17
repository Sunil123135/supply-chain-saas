import { NextResponse } from "next/server";

import { isToolName, runTool, type ToolName } from "@/lib/agents/tools";
import { getModule } from "@/lib/product/catalog";
import type { IndustryPack } from "@/lib/import/config";

const MODULE_TOOLS: Record<string, ToolName> = {
  "inventory-optimisation": "meio_optimize",
  "freight-settlement": "freight_audit",
  "demand-forecasting": "forecast_compare",
  "control-tower": "control_tower",
  "dispatch-planning": "dispatch_analysis",
  "risk-management": "cold_chain",
  "scenario-modelling": "plan_vs_actual",
  "rough-cut-capacity": "rccp",
  "production-planning": "production_plan",
  "warehouse-planning": "warehouse_plan",
  "3d-load-building": "load_build",
  "fleet-sizing": "fleet_size",
  "rfq-bidding": "rfq_score",
  "eta-prediction": "track_trace",
  epod: "epod_validate",
};

type Params = { params: { slug: string } };

export async function GET(req: Request, { params }: Params) {
  const mod = getModule(params.slug);
  if (!mod) return NextResponse.json({ error: "module not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") as IndustryPack) ?? "medtech";
  const toolOverride = searchParams.get("tool");
  const tool =
    toolOverride && isToolName(toolOverride)
      ? toolOverride
      : MODULE_TOOLS[params.slug];

  if (tool) {
    const result = await runTool(tool, { industry });
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
