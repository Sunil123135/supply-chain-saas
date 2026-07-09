import Link from "next/link";
import type { ProductModule } from "@/lib/product/catalog";

export function ModuleCard({ module }: { module: ProductModule }) {
  return (
    <Link
      href={`/solutions/${module.slug}`}
      className="card-surface group block transition hover:border-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {module.pillar}
        </p>
        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--accent)]">
          {module.status}
        </span>
      </div>
      <h3 className="mt-2 font-display text-lg font-bold group-hover:text-[var(--accent)]">
        {module.name}
      </h3>
      <p className="mt-1 text-sm text-[var(--muted-fg)]">{module.tagline}</p>
      <ul className="mt-4 space-y-1.5 text-xs text-[var(--muted-fg)]">
        {module.bullets.slice(0, 3).map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-[var(--accent)]">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs font-semibold text-[var(--accent)]">Explore →</p>
    </Link>
  );
}

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="card-surface hero-glow overflow-hidden">
        <p className="section-eyebrow">Your next step</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to put an intelligence layer over your supply chain?
        </h2>
        <p className="mt-4 max-w-xl text-[var(--muted-fg)]">
          Your TMS, WMS, and ERP — unified, orchestrated, and decision-ready. Act through chat or
          voice with Sarvam. Without ripping out a thing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className="btn-primary">
            Talk to Sales
          </Link>
          <Link href="/experience" className="btn-secondary">
            Enter the Experience
          </Link>
          <Link href="/app/sarvam" className="btn-secondary">
            Talk to Sarvam
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ComparisonTable({
  rows,
}: {
  rows: { capability: string; yugam: string; suites: string; tpl: string }[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--muted)] text-xs uppercase tracking-wider text-[var(--muted-fg)]">
          <tr>
            <th className="px-4 py-3">Capability</th>
            <th className="px-4 py-3 text-[var(--accent)]">Yugam</th>
            <th className="px-4 py-3">Suites</th>
            <th className="px-4 py-3">3PLs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.capability} className="border-t border-[var(--border)]">
              <td className="px-4 py-3 font-medium">{r.capability}</td>
              <td className="px-4 py-3 text-[var(--accent)]">{r.yugam}</td>
              <td className="px-4 py-3 text-[var(--muted-fg)]">{r.suites}</td>
              <td className="px-4 py-3 text-[var(--muted-fg)]">{r.tpl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
