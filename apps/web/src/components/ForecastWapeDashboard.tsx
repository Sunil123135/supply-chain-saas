"use client";

import { useEffect, useState } from "react";

interface LeaderboardRow {
  model: string;
  avg_wape: number;
  sku_count: number;
}

interface DetailRow {
  sku_id: string;
  model: string;
  wape?: number;
  mape?: number;
  model_selected?: string;
  error?: string;
}

interface DashboardData {
  industry: string;
  holdout_weeks: number;
  engine?: string;
  leaderboard: LeaderboardRow[];
  rows: DetailRow[];
  models_available?: string[];
}

const MODEL_PHASES = [
  { phase: "Week 1–2", models: "ETS, Prophet, Croston, WAPE dashboard" },
  { phase: "Week 2–3", models: "LightGBM quantile + auto model picker" },
  { phase: "Week 4–6", models: "PatchTST, N-BEATS, TFT (NeuralForecast)" },
  { phase: "Week 6+", models: "Chronos / Moirai zero-shot for new SKUs" },
];

export function ForecastWapeDashboard() {
  const [industry, setIndustry] = useState<"medtech" | "cpg">("medtech");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/forecast/dashboard?industry=${industry}&sku_limit=12&holdout=8`)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [industry]);

  const autoRow = data?.leaderboard.find((r) => r.model === "auto");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["medtech", "cpg"] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndustry(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              industry === i ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"
            }`}
          >
            {i}
          </button>
        ))}
        {data?.engine && (
          <span className="ml-auto text-xs text-[var(--accent)]">engine: {data.engine}</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface">
          <p className="text-xs text-[var(--muted-fg)]">Auto-picker avg WAPE</p>
          <p className="mt-2 font-display text-2xl font-bold text-[var(--accent)]">
            {loading ? "…" : autoRow ? `${autoRow.avg_wape}%` : "—"}
          </p>
        </div>
        <div className="card-surface">
          <p className="text-xs text-[var(--muted-fg)]">SKUs backtested</p>
          <p className="mt-2 font-display text-2xl font-bold">{loading ? "…" : autoRow?.sku_count ?? "—"}</p>
        </div>
        <div className="card-surface">
          <p className="text-xs text-[var(--muted-fg)]">Holdout weeks</p>
          <p className="mt-2 font-display text-2xl font-bold">{data?.holdout_weeks ?? 8}</p>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Model leaderboard (lower WAPE is better)</h3>
        {loading ? (
          <p className="mt-2 text-sm text-[var(--muted-fg)]">Running backtests…</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Avg WAPE</th>
                  <th className="px-3 py-2">SKUs</th>
                </tr>
              </thead>
              <tbody>
                {(data?.leaderboard ?? []).map((row) => (
                  <tr key={row.model} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{row.model}</td>
                    <td className="px-3 py-2">{row.avg_wape}%</td>
                    <td className="px-3 py-2">{row.sku_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">SKU × model detail</h3>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[var(--muted)]">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">WAPE</th>
                <th className="px-3 py-2">MAPE</th>
                <th className="px-3 py-2">Selected</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).slice(0, 40).map((row, i) => (
                <tr key={`${row.sku_id}-${row.model}-${i}`} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{row.sku_id}</td>
                  <td className="px-3 py-2">{row.model}</td>
                  <td className="px-3 py-2">{row.error ? "err" : row.wape != null ? `${row.wape}%` : "—"}</td>
                  <td className="px-3 py-2">{row.mape != null ? `${row.mape}%` : "—"}</td>
                  <td className="px-3 py-2">{row.model_selected ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold">Rollout phases</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {MODEL_PHASES.map((p) => (
            <li key={p.phase} className="card-surface text-sm">
              <span className="font-semibold text-[var(--accent)]">{p.phase}</span>
              <span className="text-[var(--muted-fg)]"> — {p.models}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
