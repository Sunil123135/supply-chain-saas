import { NextResponse } from "next/server";

import { computeFefoQueue } from "@/lib/math/fefo";
import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") as IndustryPack) ?? "medtech";
  const horizonDays = Number(searchParams.get("horizonDays")) || 60;

  const pack = await loadIndustryPack(industry);
  const lots = (pack.files.lots_inventory?.rows ?? []) as import("@/lib/math/fefo").LotRow[];
  const unitCostBySku: Record<string, number> = {};
  for (const s of pack.files.sku_master?.rows ?? []) {
    unitCostBySku[s.sku_id] = Number(s.unit_cost_inr) || 100;
  }

  const result = computeFefoQueue(lots, { horizonDays, unitCostBySku });
  return NextResponse.json({ industry, ...result, engine: "fefo-v1" });
}
