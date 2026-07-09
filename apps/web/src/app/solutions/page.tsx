import type { Metadata } from "next";
import Link from "next/link";
import { ComparisonTable, CtaBand, ModuleCard } from "@/components/Marketing";
import { COMPARISON_ROWS, MODULES, PILLARS, modulesByPillar } from "@/lib/product/catalog";

export const metadata: Metadata = {
  title: "Solutions — Predict · Plan · Execute",
};

export default function SolutionsPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">Solutions</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            One intelligence layer, every supply-chain decision.
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            From forecasting and capacity planning to dispatch, delivery, and settlement — browse
            the full catalogue across Predict, Plan, and Execute. Orchestrated by Sarvam.
          </p>
        </div>
      </section>

      {PILLARS.map((pillar) => (
        <section key={pillar.id} id={pillar.id} className="mx-auto max-w-6xl scroll-mt-24 px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-eyebrow">
                {pillar.id === "predict" ? "01" : pillar.id === "plan" ? "02" : "03"} · {pillar.label}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold">{pillar.label}</h2>
              <p className="mt-2 max-w-xl text-[var(--muted-fg)]">{pillar.blurb}</p>
            </div>
            <Link href="/app" className="text-sm font-semibold text-[var(--accent)]">
              Open in app →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulesByPillar(pillar.id).map((m) => (
              <ModuleCard key={m.slug} module={m} />
            ))}
          </div>
        </section>
      ))}

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">Layer, don&apos;t replace</p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Orchestrate one workflow. Or the entire supply chain.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            {MODULES.length} modules. Start with the one that hurts most today.
          </p>
          <div className="mt-10">
            <ComparisonTable rows={COMPARISON_ROWS} />
          </div>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
