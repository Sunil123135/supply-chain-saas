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
- [x] Dual-source loader (Supabase lots/SKUs/nodes/freight → CSV fallback)
- [x] Import wizard **Save to workspace** (`POST /api/import/persist`)
- [x] Approvals inbox UI + API (`/approvals`, approve/reject)
- [x] Control Tower merges math exceptions + `agent_executions` (taxonomy)
- [x] FEFO ABC-class priority boost (inventory-manager)
- [x] Thin auth middleware (`YUGAM_REQUIRE_AUTH` + demo cookie)
- [x] Run Supabase migrations + seed lots_inventory
- [x] Deploy Railway with `backend/` + set `NEXT_PUBLIC_API_URL`
- [x] Deploy **optimizer** Railway service (`Dockerfile.railway`) + set `OPTIMIZER_URL` on Netlify
- [x] n8n on VPS: weekly cron → VPS webhook → tool execute


**Exit criteria:** Sarvam answers “which lots expire” and “which invoices to dispute” with real numbers from live site.

---

## Week 3–4 — Persistence + 2 more modules

- [x] Wire import wizard → Supabase `lots_inventory`, `freight_invoices`
- [x] Auth middleware on `/app/*` (optional via `YUGAM_REQUIRE_AUTH=true` + demo cookie)
- [x] **Demand forecasting** UI with WAPE dashboard (shipped P3 — wire `OPTIMIZER_URL`)
- [x] **Control Tower** exceptions inbox from agent_executions + taxonomy
- [x] Dify RAG on pain-map + playbook docs for Sarvam narrative layer
- [x] SAP IDoc field mapper (MATNR, WERKS, CHARG → sku, node, lot) — `lib/integrations/sapIdoc.ts`

**Exit criteria:** One paying pilot can upload ERP CSV and see FEFO + freight recovery in dashboard.

---

## Week 5–8 — Autonomous layer

| Module | Math / agent | VPS role |
|--------|----------------|----------|
| Dispatch planning | OR-Tools VRP | Temporal long-running routes |
| 3D load building | 3D bin packing | Optimizer microservice |
| RFQ & bidding | Multi-criteria score | n8n carrier email loop |
| ETA / track-trace | Multimodal milestones | Carrier/EDI feeds |
| Risk / cold-chain | GDP excursion rules | Sensor feeds later |
| ePOD | File upload + validation | Mobile webhook |
| Warehouse planning | Dock slot heuristic | WMS CSV connector |
| Production planning | Capacity LP | ERP production order export |
| ATP / lot mortgage / E&O | Product-depth engines | Scheduled MedTech compliance |

- [x] Temporal workflows: `fefo_weekly`, `freight_audit_monthly` (+ more via `/api/autonomy/run`)
- [x] Hermes as single orchestrator calling Netlify APIs (+ Dify narrative)
- [x] Slack / Teams bot → `/api/sarvam/chat` (+ WhatsApp)
- [x] Deeper CVRP + 3D packing (TS local + optimizer OR-Tools)
- [x] Dify RAG narrative layer (`docs/rag/pain-playbook.md`)
- [x] Product depth: ATP, lot mortgage, E&O, cold-chain, track-trace, PVA, forecast compare
- [x] Slack HMAC (`SLACK_SIGNING_SECRET`) + confidence gates + `/audit` UX
- [x] Contact → CRM webhook (`CRM_WEBHOOK_URL`) + `demo_leads` table
- [x] Temporal docker-compose + `docs/temporal/worker.py`
- [x] Temporal gateway + schedules + SaaS `TEMPORAL_GATEWAY_URL` client (`/api/temporal/status`)
- [x] Install scripts (`docs/temporal/install.ps1` / `install.sh`) — run on host/VPS
- [x] ERP write-back queue + continuous sync API (`/api/integrations/erp/sync`, Temporal `erp_sync_hourly`)
- [ ] Live SAP middleware credentials (`ERP_WEBHOOK_URL` / `ERP_FEED_URL`) — ops/partner


**Exit criteria:** 7+ modules return real API data; 3+ run on VPS schedule without manual clicks.

---

## Module coverage matrix (today)

| Module | Math | API | DB | Autonomous |
|--------|------|-----|-----|------------|
| Demand Forecasting | ✅ optimizer + local | ✅ | ⬜ | n8n ready |
| Forecast compare / MAPE | ✅ | ✅ tool | ⬜ | weekly PVA wf |
| Demand Sensing | ✅ OR layer | ✅ tool | ⬜ | ⬜ |
| Scenario / Network MIP | ✅ PuLP/OR-Tools | ✅ | ⬜ | ⬜ |
| Plan-vs-actual | ✅ | ✅ tool | ⬜ | weekly wf |
| Inventory / FEFO | ✅ | ✅ | schema | n8n ready |
| MEIO / Safety stock | ✅ OR layer | ✅ | ⬜ | weekly wf |
| Auto-indent (ROP) | ✅ OR layer | ✅ | ⬜ | ⬜ |
| ATP allocation | ✅ | ✅ tool | ⬜ | MedTech daily |
| Lot mortgage | ✅ | ✅ tool | ⬜ | MedTech daily |
| E&O / aging | ✅ | ✅ tool | ⬜ | FEFO weekly |
| Cold-chain GDP | ✅ | ✅ tool | ⬜ | MedTech daily |
| Track-and-trace | ✅ | ✅ tool | ⬜ | tower daily |
| Rough Cut Capacity | ✅ | ✅ | ⬜ | ⬜ |
| Production Planning | ✅ + LP | ✅ | ⬜ | ⬜ |
| Warehouse Planning | ✅ | ✅ | ⬜ | ⬜ |
| Dispatch Planning | ✅ OR-Tools CVRP | ✅ | ⬜ | ⬜ |
| 3D Load Building | ✅ | ✅ | ⬜ | ⬜ |
| Fleet Sizing | ✅ | ✅ | ⬜ | ⬜ |
| RFQ & Bidding | ✅ | ✅ | ⬜ | ⬜ |
| Control Tower | ✅ exceptions | ✅ | ⬜ | daily |
| ETA Prediction | ✅ | ✅ | ⬜ | ⬜ |
| Risk Management | ✅ | ✅ | ⬜ | ⬜ |
| ePOD | ✅ | ✅ | ⬜ | ⬜ |
| Freight Settlement | ✅ | ✅ | schema | ⬜ |

VPS webhook now **executes** `tool` when provided (see `docs/VPS_LINKING.md`).

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
