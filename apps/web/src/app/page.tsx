import Link from "next/link";
import { ComparisonTable, CtaBand, ModuleCard } from "@/components/Marketing";
import {
  COMPARISON_ROWS,
  MODULES,
  OUTCOMES,
  PILLARS,
} from "@/lib/product/catalog";

const CAPABILITY_CHIPS = MODULES.map((m) => m.name);

const ERP_QUESTIONS = [
  "Which plant should absorb tomorrow's demand spike?",
  "Which shipment should be delayed?",
  "Which supplier should receive tomorrow's PO?",
  "Which inventory should move tonight?",
  "Which carrier should I award?",
  "Which invoice shouldn't I pay?",
];

export default function HomePage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
          <p className="section-eyebrow">The AI Operating System for Autonomous Supply Chains</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            The broadest AI suite in supply chain.{" "}
            <span className="text-[var(--accent)]">Every domain. Covered.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--muted-fg)]">
            <strong className="text-[var(--foreground)]">Sarvam</strong> senses, thinks, decides and
            acts across your entire chain — running over your ERP, TMS and WMS. Chat or voice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary">
              Book a Demo
            </Link>
            <Link href="/solutions" className="btn-secondary">
              What we do for your Supply Chain
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {CAPABILITY_CHIPS.slice(0, 10).map((c) => (
              <span
                key={c}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] text-[var(--muted-fg)]"
              >
                {c}
              </span>
            ))}
            <span className="rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-1 text-[11px] text-[var(--accent)]">
              +{CAPABILITY_CHIPS.length - 10} more
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Trusted at production scale</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold">
          Enterprises orchestrate supply chain on Yugam&apos;s intelligence layer.
        </h2>
        <p className="mt-3 text-[var(--muted-fg)]">
          Manufacturing · FMCG · Automotive · Chemicals · Logistics · Energy · MedTech
        </p>
        <div className="mt-8 grid grid-cols-3 gap-4 sm:max-w-lg">
          {[
            ["100+", "Enterprises ready"],
            ["15", "Native modules"],
            ["19", "AI-Workforce agents"],
          ].map(([n, l]) => (
            <div key={l} className="card-surface text-center">
              <p className="font-display text-2xl font-bold text-[var(--accent)]">{n}</p>
              <p className="mt-1 text-xs text-[var(--muted-fg)]">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">The next generation of enterprise software</p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Every decade rebuilt the stack. This one makes it autonomous.
          </h2>
          <ol className="mt-10 grid gap-3 sm:grid-cols-5">
            {[
              ["1980", "ERP"],
              ["2005", "Planning Suites"],
              ["2015", "Control Towers"],
              ["2025", "AI Copilots"],
              ["NOW", "Autonomous OS · Yugam"],
            ].map(([y, t], i) => (
              <li
                key={y}
                className={`card-surface ${i === 4 ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30" : ""}`}
              >
                <p className="text-xs text-[var(--accent)]">{y}</p>
                <p className="mt-2 text-sm font-semibold">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">The full picture</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          Transform your supply chain with Sarvam
        </h2>
        <ol className="mt-8 flex flex-wrap gap-3 text-sm">
          {["01 Meet Sarvam", "02 Product Suite", "03 Predict · Plan · Execute", "04 Industry Impact", "05 Pilot Path"].map(
            (s) => (
              <li
                key={s}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2"
              >
                {s}
              </li>
            ),
          )}
        </ol>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.id} className="card-surface">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                {p.label}
              </p>
              <p className="mt-3 text-sm text-[var(--muted-fg)]">{p.blurb}</p>
              <Link
                href={`/solutions#${p.id}`}
                className="mt-4 inline-block text-xs font-semibold text-[var(--accent)]"
              >
                Explore solutions →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">Beyond planning software</p>
          <h2 className="mt-3 font-display text-3xl font-bold">Can your ERP answer these?</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ERP_QUESTIONS.map((q) => (
              <div key={q} className="card-surface text-sm">
                {q}
              </div>
            ))}
          </div>
          <p className="mt-8 font-display text-2xl font-bold text-[var(--accent)]">
            Sarvam already knows.
          </p>
          <p className="mt-2 text-[var(--muted-fg)]">
            Most enterprise software helps people make decisions. Yugam makes them with you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Start where it hurts</p>
        <h2 className="mt-3 font-display text-3xl font-bold">
          Start with one module. Scale into the full intelligence layer.
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.filter((m) => m.status === "live")
            .slice(0, 6)
            .map((m) => (
              <ModuleCard key={m.slug} module={m} />
            ))}
        </div>
        <Link href="/solutions" className="btn-secondary mt-8">
          Browse all {MODULES.length} modules
        </Link>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">Layer, don&apos;t replace</p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            An intelligence layer. Not another system.
          </h2>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            You&apos;ve invested years in TMS, WMS, and ERP. Yugam engineers an intelligence layer
            over them so they finally decide and act as one.
          </p>
          <div className="mt-10">
            <ComparisonTable rows={COMPARISON_ROWS} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Proven at scale</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OUTCOMES.map((o) => (
            <article key={o.sector} className="card-surface">
              <p className="text-xs text-[var(--muted-fg)]">{o.sector}</p>
              <p className="mt-4 font-display text-3xl font-bold text-[var(--accent)]">{o.metric}</p>
              <p className="text-xs text-[var(--muted-fg)]">{o.metricLabel}</p>
              <h3 className="mt-4 font-display text-xl font-bold">{o.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{o.body}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
