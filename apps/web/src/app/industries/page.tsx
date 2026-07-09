import type { Metadata } from "next";
import { CtaBand } from "@/components/Marketing";
import { INDUSTRIES } from "@/lib/product/catalog";

export const metadata: Metadata = {
  title: "Industries",
};

const VERTICAL_NOTES = [
  {
    name: "MedTech / Pharma",
    focus: "FEFO, cold chain, lot traceability, hospital OTIF",
  },
  {
    name: "FMCG / CPG",
    focus: "Promo demand, fill rates, secondary distribution, ePOD",
  },
  {
    name: "Automotive",
    focus: "JIT inbound, production sequencing, OEM OTIF",
  },
  {
    name: "Cement & Building",
    focus: "Plant dispatch windows, fleet utilisation, return empties",
  },
  {
    name: "Energy & Oil/Gas",
    focus: "Route compliance, detention, hazardous compliance",
  },
  {
    name: "Logistics & 3PL",
    focus: "Multi-client control tower, SLA scorecards, settlement",
  },
];

export default function IndustriesPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">Industries served</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            Every industry moves differently.{" "}
            <span className="text-[var(--accent)]">Sarvam moves with them.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            Cement dispatch windows, automotive JIT precision, FMCG shelf-life constraints, pharma
            compliance — each sector has its own operational logic. Sarvam is configured to work
            within it, not around it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">The common thread</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          Fragmented visibility. Reactive decisions. Margins lost to delays that were predictable.
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
          Yugam replaces that with a single orchestration intelligence layer — one that sees the
          entire supply chain in motion, anticipates failure before it happens, and moves your
          operation with certainty.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERTICAL_NOTES.map((v) => (
            <article key={v.name} className="card-surface">
              <h3 className="font-display text-lg font-bold">{v.name}</h3>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{v.focus}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <span
              key={i}
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-fg)]"
            >
              {i}
            </span>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
