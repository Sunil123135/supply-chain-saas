"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AGENTS } from "@/lib/product/catalog";

const PERSONAS = [
  {
    title: "Supply Chain Planner",
    agents: ["AI-Demand Analyst", "AI-Inventory Strategist", "AI-Scenario Planner"],
    modules: "Inventory · Demand · Scenarios",
  },
  {
    title: "Warehouse Manager",
    agents: ["AI-Warehouse Orchestrator", "AI-POD Validator"],
    modules: "Warehouse · ePOD",
  },
  {
    title: "Logistics & Transport",
    agents: ["AI-Dispatch Planner", "AI-Fleet Strategist", "AI-Load Builder", "AI-Visibility Controller"],
    modules: "Dispatch · Fleet · Load · Visibility",
  },
  {
    title: "Procurement",
    agents: ["AI-Sourcing Strategist", "AI-Settlement Auditor"],
    modules: "RFQ · Freight Settlement",
  },
];

export default function TransformationPage() {
  const [selected, setSelected] = useState(AGENTS[0]!.id);
  const agent = useMemo(() => AGENTS.find((a) => a.id === selected) ?? AGENTS[0]!, [selected]);

  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">Powered by Yugam</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            Supply Chain <span className="text-[var(--accent)]">AI-Workforce</span> Orchestration.
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            The AI decisioning & intelligence layer over your existing TMS, WMS, and ERP — forecast,
            plan, dispatch, monitor, reconcile. One platform. An AI-Workforce for every
            production-grade role. Orchestrated by Sarvam.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app" className="btn-primary">
              Explore the platform
            </Link>
            <Link href="/sarvam" className="btn-secondary">
              Meet Sarvam
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
            {[
              ["100+", "Enterprise-ready"],
              ["25%", "CapEx reduction"],
              ["12%", "Logistics cost ↓"],
              ["3–5%", "Leakage recovered"],
            ].map(([n, l]) => (
              <div key={l} className="card-surface text-center">
                <p className="font-display text-xl font-bold text-[var(--accent)]">{n}</p>
                <p className="text-[10px] text-[var(--muted-fg)]">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">03 · AI-Workforce range</p>
        <h2 className="mt-3 font-display text-3xl font-bold">Select any role to open its brief</h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelected(a.id)}
                className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                  selected === a.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]"
                }`}
              >
                <span className="block text-[10px] uppercase opacity-70">{a.domain}</span>
                {a.name}
              </button>
            ))}
          </div>
          <aside className="card-surface h-fit">
            <p className="text-xs text-[var(--accent)]">{agent.domain}</p>
            <h3 className="mt-2 font-display text-xl font-bold">{agent.name}</h3>
            <p className="mt-1 text-sm font-medium">{agent.role}</p>
            <p className="mt-3 text-sm text-[var(--muted-fg)]">{agent.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase text-[var(--muted-fg)]">Try asking</p>
            <ul className="mt-2 space-y-2 text-xs text-[var(--muted-fg)]">
              {agent.samplePrompts.map((p) => (
                <li key={p} className="rounded-lg bg-[var(--muted)] px-3 py-2">
                  “{p}”
                </li>
              ))}
            </ul>
            <Link href="/app/sarvam" className="btn-primary mt-6 w-full">
              Ask Sarvam
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">08 · Built for every role</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Four roles. One AI-Workforce.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {PERSONAS.map((p) => (
              <article key={p.title} className="card-surface">
                <h3 className="font-display text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-xs text-[var(--muted-fg)]">Works with</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.agents.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] text-[var(--accent)]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--muted-fg)]">{p.modules}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">09 · What&apos;s next</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          From today to cumulative savings = program cost in under four months.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              w: "Week 1–2",
              t: "Setup",
              items: [
                "Workflow mapping with planners + ops",
                "ERP / WMS / TMS connectors stood up",
                "Historical data loaded · baselines",
                "2–3 pilot use cases with exit criteria",
              ],
            },
            {
              w: "Week 3–6",
              t: "Pilot",
              items: [
                "Sarvam live in chat / Teams / WhatsApp",
                "Plans on your real daily volumes",
                "Side-by-side vs manual plan",
                "Weekly review — models tuned to overrides",
              ],
            },
            {
              w: "Week 7–12",
              t: "Scale",
              items: [
                "Roll out next persona",
                "Add adjacent modules",
                "KPIs locked for CFO dashboard",
                "Full deployment authorised",
              ],
            },
          ].map((s) => (
            <article key={s.t} className="card-surface">
              <p className="text-xs text-[var(--accent)]">{s.w}</p>
              <h3 className="mt-2 font-display text-xl font-bold">{s.t}</h3>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted-fg)]">
                {s.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
