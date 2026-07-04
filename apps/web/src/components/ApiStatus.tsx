"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ApiStatus() {
  const [status, setStatus] = useState<"checking" | "ok" | "offline">("checking");

  useEffect(() => {
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
    status === "checking" ? "checking…" : status === "ok" ? "online" : "offline";
  const color =
    status === "ok"
      ? "text-emerald-400"
      : status === "offline"
        ? "text-red-400"
        : "text-zinc-400";

  return (
    <span className={color}>
      Backend ({API_URL}): <strong>{label}</strong>
    </span>
  );
}
