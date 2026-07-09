import { NextResponse } from "next/server";

import { fetchOptimizer } from "@/lib/forecast/optimizer";
import { localWapeDashboard } from "@/lib/math/forecastRouter";
import type { IndustryPack } from "@/lib/import/config";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industry = (searchParams.get("industry") as IndustryPack) ?? "medtech";
  const skuLimit = Number(searchParams.get("sku_limit")) || 12;
  const holdout = Number(searchParams.get("holdout")) || 8;

  try {
    const res = await fetchOptimizer(
      `/api/forecast/dashboard?industry=${industry}&sku_limit=${skuLimit}&holdout=${holdout}`,
    );
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ...data, engine: "yugam-optimizer" });
    }
  } catch {
    /* fallback */
  }

  const fallback = await localWapeDashboard(industry, skuLimit, holdout);
  return NextResponse.json(fallback);
}
