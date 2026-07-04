"use client";

import { useEffect, useState } from "react";

import { apiUrlSetupHint, getApiUrl, isMisconfiguredApiUrl } from "@/lib/apiUrl";

const API_URL = getApiUrl();

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "offline" | "misconfigured">(
    isMisconfiguredApiUrl(API_URL) ? "misconfigured" : "checking",
  );

  useEffect(() => {
    if (isMisconfiguredApiUrl(API_URL)) return;
    let cancelled = false;
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d: { status?: string }) => {
        if (!cancelled) setStatus(d.status === "ok" ? "ok" : "offline");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "checking"
      ? "checking…"
      : status === "ok"
        ? "online"
        : status === "misconfigured"
          ? "misconfigured URL"
          : "offline";
  const color =
    status === "ok"
      ? "text-emerald-400"
      : status === "offline" || status === "misconfigured"
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <span className={color}>
      Backend ({API_URL}): <strong>{label}</strong>
      {status === "misconfigured" && (
        <span className="mt-1 block text-xs text-amber-300">{apiUrlSetupHint()}</span>
      )}
    </span>
  );
}
