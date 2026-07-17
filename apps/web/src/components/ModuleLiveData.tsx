"use client";

import { useEffect, useState } from "react";

interface Props {
  slug: string;
  fallbackKpis: { label: string; value: string }[];
}

function asKpis(
  slug: string,
  json: Record<string, unknown>,
  fallback: { label: string; value: string }[],
): { label: string; value: string }[] {
  const kpis = [...fallback];
  const data = json.data as Record<string, unknown> | undefined;
  if (!data) return kpis;

  if (slug === "inventory-optimisation" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Critical lots", value: String(s.critical) };
    kpis[1] = { label: "High priority", value: String(s.high) };
    kpis[2] = { label: "Exposure ₹", value: s.exposureInr?.toLocaleString() ?? "—" };
  }
  if (slug === "freight-settlement") {
    const a = (data.audit as Record<string, number> | undefined) ?? (data as Record<string, number>);
    if (a.overbilled != null) {
      kpis[0] = { label: "Overbilled", value: String(a.overbilled) };
      kpis[1] = { label: "Recoverable ₹", value: a.recoverableInr?.toLocaleString() ?? "—" };
      kpis[2] = { label: "Leakage %", value: `${a.leakagePct}%` };
    }
  }
  if (slug === "control-tower" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Exceptions", value: String(s.openExceptions) };
    kpis[1] = { label: "Critical", value: String(s.critical) };
    kpis[2] = { label: "Shipments", value: String(s.shipmentCount) };
  }
  if (slug === "dispatch-planning" && data.avgFillRate != null) {
    kpis[0] = { label: "Avg fill %", value: String(data.avgFillRate) };
    kpis[1] = {
      label: "Underfilled",
      value: String((data.underfilled as unknown[] | undefined)?.length ?? 0),
    };
  }
  if (slug === "rough-cut-capacity" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Avg util %", value: String(s.avgUtilPct) };
    kpis[1] = { label: "Overload weeks", value: String(s.overloadWeeks) };
    kpis[2] = { label: "Plants", value: String(s.plantCount) };
  }
  if (slug === "production-planning" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "SKUs planned", value: String(s.skusPlanned) };
    kpis[1] = { label: "High priority", value: String(s.highPriority) };
    kpis[2] = { label: "Planned qty", value: String(s.totalPlannedQty) };
  }
  if (slug === "warehouse-planning" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Hot docks", value: String(s.hotNodes) };
    kpis[1] = { label: "Loads", value: String(s.totalLoads) };
    kpis[2] = { label: "Warehouses", value: String(s.warehouseCount) };
  }
  if (slug === "3d-load-building" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Loads", value: String(s.loads) };
    kpis[1] = { label: "Avg fill %", value: String(s.avgFillPct) };
    kpis[2] = { label: "Lines packed", value: String(s.linesPacked) };
  }
  if (slug === "fleet-sizing" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Vehicle types", value: String(s.vehicleTypes) };
    kpis[1] = { label: "Trips", value: String(s.totalTrips) };
    kpis[2] = { label: "Consolidate", value: String(s.consolidateCandidates) };
  }
  if (slug === "rfq-bidding" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "RFQs", value: String(s.rfqs) };
    kpis[1] = { label: "Savings ₹", value: s.estimatedSavingsInr?.toLocaleString() ?? "—" };
  }
  if (slug === "eta-prediction" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "On time", value: String(s.onTime) };
    kpis[1] = { label: "At risk", value: String(s.atRisk) };
    kpis[2] = { label: "Late", value: String(s.late) };
  }
  if (slug === "epod" && data.summary) {
    const s = data.summary as Record<string, number>;
    kpis[0] = { label: "Blockers", value: String(s.blockers) };
    kpis[1] = { label: "POD ready", value: String(s.podReady) };
    kpis[2] = { label: "Reviewed", value: String(s.reviewed) };
  }
  if (slug === "risk-management" && data.count != null) {
    kpis[0] = { label: "Active risks", value: String(data.count) };
  }
  if (slug === "scenario-modelling" && data.base != null) {
    kpis[0] = { label: "Base", value: String(data.base) };
    kpis[1] = { label: "Upside", value: String(data.upside) };
    kpis[2] = { label: "Downside", value: String(data.downside) };
  }
  return kpis;
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
        const payload = json.data as Record<string, unknown> | undefined;
        const rows =
          (payload?.queue as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.exceptions as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.risks as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.disputes as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.weeks as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.plan as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.loads as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.etas as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.checks as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.mix as Record<string, unknown>[] | undefined)?.slice(0, 8) ??
          (payload?.lanes as Record<string, unknown>[] | undefined)?.slice(0, 8);

        setData({
          summary: json.summary,
          engine: json.engine,
          kpis: asKpis(slug, json, fallbackKpis),
          rows,
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
                      {Array.isArray(v)
                        ? v.join(", ")
                        : typeof v === "object" && v !== null
                          ? JSON.stringify(v)
                          : String(v ?? "")}
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
