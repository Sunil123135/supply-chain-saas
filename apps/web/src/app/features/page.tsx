"use client";

import { PAIN_MAP, statusLabel } from "@/lib/painMap";

const STATUS_ORDER = ["live", "partial", "data_only", "planned"] as const;

export default function FeaturesPage() {
  const counts = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = PAIN_MAP.filter((p) => p.status === s).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Product truth</p>
      <h1 className="mt-2 text-3xl font-bold">Pain points vs Yugam</h1>
      <p className="mt-2 max-w-3xl text-zinc-400">
        Intel validated <strong className="text-zinc-200">34 of 42</strong> V1 pains from 1,048 YouTube
        sources. This table shows what is actually built today versus roadmap — not marketing claims.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{counts[s]}</p>
            <p className="text-xs text-zinc-500">{statusLabel(s)}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--muted)] text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Pain</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">How Yugam addresses it</th>
              <th className="px-4 py-3">Phase</th>
            </tr>
          </thead>
          <tbody>
            {PAIN_MAP.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 text-zinc-500">{p.id}</td>
                <td className="px-4 py-3 font-mono text-emerald-400">{p.module}</td>
                <td className="px-4 py-3">{p.pain}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      p.status === "live"
                        ? "text-emerald-300"
                        : p.status === "partial"
                          ? "text-amber-300"
                          : p.status === "data_only"
                            ? "text-sky-300"
                            : "text-zinc-500"
                    }
                  >
                    {statusLabel(p.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.how}</td>
                <td className="px-4 py-3 text-zinc-500">{p.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
