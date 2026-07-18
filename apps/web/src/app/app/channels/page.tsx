"use client";

import { useCallback, useRef, useState, useTransition } from "react";

export default function ChannelsPage() {
  const [transcript, setTranscript] = useState("Optimize airline belly cargo yield");
  const [voiceReply, setVoiceReply] = useState("");
  const [excelResult, setExcelResult] = useState("");
  const [listening, setListening] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 600));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const runVoice = () => {
    startTransition(async () => {
      const res = await fetch("/api/integrations/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, industry: "medtech", speak: true }),
      });
      const data = await res.json();
      const reply = String(data.reply ?? data.error ?? "No reply");
      setVoiceReply(reply);
      if (data.ok) speak(reply.replace(/[#*`]/g, ""));
    });
  };

  const startStt = () => {
    type Rec = {
      lang: string;
      start: () => void;
      onstart: (() => void) | null;
      onend: (() => void) | null;
      onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
    };
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => Rec;
      SpeechRecognition?: new () => Rec;
    };
    const SR = w.webkitSpeechRecognition || w.SpeechRecognition;
    if (!SR) {
      setVoiceReply("Web Speech API not available — type a transcript and Send.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript ?? "";
      setTranscript(t);
    };
    rec.start();
  };

  const uploadExcel = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setExcelResult("Choose an .xlsx or .csv file first.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileKey", "sku_master");
      fd.append("prompt", "Summarize this Excel upload and run demand-supply matching");
      fd.append("industry", "medtech");
      const res = await fetch("/api/integrations/excel", { method: "POST", body: fd });
      const data = await res.json();
      setExcelResult(
        JSON.stringify(
          {
            ok: data.ok,
            rows: data.rowCount,
            missing: data.missing,
            tool: data.sarvam?.tool,
            reply: data.sarvam?.reply?.slice(0, 800),
          },
          null,
          2,
        ),
      );
    });
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <header>
        <p className="text-sm uppercase tracking-wide text-slate-500">Channels</p>
        <h1 className="text-3xl font-semibold text-slate-900">Voice & Excel</h1>
        <p className="mt-2 text-slate-600">
          Browser STT → Sarvam tools · Excel/.xlsx → parse + optional copilot prompt.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Voice</h2>
        <textarea
          className="w-full rounded border border-slate-300 p-3 text-sm"
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startStt}
            className="rounded bg-slate-800 px-4 py-2 text-sm text-white"
          >
            {listening ? "Listening…" : "Listen"}
          </button>
          <button
            type="button"
            onClick={runVoice}
            disabled={pending}
            className="rounded bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Send to Sarvam
          </button>
        </div>
        {voiceReply ? (
          <pre className="whitespace-pre-wrap rounded bg-slate-50 p-4 text-sm text-slate-800">
            {voiceReply}
          </pre>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Excel</h2>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-sm" />
        <button
          type="button"
          onClick={uploadExcel}
          disabled={pending}
          className="block rounded bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Upload & analyze
        </button>
        {excelResult ? (
          <pre className="overflow-x-auto rounded bg-slate-50 p-4 text-xs text-slate-800">
            {excelResult}
          </pre>
        ) : null}
      </section>
    </main>
  );
}
