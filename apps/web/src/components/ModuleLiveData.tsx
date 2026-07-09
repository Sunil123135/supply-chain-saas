"use client";

import { useEffect, useState } from "react";

interface Props {
  slug: string;
  fallbackKpis: { label: string; value: string }[];
}

export function ModuleLiveData({ slug, fallbackKpis }: Props) {
  const [data, setData] = useState<{
    summary?: string;
    engine?: string;
    kpis?: { label: string; value: string }[];
    rows?: Record<string, unknown>[];
    message?: string;
  } | null>(null);
  const [industry, setIndustry] = useState<"medtech" | "cpg">("medtech");

  useEffect(() => {
    fetch(`/api/modules/${slug}?industry=${industry}`)
      .then((r) => r.json())
      .then((json) => {
        const kpis: { label: string; value: string }[] = [...fallbackKpis];
        if (slug === "inventory-optimisation" && json.data?.summary) {
          const s = json.data.summary;
          kpis[0] = { label: "Critical lots", value: String(s.critical) };
          kpis[1] = { label: "High priority", value: String(s.high) };
          kpis[2] = { label: "Exposure ₹", value: s.exposureInr?.toLocaleString() ?? "—" };
        }
        if (slug === "freight-settlement" && json.data?.audit) {
          const a = json.data.audit;
          kpis[0] = { label: "Overbilled", value: String(a.overbilled) };
          kpis[1] = { label: "Recoverable ₹", value: a.recoverableInr?.toLocaleString() ?? "—" };
          kpis[2] = { label: "Leakage %", value: `${a.leakagePct}%` };
        }
        setData({
          summary: json.summary,
          engine: json.engine,
          kpis,
          rows:
            json.data?.queue?.slice(0, 8) ??
            json.data?.audit?.disputes?.slice(0, 8) ??
            json.data?.forecasts?.slice(0, 8),
          message: json.message,
        });
      })
      .catch(() => setData({ message: "Failed to load live module data" }));
  }, [slug, industry, fallbackKpis]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["medtech", "cpg"] as const).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndustry(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              industry === i
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)]"
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
        {(data?.kpis ?? fallbackKpis).map((k) => (
          <div key={k.label} className="card-surface">
            <p className="text-xs text-[var(--muted-fg)]">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--accent)]">{k.value}</p>
          </div>
        ))}
      </div>

      {data?.summary && (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">{data.summary}</p>
      )}
      {data?.message && !data.summary && (
        <p className="mt-4 text-sm text-[var(--muted-fg)]">{data.message}</p>
      )}

      {data?.rows && data.rows.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[var(--muted)]">
              <tr>
                {Object.keys(data.rows[0]!).map((h) => (
                  <th key={h} className="px-3 py-2 capitalize">
                    {h.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-3 py-2">
                      {Array.isArray(v) ? v.join(", ") : String(v ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
