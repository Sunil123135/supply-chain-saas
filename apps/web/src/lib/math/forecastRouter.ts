import { wape, mape } from "@/lib/math/wape";
import { loadIndustryPack } from "@/lib/data/loadPack";
import type { IndustryPack } from "@/lib/import/config";
import type { DemandRow } from "@/lib/math/forecast";

export type ForecastModel =
  | "auto"
  | "ets"
  | "exponential_smoothing"
  | "prophet"
  | "croston"
  | "lightgbm_quantile"
  | "patchtst"
  | "nbeats"
  | "tft"
  | "chronos"
  | "moirai";

/** Croston's method — TS fallback when optimizer offline */
export function forecastCroston(values: number[], horizon = 4, alpha = 0.1): number[] {
  const demandSizes: number[] = [];
  const intervals: number[] = [];
  let lastIdx = -1;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v > 0) {
      demandSizes.push(v);
      if (lastIdx >= 0) intervals.push(i - lastIdx);
      lastIdx = i;
    }
  }
  if (!demandSizes.length) return Array(horizon).fill(0);
  let z = demandSizes[0]!;
  let p = intervals[0] ?? 1;
  for (let i = 1; i < demandSizes.length; i++) {
    z = alpha * demandSizes[i]! + (1 - alpha) * z;
    if (i < intervals.length) p = alpha * intervals[i]! + (1 - alpha) * p;
  }
  const rate = p > 0 ? z / p : 0;
  return Array(horizon).fill(Math.max(0, rate));
}

/** Holt linear trend (ETS-lite) */
export function forecastEts(values: number[], horizon = 4): number[] {
  if (values.length < 4) {
    const m = values.reduce((a, b) => a + b, 0) / (values.length || 1);
    return Array(horizon).fill(m);
  }
  let level = values[0]!;
  let trend = values[1]! - values[0]!;
  const alpha = 0.3;
  const beta = 0.1;
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    const prev = level;
    level = alpha * v + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, h) => Math.max(0, level + (h + 1) * trend));
}

function forecastExponentialSmoothing(values: number[], horizon = 4): number[] {
  if (!values.length) return Array(horizon).fill(0);
  let level = values[0]!;
  const alpha = 0.3;
  for (let i = 1; i < values.length; i++) {
    level = alpha * values[i]! + (1 - alpha) * level;
  }
  return Array(horizon).fill(Math.round(level));
}

function zeroPct(values: number[]): number {
  return values.filter((v) => v === 0).length / (values.length || 1);
}

export function pickModel(values: number[]): ForecastModel {
  const n = values.length;
  if (n < 12) return "chronos";
  if (zeroPct(values) > 0.35) return "croston";
  if (n >= 104) return "lightgbm_quantile";
  if (n >= 80) return "patchtst";
  if (n >= 52) return "prophet";
  return "ets";
}

export function runLocalForecast(
  values: number[],
  model: ForecastModel,
  horizon = 4,
): { forecast: number[]; model: string } {
  const m = model === "auto" ? pickModel(values) : model;
  if (m === "croston") return { forecast: forecastCroston(values, horizon), model: "croston" };
  if (m === "exponential_smoothing")
    return { forecast: forecastExponentialSmoothing(values, horizon), model: "exponential_smoothing" };
  if (m === "ets" || m === "prophet" || m === "patchtst" || m === "nbeats" || m === "tft")
    return { forecast: forecastEts(values, horizon), model: `${m}_ets_fallback` };
  if (m === "lightgbm_quantile")
    return { forecast: forecastEts(values, horizon), model: "lightgbm_ets_fallback" };
  if (m === "chronos" || m === "moirai")
    return { forecast: forecastEts(values, horizon), model: `${m}_ets_fallback` };
  return { forecast: forecastExponentialSmoothing(values, horizon), model: "exponential_smoothing" };
}

export async function localWapeDashboard(industry: IndustryPack, skuLimit = 12, holdout = 8) {
  const pack = await loadIndustryPack(industry);
  const bySku = new Map<string, { week: string; qty: number }[]>();
  for (const r of (pack.files.demand_history?.rows ?? []) as DemandRow[]) {
    const list = bySku.get(r.sku_id) ?? [];
    list.push({ week: r.week_start, qty: Number(r.qty) || 0 });
    bySku.set(r.sku_id, list);
  }

  const models: ForecastModel[] = ["ets", "croston", "exponential_smoothing"];
  const rows: Record<string, unknown>[] = [];

  const ranked = Array.from(bySku.entries())
    .map(([sku, s]) => ({ sku, total: s.reduce((a, b) => a + b.qty, 0), series: s }))
    .sort((a, b) => b.total - a.total)
    .slice(0, skuLimit);

  for (const { sku, series } of ranked) {
    const values = series.map((s) => s.qty);
    if (values.length <= holdout + 4) continue;
    const train = values.slice(0, -holdout);
    const test = values.slice(-holdout);

    for (const m of models) {
      const fc = runLocalForecast(train, m, holdout).forecast.slice(0, holdout);
      rows.push({
        sku_id: sku,
        model: m,
        wape: wape(test, fc),
        mape: mape(test, fc),
        engine: "typescript-fallback",
      });
    }
    const autoM = pickModel(train);
    const autoFc = runLocalForecast(train, autoM, holdout).forecast.slice(0, holdout);
    rows.push({
      sku_id: sku,
      model: "auto",
      model_selected: autoM,
      wape: wape(test, autoFc),
      mape: mape(test, autoFc),
      engine: "typescript-fallback",
    });
  }

  const leaderboard = models.concat(["auto"]).map((m) => {
    const wapes = rows.filter((r) => r.model === m && typeof r.wape === "number").map((r) => r.wape as number);
    return {
      model: m,
      avg_wape: wapes.length ? Math.round((wapes.reduce((a, b) => a + b, 0) / wapes.length) * 10) / 10 : 0,
      sku_count: wapes.length,
    };
  });

  return { industry, holdout_weeks: holdout, rows, leaderboard, engine: "typescript-fallback" };
}
