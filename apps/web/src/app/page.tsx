import Link from "next/link";
import { ApiStatus } from "@/components/ApiStatus";

const MODULES = [
  { id: "M1", name: "Demand Forecasting", phase: "P3" },
  { id: "M2", name: "Inventory Optimization", phase: "P4" },
  { id: "M3", name: "Auto-Replenishment", phase: "P4" },
  { id: "M4", name: "Dispatch & Freight", phase: "P5" },
  { id: "M5", name: "Copilot", phase: "P0" },
  { id: "M6", name: "Control Tower", phase: "P7" },
  { id: "M7", name: "Knowledge Base", phase: "P6" },
  { id: "M8", name: "Billing", phase: "P8" },
  { id: "M9", name: "Admin", phase: "P1" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
          Phase P0 — Yugam Setup
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Yugam</h1>
        <p className="mt-2 text-xl text-zinc-400">The Era of Supply Chain Intelligence</p>
        <p className="mt-4 max-w-2xl text-zinc-500">
          MedTech + CPG supply chain SaaS. Frontend on Netlify, API on Railway,
          Copilot via OpenRouter.
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6">
        <h2 className="text-lg font-semibold text-emerald-400">P0 status</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          <li>
            <ApiStatus />
          </li>
          <li>
            Copilot test:{" "}
            <Link href="/copilot" className="text-emerald-400 hover:underline">
              /copilot
            </Link>
          </li>
          <li>
            Checklist:{" "}
            <code className="text-emerald-300">YUGAM_P0_SETUP_CHECKLIST.md</code>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Modules (roadmap)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--muted)] px-4 py-3"
            >
              <span className="text-xs font-medium text-emerald-400">{m.id}</span>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-zinc-500">Build phase {m.phase}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-16 space-y-1 text-sm text-zinc-500">
        <p>
          Web health:{" "}
          <a href="/api/health" className="text-emerald-400 hover:underline">
            /api/health
          </a>
        </p>
      </footer>
    </main>
  );
}
