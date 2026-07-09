import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Marketing";
import { PIPELINE_STAGES } from "@/lib/product/catalog";

export const metadata: Metadata = {
  title: "Technology & AI",
};

export default function TechnologyPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">AI-native intelligence layer</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            Engineered to reason.{" "}
            <span className="text-[var(--accent)]">Tuned to decide. Built to execute.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            A purpose-built stack of models, causal reasoning, and autonomous execution loops —
            designed for the decisions supply chains can&apos;t wait for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/sarvam" className="btn-primary">
              Meet Sarvam
            </Link>
            <Link href="/contact" className="btn-secondary">
              Book a walkthrough
            </Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
            {[
              ["12+", "Proprietary models"],
              ["Sub-sec", "Reasoning"],
              ["Continuous", "Learning"],
            ].map(([n, l]) => (
              <div key={l} className="card-surface text-center">
                <p className="font-display text-xl font-bold text-[var(--accent)]">{n}</p>
                <p className="mt-1 text-[10px] text-[var(--muted-fg)]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-3xl font-bold">
          Demand sensing, planning, orchestration, resilience, and autonomous execution — unified
          through Sarvam.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {PIPELINE_STAGES.map((s) => (
            <article key={s.step} className="card-surface">
              <p className="text-xs text-[var(--accent)]">
                {s.step} {s.title}
              </p>
              <h3 className="mt-2 font-semibold">{s.subtitle}</h3>
              <ul className="mt-4 space-y-1 text-xs text-[var(--muted-fg)]">
                {s.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">How Sarvam thinks</p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Reasoning that ships with the receipts.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                t: "Multi-objective optimisation",
                d: "Cost, service, risk, carbon — weighed simultaneously on a live Pareto frontier.",
              },
              {
                t: "Causal reasoning + confidence",
                d: "Every output carries a confidence score and readable chain of reasoning. Low-confidence routes to humans.",
              },
              {
                t: "Continuous feedback loop",
                d: "Every executed decision becomes training data. Every deviation retrains the model.",
              },
              {
                t: "Autonomous execution",
                d: "Agents close the loop end-to-end. Teams supervise exceptions, not routines.",
              },
            ].map((x, i) => (
              <article key={x.t} className="card-surface">
                <p className="text-xs text-[var(--accent)]">0{i + 1}</p>
                <h3 className="mt-2 font-display text-xl font-bold">{x.t}</h3>
                <p className="mt-2 text-sm text-[var(--muted-fg)]">{x.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">AI governance · explainability & trust</p>
        <h2 className="mt-3 font-display text-3xl font-bold">Autonomous, not opaque.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Decision audit trails", "Inputs, weights, rationale, outcome — immutable and exportable."],
            ["Confidence thresholds", "Low-confidence decisions pause for human review."],
            ["Explainable outputs", "Natural-language rationales alongside every agent action."],
            ["Model governance", "Versioned models, drift detection, shadow mode, rollback."],
          ].map(([t, d]) => (
            <div key={t} className="card-surface">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-xs text-[var(--muted-fg)]">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-[var(--muted-fg)]">
          SOC 2 Type II path · ISO 27001 path · GDPR-aligned · Customer-managed keys available
        </p>
      </section>

      <CtaBand />
    </main>
  );
}
