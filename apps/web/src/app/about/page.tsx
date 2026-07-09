import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/Marketing";

export const metadata: Metadata = {
  title: "About Us",
};

const LEADERSHIP = [
  { name: "Product Leadership", role: "CEO / Founder track" },
  { name: "Operations", role: "COO track" },
  { name: "Technology", role: "CTO · Sarvam platform" },
  { name: "Customer Success", role: "Deployments & ROI" },
];

export default function AboutPage() {
  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="section-eyebrow">About Yugam</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
            Building the Autonomous Supply Chain
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted-fg)]">
            Yugam architects autonomous supply chains — from demand sensing to last-mile delivery.
            AI-native technology that plans, decides, and acts across the entire operation.
            Orchestrated by <strong className="text-[var(--foreground)]">Sarvam</strong>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Our values</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            [
              "Innovation",
              "Operational intelligence, not experimentation — practical AI that reduces uncertainty.",
            ],
            [
              "Integrity",
              "Trust built into every decision layer — explainable, auditable, aligned with business reality.",
            ],
            [
              "Collaboration",
              "Operating partners, not external vendors — embedded into workflows teams trust.",
            ],
          ].map(([t, d]) => (
            <article key={t} className="card-surface">
              <h3 className="font-display text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="section-eyebrow">Leadership</p>
          <h2 className="mt-3 font-display text-3xl font-bold">The team building Sarvam</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEADERSHIP.map((l) => (
              <div key={l.name} className="card-surface">
                <h3 className="font-semibold">{l.name}</h3>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{l.role}</p>
              </div>
            ))}
          </div>
          <Link href="/contact" className="btn-primary mt-8">
            Talk to Sales
          </Link>
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
