import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Marketing";
import { AGENTS } from "@/lib/product/catalog";

export const metadata: Metadata = {
  title: "Sarvam AI — Conversational Orchestrator",
};

export default function SarvamPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">Sarvam AI</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            Your AI co-pilot for supply chain orchestration.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--muted-fg)]">
            Sarvam is the conversational layer on Yugam&apos;s intelligence stack — the way to
            orchestrate decisions across the systems you already run. Ask in chat or voice. Every
            decision connected.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app/sarvam" className="btn-primary">
              Talk to Sarvam
            </Link>
            <Link href="/contact" className="btn-secondary">
              Talk to Sales
            </Link>
            <Link href="/experience" className="btn-secondary">
              Enter the Experience
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Platform architecture</p>
        <h2 className="mt-3 font-display text-3xl font-bold">One layer to orchestrate it all</h2>
        <p className="mt-3 max-w-2xl text-[var(--muted-fg)]">
          Sarvam sits between your existing systems and your teams — connecting ERPs, TMS, WMS, and
          carrier networks into a single intelligent layer.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="card-surface">
            <p className="text-xs font-semibold uppercase text-[var(--muted-fg)]">Existing systems</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["ERP", "TMS", "WMS", "Carriers", "IoT"].map((x) => (
                <li key={x} className="rounded-lg bg-[var(--muted)] px-3 py-2">
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-surface border-[var(--accent)] ring-1 ring-[var(--accent)]/20">
            <p className="text-xs font-semibold uppercase text-[var(--accent)]">Sarvam layer</p>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Supply Chain Planning",
                "Logistics Execution",
                "Real-Time Visibility",
                "Decision audit trails",
                "Confidence thresholds",
              ].map((x) => (
                <li key={x} className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[var(--accent)]">
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-surface">
            <p className="text-xs font-semibold uppercase text-[var(--muted-fg)]">Your teams</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Planners", "Dispatchers", "Managers", "Procurement", "Warehouse"].map((x) => (
                <li key={x} className="rounded-lg bg-[var(--muted)] px-3 py-2">
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">Integrations</p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Connects to everything you already use
          </h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Slack",
              "Microsoft Teams",
              "Google Workspace",
              "Outlook",
              "SAP",
              "Salesforce",
              "Oracle",
              "Power BI",
              "AWS",
              "WhatsApp",
            ].map((n) => (
              <span
                key={n}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">AI-Workforce</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          {AGENTS.length} specialist agents under one orchestrator
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <div key={a.id} className="card-surface">
              <p className="text-[10px] uppercase tracking-wider text-[var(--accent)]">{a.domain}</p>
              <h3 className="mt-1 text-sm font-bold">{a.name}</h3>
              <p className="mt-2 text-xs text-[var(--muted-fg)]">{a.role}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
