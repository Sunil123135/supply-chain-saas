# Ops checklist — remaining steps

## Done (2026-07-18)

- [x] Supabase `0004` tables + RLS
- [x] Railway secrets + redeploy (`supabase_service_role`, `seed_secret`, `integration_secret`)
- [x] **OpenRouter RAG on Railway** (`lib/rag/localPlaybook.ts`) — works without VPS Dify
- [x] Voice + Excel channels (`/api/integrations/voice`, `/api/integrations/excel`, `/app/channels`)
- [x] Vertical skill modules: airline cargo, TS forecast, cruise, automotive JIT, F&B, DSM, capacity

## Still needs you

### 1. Netlify credits

`sctransformation.netlify.app` old build. Primary: https://nexova-web-production.up.railway.app

### 2. Public Dify (optional)

OpenRouter RAG is live. For full Dify KB: Dokploy HTTPS + `DIFY_*` — see `docs/DIFY_RAILWAY.md`.

### 3. Temporal on VPS

SSH key for `root@13.140.181.82`. Local Temporal OK.

### 4. Live SAP + formal SOC2

`ERP_WEBHOOK_URL` / `ERP_FEED_URL` + audit process.
