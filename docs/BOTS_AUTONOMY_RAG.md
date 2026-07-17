# Bots + Autonomy + RAG wiring

## Slack / Teams / WhatsApp

Set on Netlify:

```
BOT_SHARED_SECRET=yugam-bot-...
# optional demo (no secret): BOT_OPEN_DEMO=true
WHATSAPP_VERIFY_TOKEN=same-as-bot-or-custom
DIFY_API_URL=https://api.dify.ai
DIFY_API_KEY=app-...
```

| Channel | Endpoint | Notes |
|---------|----------|-------|
| Slack | `POST /api/integrations/slack/events` | Header `x-bot-secret`. Supports `url_verification` challenge. |
| Teams | `POST /api/integrations/teams/messages` | Body `{ text }` or Bot Framework `message.text`. |
| WhatsApp | `GET/POST /api/integrations/whatsapp/webhook` | Meta hub verify on GET; inbound text on POST. |

All channels call Sarvam (`runSarvamChat`) → tools → Dify/OpenRouter narrative → `/approvals` when needed.

Test without vendor console:

```bash
curl -X POST https://sctransformation.netlify.app/api/integrations/slack/events \
  -H "content-type: application/json" \
  -H "x-bot-secret: $BOT_SHARED_SECRET" \
  -d '{"text":"which lots expire soon?","industry":"medtech"}'
```

## Hermes / Temporal autonomy

List workflows: `GET /api/autonomy/run`

Run:

```bash
curl -X POST https://sctransformation.netlify.app/api/autonomy/run \
  -H "content-type: application/json" \
  -H "x-vps-secret: $VPS_WEBHOOK_SECRET" \
  -d '{"workflowId":"full_morning_brief","industry":"medtech","source":"hermes"}'
```

Same payload works on VPS webhook:

```bash
curl -X POST https://sctransformation.netlify.app/api/integrations/vps/webhook \
  -H "x-vps-secret: $VPS_WEBHOOK_SECRET" \
  -H "content-type: application/json" \
  -d '{"workflowId":"fefo_weekly","source":"temporal","industry":"medtech"}'
```

### Temporal (full cluster)

```powershell
cd docs/temporal
.\install.ps1
```

Set `TEMPORAL_GATEWAY_URL=http://localhost:8090` (or public VPS URL).

```bash
# health
curl http://localhost:8090/health
# queue via SaaS
curl -X POST http://localhost:3000/api/autonomy/run \
  -H "content-type: application/json" \
  -d '{"workflowId":"control_tower_daily","industry":"medtech","via":"temporal"}'
```

Cron-only fallback: `docs/temporal/worker_stub.py`  
Hermes role map: `apps/web/src/lib/autonomy/workflows.ts`

## VRP / 3D packing

- Netlify always has Clarke–Wright CVRP + extreme-point 3D packing.
- Optimizer (Railway) exposes `POST /api/vrp/solve` and `POST /api/pack/3d` (OR-Tools when installed).
- Tools `dispatch_analysis` and `load_build` call optimizer first, fall back locally.

## Dify RAG

See **[DIFY_VPS_SETUP.md](./DIFY_VPS_SETUP.md)**.

1. Local: tunnel `8082` + `apps/web/.env.local` (`DIFY_API_URL=http://127.0.0.1:8082`).
2. Production: Dokploy HTTPS + Netlify `DIFY_API_URL` / `DIFY_API_KEY` (never localhost).
3. Upload `docs/rag/pain-playbook.md` into the Dify knowledge base.
4. Sarvam narrative: Dify → Railway OpenRouter narrate → deterministic.
