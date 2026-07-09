# Yugam P2 — Phase backlog (2 / 4 / 8 weeks)

Mapped to VPS stack: **Hermes · Temporal · n8n · Dify · Flowise · Budibase**

## What shipped in P2 (this commit)

| Area | Delivered |
|------|-----------|
| **Real math** | FEFO queue, freight audit, demand forecast (exp. smoothing), dispatch fill, risk scan, scenario baseline |
| **APIs** | `/api/sarvam/chat`, `/api/agents/execute`, `/api/modules/*`, Railway mirror endpoints |
| **Sarvam** | Tool-calling (prompt → tool → math → audit log), optional LLM narrative via Railway |
| **DB** | Migration `0003_p2_operational.sql` — lots, freight, agent_executions, integrations |
| **Integrations** | CSV + SAP JSON import (`/api/integrations/erp/import`), VPS webhook (`/api/integrations/vps/webhook`) |
| **Auth** | Supabase magic link page `/login` |
| **UI** | Live module workspaces, Sarvam chat wired to tools |

### Env vars to enable full stack

**Netlify**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SEED_SECRET=
VPS_WEBHOOK_SECRET=
INTEGRATION_SECRET=
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.up.railway.app
```

**Railway (backend/)**
```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4-turbo
APP_URL=https://sctransformation.netlify.app
```

**Supabase SQL** (in order): `0001` → `0002` → `0003`, then:
```http
POST /api/seed/supabase?industry=all
x-seed-secret: <SEED_SECRET>
```

**VPS n8n webhook** (example):
```http
POST https://sctransformation.netlify.app/api/integrations/vps/webhook
x-vps-secret: <VPS_WEBHOOK_SECRET>
{"source":"n8n","workflow":"weekly_fefo_scan","agent_id":"ai-inventory-strategist"}
```

**Yugam Optimizer (forecasting)** — add a **second Railway service** from the same repo:

| Setting | Value |
|---------|--------|
| Root directory | `.` (repo root) |
| Dockerfile | `services/optimizer/Dockerfile.railway` |
| `PORT` | `8001` |
| Public domain | copy to Netlify `OPTIMIZER_URL` |

Netlify env:
```
OPTIMIZER_URL=https://YOUR_OPTIMIZER.up.railway.app
```

**GPU VPS (full neural + Chronos/Moirai):**
```bash
bash services/optimizer/deploy-vps.sh
# builds services/optimizer/Dockerfile (full requirements.txt)
```

---

## Week 1–2 — Foundation (you are here → finish)

- [x] Sarvam tool-calling on Netlify (no Railway required for math)
- [x] FEFO + freight settlement real logic
- [x] Agent execution audit table schema
- [ ] Run Supabase migrations + seed lots_inventory
- [ ] Deploy Railway with `backend/` + set `NEXT_PUBLIC_API_URL`
- [ ] Deploy **optimizer** Railway service (`Dockerfile.railway`) + set `OPTIMIZER_URL` on Netlify
- [ ] n8n on VPS: weekly cron → VPS webhook → `/api/agents/execute` with `inventory_fefo`

**Exit criteria:** Sarvam answers “which lots expire” and “which invoices to dispute” with real numbers from live site.

---

## Week 3–4 — Persistence + 2 more modules

- [ ] Wire import wizard → Supabase `lots_inventory`, `freight_invoices`
- [ ] Auth middleware on `/app/*` (optional org scoping)
- [ ] **Demand forecasting** UI with WAPE dashboard (shipped P3 — wire `OPTIMIZER_URL`)
- [ ] **Control Tower** exceptions inbox from agent_executions
- [ ] Dify RAG on pain-map + playbook docs for Sarvam narrative layer
- [ ] SAP IDoc field mapper (MATNR, WERKS, CHARG → sku, node, lot)

**Exit criteria:** One paying pilot can upload ERP CSV and see FEFO + freight recovery in dashboard.

---

## Week 5–8 — Autonomous layer

| Module | Math / agent | VPS role |
|--------|----------------|----------|
| Dispatch planning | OR-Tools VRP stub | Temporal long-running routes |
| 3D load building | 3D bin packing | Optimizer microservice |
| RFQ & bidding | Multi-criteria score | n8n carrier email loop |
| ETA prediction | Moving average + delay rules | Scraper for port delays |
| Risk management | Rules + external feeds | Bright Data / yt-dlp |
| ePOD | File upload + validation | Mobile webhook |
| Warehouse planning | Dock slot heuristic | WMS CSV connector |
| Production planning | Capacity LP stub | ERP production order export |

- [ ] Human approval queue UI (agent_executions `requires_approval`)
- [ ] Temporal workflows: `fefo_weekly`, `freight_audit_monthly`
- [ ] Hermes as single orchestrator calling Netlify APIs + Dify
- [ ] Slack / Teams bot → `/api/sarvam/chat`

**Exit criteria:** 7+ modules return real API data; 3+ run on VPS schedule without manual clicks.

---

## Module coverage matrix (today)

| Module | Math | API | DB | Autonomous |
|--------|------|-----|-----|------------|
| Demand Forecasting | ✅ ES | ✅ | ⬜ | ⬜ |
| Scenario Modelling | ✅ baseline | ✅ | ⬜ | ⬜ |
| Inventory / FEFO | ✅ | ✅ | schema | ⬜ |
| Rough Cut Capacity | ⬜ | scaffold | ⬜ | ⬜ |
| Production Planning | ⬜ | scaffold | ⬜ | ⬜ |
| Warehouse Planning | ⬜ | scaffold | ⬜ | ⬜ |
| Dispatch Planning | ✅ fill | ✅ | ⬜ | ⬜ |
| 3D Load Building | ⬜ | scaffold | ⬜ | ⬜ |
| Fleet Sizing | ⬜ | scaffold | ⬜ | ⬜ |
| RFQ & Bidding | ⬜ | scaffold | ⬜ | ⬜ |
| Control Tower | ✅ stats | ✅ | ⬜ | ⬜ |
| ETA Prediction | ⬜ | scaffold | ⬜ | ⬜ |
| Risk Management | ✅ rules | ✅ | ⬜ | ⬜ |
| ePOD | ⬜ | scaffold | ⬜ | ⬜ |
| Freight Settlement | ✅ | ✅ | schema | ⬜ |

---

## Quick test commands

```bash
# Local
npm run dev
curl "http://localhost:3000/api/modules/inventory/fefo?industry=medtech"
curl "http://localhost:3000/api/modules/freight/audit?industry=cpg"
curl -X POST http://localhost:3000/api/sarvam/chat -H "Content-Type: application/json" -d "{\"prompt\":\"Which invoices should I not pay?\"}"

# Backend
npm run backend:dev
curl http://localhost:8000/api/modules/inventory/fefo
```
