import { NextResponse } from "next/server";

import { fetchOptimizer } from "@/lib/forecast/optimizer";
import { runLocalForecast } from "@/lib/math/forecastRouter";
import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";
import type { DemandRow } from "@/lib/math/forecast";
import type { ForecastModel } from "@/lib/math/forecastRouter";

export async function GET() {
  try {
    const res = await fetchOptimizer("/api/forecast/models");
    if (res.ok) return NextResponse.json(await res.json());
  } catch {
    /* fallback */
  }
  return NextResponse.json({
    models: [
      "auto",
      "ets",
      "prophet",
      "croston",
      "lightgbm_quantile",
      "patchtst",
      "nbeats",
      "tft",
      "chronos",
      "moirai",
      "exponential_smoothing",
    ],
    engine: "typescript-fallback",
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    industry?: IndustryPack;
    sku_id?: string;
    model?: ForecastModel;
    horizon?: number;
  };

  const industry = body.industry ?? "medtech";
  const model = body.model ?? "auto";
  const horizon = body.horizon ?? 4;

  try {
    const res = await fetchOptimizer("/api/forecast/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, sku_id: body.sku_id, model, horizon }),
    });
    if (res.ok) {
      return NextResponse.json({ ...(await res.json()), engine: "yugam-optimizer" });
    }
  } catch {
    /* fallback */
  }

  const pack = await loadIndustryPack(industry);
  const rows = (pack.files.demand_history?.rows ?? []) as DemandRow[];
  const bySku = new Map<string, number[]>();
  for (const r of rows) {
    const list = bySku.get(r.sku_id) ?? [];
    list.push(Number(r.qty) || 0);
    bySku.set(r.sku_id, list);
  }

  if (body.sku_id) {
    const values = bySku.get(body.sku_id) ?? [];
    const result = runLocalForecast(values, model, horizon);
    return NextResponse.json({
      sku_id: body.sku_id,
      ...result,
      engine: "typescript-fallback",
    });
  }

  const results = Array.from(bySku.entries()).slice(0, 15).map(([sku_id, values]) => ({
    sku_id,
    ...runLocalForecast(values, model, horizon),
  }));
  return NextResponse.json({ industry, model, results, engine: "typescript-fallback" });
}
