"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import {
  IMPORT_FILES,
  type ImportFileKey,
  type IndustryPack,
} from "@/lib/import/config";

interface FileState {
  rowCount: number;
  headers: string[];
  ok: boolean;
  source: "starter" | "upload" | "none";
}

const STORAGE_KEY = "yugam_import_session";

function initialFileStates(): Record<ImportFileKey, FileState> {
  const state = {} as Record<ImportFileKey, FileState>;
  for (const f of IMPORT_FILES) {
    state[f.key] = { rowCount: 0, headers: [], ok: false, source: "none" };
  }
  return state;
}

export default function ImportWizardPage() {
  const [industry, setIndustry] = useState<IndustryPack>("medtech");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<Record<ImportFileKey, FileState>>(initialFileStates);

  const loadStarterPack = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/import/starter-pack/${industry}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed");

      const next: Record<ImportFileKey, FileState> = { ...fileStates };
      for (const spec of IMPORT_FILES) {
        const entry = data.summary?.[spec.key];
        if (entry) {
          next[spec.key] = {
            rowCount: entry.rowCount,
            headers: entry.headers,
            ok: entry.rowCount > 0,
            source: "starter",
          };
        }
      }
      setFileStates(next);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            industry,
            importedAt: data.importedAt,
            summary: data.summary,
          }),
        );
      }
      setMessage(`Loaded ${industry} starter pack (${Object.keys(data.summary).length} files).`);
      setStep(3);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load starter pack");
    } finally {
      setLoading(false);
    }
  }, [industry, fileStates]);

  const onFileUpload = async (key: ImportFileKey, file: File) => {
    const text = await file.text();
    const res = await fetch("/api/import/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey: key, csvText: text }),
    });
    const data = await res.json();
    setFileStates((prev) => ({
      ...prev,
      [key]: {
        rowCount: data.rowCount ?? 0,
        headers: data.headers ?? [],
        ok: Boolean(data.ok),
        source: "upload",
      },
    }));
    if (!data.ok) {
      setMessage(`Validation issues in ${key}: missing ${data.missing?.join(", ")}`);
    } else {
      setMessage(`Uploaded ${key}: ${data.rowCount} rows`);
    }
  };

  const requiredDone = IMPORT_FILES.filter((f) => f.required).every((f) => fileStates[f.key].ok);

  const persistToWorkspace = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/import/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, mode: "starter" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Persist failed");
      setMessage(
        `Saved to workspace: ${data.skus} SKUs, ${data.lots} lots (org ${String(data.orgId).slice(0, 8)}…).`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">P1 — Data import</p>
      <h1 className="mt-2 text-3xl font-bold">Import wizard (optional)</h1>
      <p className="mt-2 text-zinc-400">
        Data is already on the server — see{" "}
        <Link href="/dashboard" className="text-emerald-400 hover:underline">
          /dashboard
        </Link>
        . Use this page only to replace packs with SAP/Excel extracts.
      </p>

      <div className="mt-8 flex gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 ${step === s ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6">
          <h2 className="text-lg font-semibold">1. Choose industry pack</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="industry"
                checked={industry === "medtech"}
                onChange={() => setIndustry("medtech")}
              />
              MedTech (devices, implants, capital equipment)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="industry"
                checked={industry === "cpg"}
                onChange={() => setIndustry("cpg")}
              />
              India CPG / FMCG (HUL-style distribution)
            </label>
          </div>
          <button
            type="button"
            className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 space-y-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6">
            <h2 className="text-lg font-semibold">2. Load data</h2>
            <button
              type="button"
              disabled={loading}
              onClick={loadStarterPack}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Loading…" : `Load ${industry} starter pack`}
            </button>
            <p className="mt-3 text-sm text-zinc-500">
              Or upload individual CSVs (same column headers as{" "}
              <code className="text-emerald-400">data/{industry === "medtech" ? "medtech" : "cpg-india"}-starter-pack/</code>
              )
            </p>
          </div>

          <ul className="space-y-3">
            {IMPORT_FILES.map((spec) => (
              <li
                key={spec.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-4 py-3"
              >
                <div>
                  <p className="font-medium">{spec.label}</p>
                  <p className="text-xs text-zinc-500">
                    {spec.filename}
                    {spec.required ? " · required" : " · optional"}
                    {fileStates[spec.key].rowCount > 0 &&
                      ` · ${fileStates[spec.key].rowCount} rows (${fileStates[spec.key].source})`}
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="text-xs"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onFileUpload(spec.key, f);
                  }}
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm"
            onClick={() => setStep(3)}
            disabled={!requiredDone && !fileStates.sku_master.ok}
          >
            Review import
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-6">
          <h2 className="text-lg font-semibold">3. Import summary</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {IMPORT_FILES.map((spec) => (
              <li key={spec.key} className="flex justify-between">
                <span>{spec.label}</span>
                <span className={fileStates[spec.key].ok ? "text-emerald-400" : "text-zinc-500"}>
                  {fileStates[spec.key].rowCount > 0
                    ? `${fileStates[spec.key].rowCount} rows`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-zinc-400">
            Save this pack into your Supabase workspace so FEFO, Control Tower, and Sarvam read live
            lots — not only browser localStorage.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !fileStates.sku_master.ok}
              onClick={() => void persistToWorkspace()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save to workspace"}
            </button>
            <Link href="/dashboard" className="rounded-lg border border-zinc-600 px-4 py-2 text-sm">
              Open Control Tower
            </Link>
            <Link href="/approvals" className="text-emerald-400 hover:underline self-center text-sm">
              Approvals inbox →
            </Link>
            <Link href="/app/sarvam" className="text-zinc-400 hover:underline self-center text-sm">
              Sarvam
            </Link>
          </div>
        </section>
      )}

      {message && <p className="mt-6 text-sm text-amber-300">{message}</p>}
    </main>
  );
}
