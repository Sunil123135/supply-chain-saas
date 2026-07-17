"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabaseBrowser();
    if (!sb) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
      return;
    }
    const { error: err } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    });
    if (err) setError(err.message);
    else setSent(true);
  }

  async function continueAsDemo() {
    await fetch("/api/auth/demo", { method: "POST" });
    router.push(next);
  }

  return (
    <>
      <p className="mt-2 text-sm text-[var(--muted-fg)]">
        Magic link auth via Supabase, or continue in demo mode (sets a session cookie for gated
        routes when <code className="text-[var(--accent)]">YUGAM_REQUIRE_AUTH=true</code>).
      </p>

      {!isSupabaseBrowserConfigured() && (
        <p className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          Supabase auth env vars not set — use demo mode or add keys to Netlify.
        </p>
      )}

      {sent ? (
        <p className="mt-6 text-sm text-[var(--accent)]">Check your email for the magic link.</p>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-xs">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Send magic link
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => void continueAsDemo()}
        className="mt-4 w-full rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)]"
      >
        Continue as demo
      </button>

      <p className="mt-6 text-center text-xs text-[var(--muted-fg)]">
        <Link href="/app" className="text-[var(--accent)]">
          Skip to /app
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="section-eyebrow">Sign in</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Yugam workspace</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-[var(--muted-fg)]">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
