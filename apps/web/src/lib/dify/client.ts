/**
 * Dify chat / knowledge-base narrative layer.
 * Set DIFY_API_URL + DIFY_API_KEY on Netlify (public HTTPS) or apps/web/.env.local (tunnel).
 * Upload docs/rag/pain-playbook.md into the Dify knowledge base.
 */

export interface DifyNarrateArgs {
  prompt: string;
  tool: string;
  summary: string;
  painContext: string;
  dataPreview: string;
}

/** Accepts `https://host`, `https://host/`, or `https://host/v1`. */
export function normalizeDifyBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  if (base.endsWith("/v1")) {
    base = base.slice(0, -3).replace(/\/+$/, "");
  }
  return base;
}

export function isDifyConfigured(): boolean {
  return Boolean(process.env.DIFY_API_KEY && (process.env.DIFY_API_URL || process.env.DIFY_BASE_URL));
}

export function isDifyLocalhostUrl(url: string): boolean {
  try {
    const u = new URL(normalizeDifyBaseUrl(url));
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

export async function narrateWithDify(args: DifyNarrateArgs): Promise<string | null> {
  if (!isDifyConfigured()) return null;

  const raw = process.env.DIFY_API_URL ?? process.env.DIFY_BASE_URL ?? "";
  const base = normalizeDifyBaseUrl(raw);
  const key = process.env.DIFY_API_KEY!;
  const user = process.env.DIFY_USER ?? "yugam-sarvam";

  // On Netlify / production, localhost can never reach your VPS tunnel.
  if (isDifyLocalhostUrl(base) && process.env.NODE_ENV === "production") {
    console.error(
      "Dify URL is localhost — Netlify cannot reach it. Expose Dify via Dokploy HTTPS and set DIFY_API_URL to that public origin.",
    );
    return null;
  }

  const query = [
    `User question: ${args.prompt}`,
    `Tool already executed: ${args.tool}`,
    `Math summary (authoritative — do not invent numbers): ${args.summary}`,
    `Data preview: ${args.dataPreview}`,
    `Relevant pain-map context:\n${args.painContext}`,
    "",
    "Write a concise Sarvam narrative for a supply-chain planner. Cite the math summary. Suggest next action.",
  ].join("\n");

  try {
    const res = await fetch(`${base}/v1/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          tool: args.tool,
          summary: args.summary,
        },
        query,
        response_mode: "blocking",
        user,
        conversation_id: "",
      }),
    });

    if (!res.ok) {
      console.error("Dify narrate HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as { answer?: string; message?: string };
    const answer = data.answer?.trim() || data.message?.trim();
    return answer || null;
  } catch (err) {
    console.error("Dify narrate failed", err);
    return null;
  }
}
