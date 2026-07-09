import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand } from "@/components/Marketing";
import { MODULES, getAgent, getModule } from "@/lib/product/catalog";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const mod = getModule(params.slug);
  return { title: mod ? mod.name : "Module" };
}

export default function ModuleDetailPage({ params }: Props) {
  const mod = getModule(params.slug);
  if (!mod) notFound();

  const agents = mod.agentIds.map((id) => getAgent(id)).filter(Boolean);

  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">
            {mod.pillar} · {mod.status}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{mod.name}</h1>
          <p className="mt-2 text-xl text-[var(--accent)]">{mod.tagline}</p>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">{mod.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="btn-primary">
              Book a Demo
            </Link>
            <Link href={`/app/modules/${mod.slug}`} className="btn-secondary">
              See it in the app
            </Link>
            <Link href="/app/sarvam" className="btn-secondary">
              Ask Sarvam
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-bold">Capabilities</h2>
            <ul className="mt-6 space-y-3">
              {mod.bullets.map((b) => (
                <li key={b} className="card-surface flex gap-3 text-sm">
                  <span className="text-[var(--accent)]">✓</span>
                  {b}
                </li>
              ))}
            </ul>
            <h2 className="mt-12 font-display text-2xl font-bold">AI-Workforce agents</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {agents.map((a) =>
                a ? (
                  <div key={a.id} className="card-surface">
                    <p className="text-xs text-[var(--accent)]">{a.domain}</p>
                    <h3 className="mt-1 font-semibold">{a.name}</h3>
                    <p className="mt-2 text-sm text-[var(--muted-fg)]">{a.description}</p>
                  </div>
                ) : null,
              )}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="card-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
                Demo KPIs
              </p>
              <ul className="mt-4 space-y-3">
                {mod.kpis.map((k) => (
                  <li key={k.label} className="flex justify-between text-sm">
                    <span className="text-[var(--muted-fg)]">{k.label}</span>
                    <span className="font-semibold text-[var(--accent)]">{k.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/solutions" className="btn-secondary w-full">
              All solutions
            </Link>
          </aside>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
