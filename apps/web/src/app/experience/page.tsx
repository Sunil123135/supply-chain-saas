"use client";

import Link from "next/link";
import { useState } from "react";
import { MODULES, PILLARS } from "@/lib/product/catalog";

const STEPS = [
  {
    id: "start",
    label: "Start",
    title: "Welcome to the Yugam Experience",
    body: "Walk the intelligence layer from sensing to settlement. Sarvam orchestrates every decision over your ERP, TMS, and WMS.",
  },
  {
    id: "about",
    label: "About",
    title: "Layer, don't replace",
    body: "Yugam is an agentic intelligence layer — not another rip-and-replace suite. Start with one module. Scale when ready.",
  },
  {
    id: "sc-planning",
    label: "Supply Chain Planning",
    title: "Predict with confidence",
    body: "Demand forecasting, scenarios, inventory, capacity, and production — five predict modules under Sarvam.",
  },
  {
    id: "log-planning",
    label: "Logistics Planning",
    title: "Plan every constraint at once",
    body: "Warehouse, dispatch, 3D load building, and fleet sizing composed in real time.",
  },
  {
    id: "log-exec",
    label: "Logistics Execution",
    title: "Execute with visibility",
    body: "RFQ, control tower, ETA, risk, ePOD, and freight settlement — exceptions handled, invoices reconciled.",
  },
  {
    id: "end",
    label: "End",
    title: "Ready to orchestrate?",
    body: "Open the product app, talk to Sarvam, or book a tailored simulation with our team.",
  },
] as const;

export default function ExperiencePage() {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx]!;

  const pillarModules =
    step.id === "sc-planning"
      ? MODULES.filter((m) => m.pillar === "predict")
      : step.id === "log-planning"
        ? MODULES.filter((m) => m.pillar === "plan")
        : step.id === "log-exec"
          ? MODULES.filter((m) => m.pillar === "execute")
          : [];

  return (
    <main className="min-h-[70vh]">
      <div className="border-b border-[var(--border)] bg-[var(--muted)]/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                i === idx
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--border)] text-[var(--muted-fg)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <section className="hero-glow mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">
          The Experience · {idx + 1}/{STEPS.length}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold">{step.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted-fg)]">{step.body}</p>

        {step.id === "about" && (
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.id} className="card-surface">
                <p className="font-semibold text-[var(--accent)]">{p.label}</p>
                <p className="mt-2 text-sm text-[var(--muted-fg)]">{p.blurb}</p>
              </div>
            ))}
          </div>
        )}

        {pillarModules.length > 0 && (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pillarModules.map((m) => (
              <Link
                key={m.slug}
                href={`/solutions/${m.slug}`}
                className="card-surface hover:border-[var(--accent)]"
              >
                <p className="text-xs text-[var(--accent)]">{m.status}</p>
                <p className="mt-1 font-semibold">{m.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{m.tagline}</p>
              </Link>
            ))}
          </div>
        )}

        {step.id === "end" && (
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/app/sarvam" className="btn-primary">
              Talk to Sarvam
            </Link>
            <Link href="/app" className="btn-secondary">
              Open product app
            </Link>
            <Link href="/contact" className="btn-secondary">
              Book a Demo
            </Link>
          </div>
        )}

        <div className="mt-12 flex gap-3">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="btn-secondary disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={idx === STEPS.length - 1}
            onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
            className="btn-primary disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}
