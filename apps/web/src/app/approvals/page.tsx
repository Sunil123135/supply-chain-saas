"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface ApprovalItem {
  id: string;
  agent_id: string;
  tool_name: string;
  status: string;
  confidence: number | null;
  summary: string;
  taxonomy: string;
  severity: string;
  exposureInr: number | null;
  created_at: string;
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"needs_approval" | "approved" | "rejected">("needs_approval");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?status=${filter}`);
      const data = await res.json();
      setConfigured(data.configured !== false);
      setItems(data.items ?? []);
    } catch {
      setMessage("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setMessage(null);
    const res = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Decision failed");
      return;
    }
    setMessage(`${action}d successfully`);
    await load();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="section-eyebrow">Execute · Human-in-the-loop</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Approvals inbox</h1>
      <p className="mt-2 text-sm text-[var(--muted-fg)]">
        Agent actions that need a human gate (critical FEFO, freight recovery, etc.).{" "}
        <Link href="/dashboard" className="text-[var(--accent)]">
          Control Tower
        </Link>
      </p>

      <div className="mt-6 flex gap-2 text-xs">
        {(["needs_approval", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 ${
              filter === f ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {!configured && (
        <p className="mt-6 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          Supabase not configured — approvals persist when service role is set on the host.
        </p>
      )}

      {loading && <p className="mt-8 text-sm text-[var(--muted-fg)]">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-[var(--muted-fg)]">
          No items in this queue. Run FEFO or freight audit via Sarvam to generate approvals.
        </p>
      )}

      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--accent)]">
                  {item.severity} · {item.taxonomy}
                </p>
                <p className="mt-1 font-medium">{item.summary}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">
                  {item.tool_name} · {item.agent_id}
                  {item.exposureInr != null && ` · ₹${item.exposureInr.toLocaleString()}`}
                  {item.confidence != null && ` · conf ${(Number(item.confidence) * 100).toFixed(0)}%`}
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
              {filter === "needs_approval" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                    onClick={() => void decide(item.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs"
                    onClick={() => void decide(item.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {message && <p className="mt-6 text-sm text-amber-300">{message}</p>}
    </main>
  );
}
