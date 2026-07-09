import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES, getAgent, getModule } from "@/lib/product/catalog";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const mod = getModule(params.slug);
  return { title: mod ? `${mod.name} · App` : "Module" };
}

export default function AppModulePage({ params }: Props) {
  const mod = getModule(params.slug);
  if (!mod) notFound();

  const agents = mod.agentIds.map((id) => getAgent(id)).filter(Boolean);
  const sampleRows = [
    ["SKU-1042", "DC-North", "High", "Action: expedite"],
    ["SKU-2201", "Plant-2", "Medium", "Action: rebalance"],
    ["SKU-0881", "DC-West", "Low", "Action: monitor"],
    ["SKU-3310", "3PL-A", "High", "Action: escalate"],
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">
            App · {mod.pillar} · {mod.status}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">{mod.name}</h1>
          <p className="mt-2 max-w-xl text-[var(--muted-fg)]">{mod.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/sarvam" className="btn-primary">
            Ask Sarvam
          </Link>
          <Link href={`/solutions/${mod.slug}`} className="btn-secondary">
            Marketing page
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {mod.kpis.map((k) => (
          <div key={k.label} className="card-surface">
            <p className="text-xs text-[var(--muted-fg)]">{k.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--accent)]">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Workspace queue</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--muted)] text-xs uppercase text-[var(--muted-fg)]">
              <tr>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Node</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Sarvam action</th>
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r) => (
                <tr key={r[0]} className="border-t border-[var(--border)]">
                  {r.map((c) => (
                    <td key={c} className="px-4 py-3">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Capabilities</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {mod.bullets.map((b) => (
            <li key={b} className="card-surface text-sm">
              ✓ {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Agents on this module</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {agents.map((a) =>
            a ? (
              <div key={a.id} className="card-surface">
                <p className="font-semibold">{a.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{a.role}</p>
                <Link
                  href="/app/sarvam"
                  className="mt-3 inline-block text-xs font-semibold text-[var(--accent)]"
                >
                  Ask via Sarvam →
                </Link>
              </div>
            ) : null,
          )}
        </div>
      </section>

      <Link href="/app" className="mt-10 inline-block text-sm text-[var(--accent)]">
        ← All modules
      </Link>
    </main>
  );
}
