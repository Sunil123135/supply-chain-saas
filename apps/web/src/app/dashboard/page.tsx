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

interface LiveOps {
  medtech?: { fefo?: { summary?: { critical: number; exposureInr: number } }; freight?: { audit?: { recoverableInr: number; leakagePct: number } } };
  cpg?: { fefo?: { summary?: { critical: number; exposureInr: number } }; freight?: { audit?: { recoverableInr: number; leakagePct: number } } };
}

export default function DashboardPage() {
  const [data, setData] = useState<AutoData | null>(null);
  const [live, setLive] = useState<LiveOps>({});
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

    (["medtech", "cpg"] as const).forEach(async (ind) => {
      const [fefo, freight] = await Promise.all([
        fetch(`/api/modules/inventory/fefo?industry=${ind}`).then((r) => r.json()),
        fetch(`/api/modules/freight/audit?industry=${ind}`).then((r) => r.json()),
      ]);
      setLive((prev) => ({
        ...prev,
        [ind]: { fefo, freight },
      }));
    });
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="section-eyebrow">Execute · Control Tower</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Live data (auto-loaded)</h1>
      <p className="mt-2 text-[var(--muted-fg)]">
        No upload required. Sarvam&apos;s visibility layer reads MedTech + India FMCG starter packs
        from the server on every request.{" "}
        <Link href="/app/sarvam" className="text-[var(--accent)]">
          Ask Sarvam
        </Link>
        {" · "}
        <Link href="/app/modules/control-tower" className="text-[var(--accent)]">
          Module workspace
        </Link>
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
                  {live[key]?.fefo?.summary && (
                    <li className="flex justify-between text-[var(--accent)]">
                      <span>FEFO critical (math)</span>
                      <span>{live[key].fefo.summary.critical}</span>
                    </li>
                  )}
                  {live[key]?.freight?.audit && (
                    <li className="flex justify-between text-[var(--accent)]">
                      <span>Freight recoverable ₹</span>
                      <span>{live[key].freight.audit.recoverableInr.toLocaleString()}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <Link href={`/app/modules/inventory-optimisation`} className="text-[var(--accent)]">
                    FEFO workspace →
                  </Link>
                  <Link href={`/app/modules/freight-settlement`} className="text-[var(--accent)]">
                    Freight audit →
                  </Link>
                </div>
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
