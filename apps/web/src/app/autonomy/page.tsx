"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  scheduleHint: string;
  hermesRole: string;
  steps: string[];
}

interface TemporalInfo {
  configured?: boolean;
  ok?: boolean;
  gatewayUrl?: string;
  error?: string;
  taskQueue?: string;
}

export default function AutonomyPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [temporal, setTemporal] = useState<TemporalInfo | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [industry, setIndustry] = useState<"medtech" | "cpg">("medtech");

  useEffect(() => {
    fetch("/api/autonomy/run")
      .then((r) => r.json())
      .then((d) => {
        setWorkflows(d.workflows ?? []);
        setTemporal(d.temporal ?? null);
      })
      .catch(() => setMessage("Failed to load workflows"));
  }, []);

  async function run(id: string, via: "inline" | "temporal") {
    setRunning(`${via}:${id}`);
    setMessage(null);
    try {
      const res = await fetch("/api/autonomy/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id, industry, source: "ui", via }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(
          data.error ??
            "Run failed — set BOT_OPEN_DEMO=true for UI runs, or configure Temporal gateway",
        );
        return;
      }
      if (data.mode === "temporal") {
        setMessage(`Temporal queued: ${data.temporalWorkflowId ?? data.summary}`);
      } else {
        setMessage(`${data.workflow?.name}: ${data.summary}`);
      }
    } catch {
      setMessage("Request failed");
    } finally {
      setRunning(null);
    }
  }

  const temporalReady = Boolean(temporal?.configured && temporal?.ok);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="section-eyebrow">Hermes · Temporal · n8n</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Autonomy workflows</h1>
      <p className="mt-2 text-sm text-[var(--muted-fg)]">
        Named multi-tool runs for VPS orchestrators. Same APIs power Slack/Teams/WhatsApp via
        Sarvam. Docs: <code className="text-[var(--accent)]">docs/temporal/README.md</code>
      </p>

      <div
        className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
          temporalReady
            ? "border-emerald-700/50 bg-emerald-950/40 text-emerald-200"
            : "border-zinc-700 bg-zinc-900/50 text-zinc-400"
        }`}
      >
        {temporalReady ? (
          <>
            Temporal connected · queue {temporal?.taskQueue ?? "yugam-autonomy"} ·{" "}
            {temporal?.gatewayUrl}
          </>
        ) : temporal?.configured ? (
          <>Temporal gateway configured but unreachable: {temporal?.error ?? "check /health"}</>
        ) : (
          <>
            Temporal offline — run <code>docs/temporal/install.ps1</code> then set{" "}
            <code>TEMPORAL_GATEWAY_URL</code>
          </>
        )}
        {" · "}
        <Link href="/api/temporal/status" className="text-[var(--accent)]">
          status
        </Link>
      </div>

      <div className="mt-6 flex gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={industry === "medtech"}
            onChange={() => setIndustry("medtech")}
          />
          MedTech
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={industry === "cpg"} onChange={() => setIndustry("cpg")} />
          CPG
        </label>
        <Link href="/approvals" className="text-[var(--accent)]">
          Approvals →
        </Link>
      </div>

      <ul className="mt-8 space-y-3">
        {workflows.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{w.name}</p>
                <p className="mt-1 text-xs text-[var(--muted-fg)]">{w.description}</p>
                <p className="mt-1 text-[10px] uppercase text-zinc-500">
                  {w.scheduleHint} · hermes:{w.hermesRole}
                </p>
                <p className="mt-2 text-xs text-[var(--accent)]">{w.steps.join(" → ")}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={running === `inline:${w.id}`}
                  onClick={() => void run(w.id, "inline")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  {running === `inline:${w.id}` ? "Running…" : "Run now"}
                </button>
                <button
                  type="button"
                  disabled={!temporalReady || running === `temporal:${w.id}`}
                  onClick={() => void run(w.id, "temporal")}
                  className="rounded-lg border border-emerald-700/60 px-3 py-1.5 text-xs font-medium text-emerald-200 disabled:opacity-40"
                >
                  {running === `temporal:${w.id}` ? "Queuing…" : "Run via Temporal"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {message && <p className="mt-6 text-sm text-amber-300">{message}</p>}
    </main>
  );
}
