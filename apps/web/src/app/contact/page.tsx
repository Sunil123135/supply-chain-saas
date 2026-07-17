"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { INDUSTRIES, OUTCOMES } from "@/lib/product/catalog";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first: fd.get("first"),
          last: fd.get("last"),
          company: fd.get("company"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          industry: fd.get("industry"),
          message: fd.get("challenge"),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not submit — try again");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="hero-glow border-b border-[var(--border)]">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="section-eyebrow">Get started</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">
              Build your autonomous supply chain.
            </h1>
            <p className="mt-4 text-[var(--muted-fg)]">
              Describe the operation. The Yugam solutions team will design a personalized walkthrough
              of Sarvam for your use case.
            </p>
            <ul className="mt-8 space-y-2 text-sm text-[var(--muted-fg)]">
              <li>Response within 24 hours</li>
              <li>ISO 27001 / SOC 2 path</li>
              <li>
                Or{" "}
                <Link href="/app/sarvam" className="font-semibold text-[var(--accent)]">
                  talk to Sarvam now
                </Link>
              </li>
            </ul>
          </div>

          <div className="card-surface">
            <h2 className="font-display text-xl font-bold">Leave us a message</h2>
            {sent ? (
              <p className="mt-6 text-sm text-[var(--accent)]">
                Thanks — we&apos;ll line up a 30-minute discovery call with a simulation tailored to
                your operation.
              </p>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs">
                    First Name *
                    <input
                      required
                      name="first"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs">
                    Last Name *
                    <input
                      required
                      name="last"
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block text-xs">
                  Company *
                  <input
                    required
                    name="company"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  Work Email *
                  <input
                    required
                    type="email"
                    name="email"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  Phone
                  <input
                    name="phone"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs">
                  Industry *
                  <select
                    required
                    name="industry"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select your industry
                    </option>
                    {INDUSTRIES.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  Tell us about your supply chain challenge *
                  <textarea
                    required
                    name="challenge"
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-[var(--muted-fg)]">
                  <input required type="checkbox" className="mt-0.5" />
                  I agree to the Privacy Policy and Terms of Use.
                </label>
                {error ? <p className="text-xs text-red-600">{error}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Request Your Demo"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="section-eyebrow">Proven at scale</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OUTCOMES.map((o) => (
            <article key={o.sector} className="card-surface">
              <p className="font-display text-2xl font-bold text-[var(--accent)]">{o.metric}</p>
              <h3 className="mt-2 font-semibold">{o.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted-fg)]">{o.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
