"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/product/catalog";
import {
  SARVAM_STARTERS,
  runSarvamLocal,
  type SarvamMessage,
} from "@/lib/sarvam/engine";
import { apiUrlSetupHint, getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
const API_MISCONFIGURED = isMisconfiguredApiUrl(API_URL);

export default function SarvamAppPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<SarvamMessage[]>([
    {
      role: "sarvam",
      content:
        "Hi, I'm **Sarvam** — Yugam's supply chain orchestrator. Ask about demand, inventory, dispatch, risk, RFQ, or freight settlement. I'll route to the right AI-Workforce agent.",
      confidence: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [useApi, setUseApi] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      if (useApi && !API_MISCONFIGURED) {
        const res = await fetch(`${API_URL}/api/copilot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `You are Sarvam, Yugam's supply chain AI orchestrator. ${trimmed}`,
          }),
        });
        const data = (await res.json()) as { response?: string; error?: string };
        if (data.error) throw new Error(data.error);
        setMessages((m) => [
          ...m,
          {
            role: "sarvam",
            content: data.response ?? "No response from API.",
            confidence: 0.8,
          },
        ]);
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setMessages((m) => [...m, runSarvamLocal(trimmed)]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "sarvam",
          content: `API unavailable — falling back to local Sarvam.\n\n${runSarvamLocal(trimmed).content}\n\n_(${e instanceof Error ? e.message : "error"})_`,
          confidence: 0.65,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-eyebrow">Sarvam</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Talk to Sarvam</h1>
          <p className="mt-1 text-sm text-[var(--muted-fg)]">
            {AGENTS.length} specialist agents · chat orchestrator · human-in-the-loop
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--muted-fg)]">
          <input
            type="checkbox"
            checked={useApi}
            onChange={(e) => setUseApi(e.target.checked)}
          />
          Use Railway OpenRouter API
        </label>
      </div>

      {useApi && API_MISCONFIGURED && (
        <p className="mt-4 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          {apiUrlSetupHint()}
        </p>
      )}

      <div className="mt-6 flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-3xl rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "ml-auto bg-[var(--accent)] text-white"
                  : "bg-[var(--muted)] text-[var(--foreground)]"
              }`}
            >
              {msg.role === "sarvam" && msg.agentId && (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  via {AGENTS.find((a) => a.id === msg.agentId)?.name ?? msg.agentId}
                  {msg.confidence != null && ` · ${(msg.confidence * 100).toFixed(0)}% confidence`}
                </p>
              )}
              <div className="whitespace-pre-wrap [&_strong]:font-semibold">
                {msg.content.split("**").map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>,
                )}
              </div>
              {msg.actions && (
                <ul className="mt-3 space-y-1 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-fg)]">
                  {msg.actions.map((a) => (
                    <li key={a}>→ {a}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {loading && (
            <p className="text-sm text-[var(--muted-fg)]">Sarvam is reasoning…</p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[var(--border)] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SARVAM_STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-[11px] text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sarvam anything about your supply chain…"
              className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-[var(--muted-fg)]">
        <Link href="/app" className="text-[var(--accent)]">
          ← Back to app
        </Link>
        {" · "}
        <Link href="/sarvam" className="text-[var(--accent)]">
          About Sarvam
        </Link>
      </p>
    </main>
  );
}
