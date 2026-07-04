# Yugam: Supply Chain Intelligence Platform

**The Era of Supply Chain Intelligence.**

Supply chain SaaS for mid-market **MedTech + CPG** — planning, logistics, Copilot.

## P0 deployed stack

| Layer | Platform |
|-------|----------|
| Frontend | Netlify (Next.js 14) |
| Backend API | Railway (FastAPI) |
| Database | Supabase (Postgres + pgvector) |
| Copilot LLM | OpenRouter (via backend — keys never in browser) |

## Quick links (after deploy)

- `/` — landing + backend status
- `/import` — P1 data import wizard (MedTech + India CPG starter packs)
- `/copilot` — P0 Copilot test (Checkpoint 5)
- `/api/health` — web health
- Backend `/health`, `/docs`, `POST /api/copilot`

## Setup

See **[docs/P0_SETUP.md](docs/P0_SETUP.md)** and **[YUGAM_P0_SETUP_CHECKLIST.md](YUGAM_P0_SETUP_CHECKLIST.md)**.

```powershell
cd apps\web && npm install && npm run dev
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

## Repo layout

```
supply-chain-saas/
├── apps/web/          Next.js → Netlify
├── backend/           FastAPI → Railway
├── netlify.toml
├── data/              MedTech + India CPG starter packs
├── scripts/           Synthetic data generators
├── docs/
│   ├── P0_SETUP.md
│   ├── OPTIMIZATION_SCOPE.md
│   └── COPILOT_SEED_QA.md
└── .env.example
```

## Phases

| Phase | Focus |
|-------|--------|
| **P0** | Netlify + Railway + Copilot |
| **P1** | Import wizard + starter data + control tower (in progress) |
| P2 | VRP, DC rationalization MIP, Supabase persist |
| P3–P7 | M1–M7 modules + advanced optimizers |
| P8 | Razorpay |

## Repository

https://github.com/Sunil123135/supply-chain-saas
