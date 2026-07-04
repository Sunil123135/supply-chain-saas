"use client";

import { useState } from "react";

import { apiUrlSetupHint, getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();
const API_MISCONFIGURED = isMisconfiguredApiUrl(API_URL);

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
        body: JSON.stringify({ prompt }),
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
      <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
        P0 Checkpoint 5
      </p>
      <h1 className="mt-2 text-3xl font-bold">Yugam Copilot Test</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Netlify → Railway → OpenRouter. API: {API_URL}
      </p>
      {API_MISCONFIGURED && (
        <p className="mt-3 rounded-lg border border-amber-800/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          {apiUrlSetupHint()}
        </p>
      )}

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mt-6 w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4 text-sm text-zinc-100"
        rows={5}
      />

      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="mt-4 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? "Testing…" : "Test Copilot"}
      </button>

      {error && (
        <div className="mt-6 rounded-lg border border-red-900/50 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {response && (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--muted)] p-4">
          <h2 className="text-sm font-semibold text-emerald-400">Response</h2>
          {model && <p className="mt-1 text-xs text-zinc-500">Model: {model}</p>}
          <pre className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">{response}</pre>
        </div>
      )}
    </main>
  );
}
