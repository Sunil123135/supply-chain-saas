"use client";

import Link from "next/link";
import { useState } from "react";
import { apiUrlSetupHint, getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
const API_MISCONFIGURED = isMisconfiguredApiUrl(API_URL);

/** Legacy route — redirects users to Sarvam. */
export default function CopilotTestPage() {
  const [prompt, setPrompt] = useState(
    "Forecast demand for product SKU-001 based on historical sales trends.",
  );
  const [response, setResponse] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    if (API_MISCONFIGURED) {
      setError(apiUrlSetupHint());
      return;
    }
    setLoading(true);
    setError("");
    setResponse("");
    setModel("");
    try {
      const res = await fetch(`${API_URL}/api/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `You are Sarvam, Yugam's supply chain AI. ${prompt}`,
        }),
      });
      const data = (await res.json()) as {
        response?: string;
        model?: string;
        error?: string;
      };
      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data.response ?? "");
        setModel(data.model ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="section-eyebrow">Sarvam API test</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Sarvam · API checkpoint</h1>
      <p className="mt-2 text-sm text-[var(--muted-fg)]">
        Prefer the full chat UI at{" "}
        <Link href="/app/sarvam" className="text-[var(--accent)]">
          /app/sarvam
        </Link>
        . API: {API_URL}
      </p>
      {API_MISCONFIGURED && (
        <p className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          {apiUrlSetupHint()}
        </p>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mt-6 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-sm"
        rows={5}
      />

      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="btn-primary mt-4 disabled:opacity-50"
      >
        {loading ? "Testing…" : "Test Sarvam API"}
      </button>

      {error && (
        <div className="mt-6 rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-6 card-surface">
          <h2 className="text-sm font-semibold text-[var(--accent)]">Response</h2>
          {model && <p className="mt-1 text-xs text-[var(--muted-fg)]">Model: {model}</p>}
          <pre className="mt-3 whitespace-pre-wrap text-sm">{response}</pre>
        </div>
      )}
    </main>
  );
}
