# Ops checklist — remaining steps

## Done (2026-07-18)

- [x] Supabase `0004` tables + RLS
- [x] Railway secrets + redeploy (`supabase_service_role`, `seed_secret`, `integration_secret`)
- [x] **OpenRouter RAG on Railway** (`lib/rag/localPlaybook.ts`) — works without VPS Dify
- [x] Voice + Excel channels (`/api/integrations/voice`, `/api/integrations/excel`, `/app/channels`)
- [x] Vertical skill modules: airline cargo, TS forecast, cruise, automotive JIT, F&B, DSM, capacity
- [x] Autonomy schedules for sensing/ROP, network MIP, plant ops (RCCP/prod/WH), execution (ETA/risk/ePOD), RFQ, freight weekly — 16 workflows in `agent_schedules`
- [x] Hermes linked — `/api/integrations/hermes` agent card + bridge `docs/hermes/yugam_hermes_agent.py`

## Still needs you

### 1. Netlify credits

`sctransformation.netlify.app` old build. Primary: https://nexova-web-production.up.railway.app

### 2. Public Dify (optional)

OpenRouter RAG is live. For full Dify KB: Dokploy HTTPS + `DIFY_*` — see `docs/DIFY_RAILWAY.md`.

### 3. Temporal / Hermes on VPS

SSH key for `root@13.140.181.82`.  
Hermes SaaS ingress is live; on VPS set `YUGAM_URL` + `VPS_WEBHOOK_SECRET` and run `docs/hermes/yugam_hermes_agent.py`.  
Optional: set Railway `HERMES_URL` for completion callbacks.

### 4. Live SAP + formal SOC2

`ERP_WEBHOOK_URL` / `ERP_FEED_URL` + audit process.
