# RAG narrative on Railway

## What runs today (no VPS Dify required)

`nexova-web` on Railway already has `OPENROUTER_API_KEY`. Narrative chain:

1. **Dify** — if `DIFY_API_URL` + `DIFY_API_KEY` (public HTTPS)
2. **OpenRouter local RAG** — retrieves from pain map + playbook snippets (`lib/rag/localPlaybook.ts`)
3. Backend `/api/sarvam/narrate`
4. Deterministic markdown

Probe: `GET https://nexova-web-production.up.railway.app/api/health/wiring`  
Expect `openrouter_rag: true`. `dify_reachable` stays false until a public Dify URL is set.

## Optional: point at public Dify

When Dokploy exposes Dify:

```bash
railway variables set DIFY_API_URL=https://dify.YOUR-DOMAIN DIFY_API_KEY=app-xxx DIFY_USER=yugam-sarvam --service nexova-web
```

Upload `docs/rag/pain-playbook.md` into the Dify knowledge base.

## Channels

| Channel | Endpoint |
|---------|----------|
| Voice | `POST /api/integrations/voice` `{ "transcript": "..." }` |
| Excel | `POST /api/integrations/excel` multipart `file` + optional `prompt` |
| Slack / Teams / WhatsApp | existing bot routes |

Auth: `BOT_OPEN_DEMO=true` or `x-bot-secret`.
