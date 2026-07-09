import type { Metadata } from "next";
import { CtaBand } from "@/components/Marketing";

export const metadata: Metadata = {
  title: "Case Studies",
};

const CASES = [
  {
    sector: "Telecom",
    title: "Cut route kilometres by 30%, accelerated beat planning by 80%",
    result: "98%+ on-time site execution with diesel logistics orchestration.",
  },
  {
    sector: "Manufacturing",
    title: "Scenario-driven demand forecasting & S&OP consensus",
    result: "~30% forecast accuracy lift, 22% less excess inventory, 3× faster S&OP.",
  },
  {
    sector: "Automotive",
    title: "Real-time outbound visibility & route optimisation",
    result: "15% fewer km per delivery, +12% OTIF, ~60% fewer route deviations.",
  },
  {
    sector: "Oil & Gas",
    title: "National LPG distributor route compliance",
    result: "95%+ route compliance, 60–70% less vehicle detention.",
  },
  {
    sector: "Automotive",
    title: "Constraint-aware production planning",
    result: "Machine util. 63% → 92%, OEM OTIF 97%, planning in minutes.",
  },
  {
    sector: "FMCG",
    title: "End-to-end distribution visibility",
    result: "100% shipment visibility, digital POD, real-time exception alerts.",
  },
  {
    sector: "FMCG",
    title: "National freight decision control",
    result: "5% logistics cost ↓, 10–15% better vehicle fill rates.",
  },
  {
    sector: "D2C Health",
    title: "Demand-driven replenishment",
    result: "60–70% fewer stockouts, 25–30% lower holding cost.",
  },
  {
    sector: "Cement",
    title: "Unified outbound, in-plant, and return ops",
    result: "25–35% less coordination effort, 30–40% faster decisions.",
  },
  {
    sector: "Automotive OEM",
    title: "AI-powered inbound dispatch",
    result: "11% inbound freight ↓, +12% fill rate, 10× faster monthly planning.",
  },
];

export default function CaseStudiesPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">Case studies</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            Real outcomes, real operations
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            Illustrative outcomes across automotive, FMCG, cement, pharma and beyond — reducing
            costs and accelerating operations with autonomous supply chain orchestration via Sarvam.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {CASES.map((c) => (
            <article key={c.title} className="card-surface">
              <p className="text-xs text-[var(--accent)]">{c.sector}</p>
              <h2 className="mt-2 font-display text-lg font-bold">{c.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{c.result}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
