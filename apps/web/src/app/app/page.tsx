import Link from "next/link";
import { MODULES, PILLARS } from "@/lib/product/catalog";

const QUICK = [
  { href: "/app/sarvam", label: "Talk to Sarvam", desc: "Chat / voice orchestrator" },
  { href: "/dashboard", label: "Control Tower", desc: "Live MedTech + CPG KPIs" },
  { href: "/app/modules/freight-settlement", label: "Freight Settlement", desc: "Invoice leakage recovery" },
  { href: "/app/modules/demand-forecasting", label: "Demand Forecasting", desc: "SKU demand signals" },
  { href: "/import", label: "Import data", desc: "CSV / starter packs" },
  { href: "/features", label: "Pain Map", desc: "Market pains vs roadmap" },
];

export default function AppHomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="section-eyebrow">Product app</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Yugam workspace</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted-fg)]">
        Full Predict · Plan · Execute suite with Sarvam as the conversational orchestrator. Start
        from a module or ask Sarvam in plain language.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="card-surface hover:border-[var(--accent)]">
            <p className="font-semibold">{q.label}</p>
            <p className="mt-1 text-xs text-[var(--muted-fg)]">{q.desc}</p>
          </Link>
        ))}
      </div>

      {PILLARS.map((p) => (
        <section key={p.id} className="mt-14">
          <h2 className="font-display text-xl font-bold capitalize">{p.label}</h2>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">{p.blurb}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.filter((m) => m.pillar === p.id).map((m) => (
              <Link
                key={m.slug}
                href={`/app/modules/${m.slug}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm hover:border-[var(--accent)]"
              >
                <span>{m.name}</span>
                <span className="text-[10px] uppercase text-[var(--accent)]">{m.status}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
