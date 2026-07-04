"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface PackStats {
  skuCount: number;
  lotCount: number;
  demandRows: number;
  orderCount: number;
  shipmentCount: number;
  nodeCount: number;
  nearExpiryLots: number;
}

interface AutoData {
  industries: {
    medtech: PackStats;
    cpg: PackStats;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<AutoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data/auto")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() =>
        fetch("/bundled-stats.json")
          .then((r) => r.json())
          .then(setData)
          .catch(() => setError("Failed to load industry data")),
      );
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">P1 — Control tower</p>
      <h1 className="mt-2 text-3xl font-bold">Live data (auto-loaded)</h1>
      <p className="mt-2 text-zinc-400">
        No upload required. Yugam reads MedTech + India FMCG starter packs from the server on every
        request.
      </p>

      {error && <p className="mt-6 text-amber-300">{error}</p>}

      {data && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {(["medtech", "cpg"] as const).map((key) => {
            const s = data.industries[key];
            const title = key === "medtech" ? "MedTech / Devices" : "India CPG / FMCG";
            return (
              <section
                key={key}
                className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6"
              >
                <h2 className="text-lg font-semibold text-emerald-400">{title}</h2>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span>SKUs</span>
                    <span>{s.skuCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Lots / inventory rows</span>
                    <span>{s.lotCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Demand history rows</span>
                    <span>{s.demandRows.toLocaleString()}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Open orders</span>
                    <span>{s.orderCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Shipments</span>
                    <span>{s.shipmentCount}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Nodes</span>
                    <span>{s.nodeCount}</span>
                  </li>
                  <li className="flex justify-between text-amber-300">
                    <span>Near-expiry lots (60d)</span>
                    <span>{s.nearExpiryLots}</span>
                  </li>
                </ul>
                <Link
                  href={`/api/data/auto?industry=${key}`}
                  className="mt-4 inline-block text-xs text-emerald-400 hover:underline"
                >
                  View JSON sample →
                </Link>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-10 flex gap-4 text-sm">
        <Link href="/copilot" className="text-emerald-400 hover:underline">
          Copilot →
        </Link>
        <Link href="/" className="text-zinc-400 hover:underline">
          Home
        </Link>
      </div>
    </main>
  );
}
