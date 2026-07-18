/**
 * Railway-native RAG: retrieve from PAIN_MAP + embedded playbook snippets,
 * then narrate via OpenRouter (same key already on nexova-web).
 * Prefer Dify when DIFY_API_URL + DIFY_API_KEY are set (see docs/DIFY_RAILWAY.md).
 */

import { PAIN_MAP } from "@/lib/painMap";

const PLAYBOOK_SNIPPETS: { id: string; text: string; tags: string[] }[] = [
  {
    id: "fefo",
    tags: ["fefo", "expiry", "lot", "medtech", "inventory"],
    text: "FEFO: sort lots by expiry; prioritize near-expiry for allocation; escalate exposure > ₹1L for approval.",
  },
  {
    id: "freight",
    tags: ["freight", "invoice", "settlement", "leakage"],
    text: "Freight audit: compare billed vs contract by lane; flag overbills; queue disputes with carrier evidence.",
  },
  {
    id: "atp",
    tags: ["atp", "allocation", "shortage", "tier"],
    text: "ATP: allocate scarce supply by customer tier and allocation_rules; never invent inventory.",
  },
  {
    id: "cold",
    tags: ["cold", "gdp", "temperature", "pharma"],
    text: "Cold-chain GDP: 2–8°C lanes; excursion → quarantine + CAPA; document lane approval.",
  },
  {
    id: "cargo",
    tags: ["cargo", "airline", "belly", "uld", "air freight"],
    text: "Air cargo: bags first, then maximize yield ($/kg) under weight+volume; honor all-or-nothing bookings.",
  },
  {
    id: "forecast",
    tags: ["forecast", "mape", "timeseries", "seasonality", "backtest"],
    text: "Forecast: temporal splits only; report MAPE/MASE by horizon; baseline seasonal-naive before complex models.",
  },
  {
    id: "cruise",
    tags: ["cruise", "provisioning", "port", "galley", "par"],
    text: "Cruise provisioning: buy at cheapest feasible ports under dry/cold/frozen capacity; raise par for sea days.",
  },
  {
    id: "auto",
    tags: ["automotive", "jit", "sequenced", "ppm", "oem"],
    text: "Automotive JIT: call-offs = build time − lead − buffer; track supplier PPM; dual-source critical parts.",
  },
  {
    id: "fnb",
    tags: ["food", "beverage", "shelf", "waste", "fefo", "haccp"],
    text: "F&B: FEFO + channel min remaining shelf life; markdown near-expiry; mock recall < 4 hours.",
  },
  {
    id: "capacity",
    tags: ["capacity", "rccp", "bottleneck", "oee", "aggregate"],
    text: "Capacity: bottleneck sets drum; plan hire/OT/subcontract to meet demand; utilization ≠ efficiency.",
  },
  {
    id: "matching",
    tags: ["demand", "supply", "match", "allocate", "priority"],
    text: "Demand-supply matching: priority allocation under constraint; communicate shortfalls; ATP horizon visible.",
  },
];

export function retrievePlaybookContext(query: string, limit = 6): string {
  const q = query.toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 2);

  const scored = [
    ...PLAYBOOK_SNIPPETS.map((s) => {
      let score = 0;
      for (const tag of s.tags) if (q.includes(tag)) score += 3;
      for (const t of tokens) if (s.text.toLowerCase().includes(t)) score += 1;
      return { score, text: s.text, id: s.id };
    }),
    ...PAIN_MAP.map((p) => {
      let score = 0;
      const blob = `${p.pain} ${p.how}`.toLowerCase();
      for (const t of tokens) if (blob.includes(t)) score += 2;
      return {
        score,
        text: `Pain #${p.id} [${p.status}]: ${p.pain} → ${p.how}`,
        id: `pain-${p.id}`,
      };
    }),
  ]
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) {
    return PAIN_MAP.slice(0, 8)
      .map((p) => `- #${p.id} ${p.pain} → ${p.how}`)
      .join("\n");
  }

  return scored.map((s) => `- (${s.id}) ${s.text}`).join("\n");
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** Narrate with retrieved playbook context via OpenRouter (Railway-ready). */
export async function narrateWithLocalRag(args: {
  prompt: string;
  tool: string;
  summary: string;
  dataPreview: string;
}): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const model = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324";
  const context = retrievePlaybookContext(`${args.prompt} ${args.tool} ${args.summary}`);

  const system = [
    "You are Sarvam, Yugam supply-chain copilot.",
    "Cite only numbers from the math summary. Do not invent inventory or costs.",
    "Use playbook context for process guidance. Keep answer under 220 words.",
    "Suggest one concrete next action.",
  ].join(" ");

  const user = [
    `Question: ${args.prompt}`,
    `Tool: ${args.tool}`,
    `Math summary: ${args.summary}`,
    `Data preview: ${args.dataPreview}`,
    `Playbook / pain context:\n${context}`,
  ].join("\n\n");

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://nexova-web-production.up.railway.app",
        "X-Title": "Yugam Sarvam RAG",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(Number(process.env.RAG_TIMEOUT_MS ?? 16000)),
    });
    if (!res.ok) {
      console.error("OpenRouter RAG HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    return answer || null;
  } catch (err) {
    console.error("OpenRouter RAG failed", err);
    return null;
  }
}
