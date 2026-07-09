export interface DemandRow {
  sku_id: string;
  week_start: string;
  qty: string | number;
  [key: string]: string | number | undefined;
}

export interface ForecastPoint {
  sku_id: string;
  week_start: string;
  actual: number;
  forecast: number;
  error_pct: number;
}

function num(v: string | number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Exponential smoothing (alpha=0.3) per SKU — real math, not LLM. */
export function forecastBySku(
  rows: DemandRow[],
  horizonWeeks = 4,
): { forecasts: ForecastPoint[]; mape: number } {
  const bySku = new Map<string, { week: string; qty: number }[]>();
  for (const r of rows) {
    const list = bySku.get(r.sku_id) ?? [];
    list.push({ week: r.week_start, qty: num(r.qty) });
    bySku.set(r.sku_id, list);
  }

  const forecasts: ForecastPoint[] = [];
  let absPctSum = 0;
  let count = 0;

  for (const [sku_id, series] of Array.from(bySku.entries())) {
    series.sort((a, b) => a.week.localeCompare(b.week));
    if (series.length < 3) continue;

    let level = series[0]!.qty;
    const alpha = 0.3;
    for (let i = 1; i < series.length; i++) {
      const actual = series[i]!.qty;
      const prevForecast = level;
      level = alpha * actual + (1 - alpha) * level;
      if (i > series.length - 5) {
        const err = actual > 0 ? Math.abs((actual - prevForecast) / actual) * 100 : 0;
        absPctSum += err;
        count++;
        forecasts.push({
          sku_id,
          week_start: series[i]!.week,
          actual,
          forecast: Math.round(prevForecast),
          error_pct: Math.round(err * 10) / 10,
        });
      }
    }
    const lastWeek = series[series.length - 1]!.week;
    for (let h = 1; h <= horizonWeeks; h++) {
      const d = new Date(lastWeek);
      d.setDate(d.getDate() + h * 7);
      forecasts.push({
        sku_id,
        week_start: d.toISOString().slice(0, 10),
        actual: 0,
        forecast: Math.round(level),
        error_pct: 0,
      });
    }
  }

  return {
    forecasts: forecasts.slice(0, 200),
    mape: count > 0 ? Math.round((absPctSum / count) * 10) / 10 : 0,
  };
}
