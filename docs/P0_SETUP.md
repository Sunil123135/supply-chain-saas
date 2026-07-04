# P0 — Yugam Setup (aligned with YUGAM_P0_SETUP_CHECKLIST.md)

**Product:** Yugam — *The Era of Supply Chain Intelligence*  
**Repo:** [Sunil123135/supply-chain-saas](https://github.com/Sunil123135/supply-chain-saas)  
**Stack:** Next.js (Netlify) + FastAPI (Railway) + Supabase + OpenRouter Copilot

**Master checklist:** [YUGAM_P0_SETUP_CHECKLIST.md](../YUGAM_P0_SETUP_CHECKLIST.md)

---

## P0 acceptance checklist (30 steps → 6 checkpoints)

### Checkpoint 1 — GitHub & local
- [ ] Repo `supply-chain-saas` on GitHub
- [ ] `apps/web/.env.local` from `.env.example` (Supabase + API URL)
- [ ] `backend/.env.backend` from `.env.example` (OpenRouter + Supabase service role)
- [ ] Secrets **not** committed (see `.gitignore`)

### Checkpoint 2 — Netlify frontend
- [ ] Netlify site from Git; uses `netlify.toml` (base `apps/web`)
- [ ] Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- [ ] Deploy succeeds; landing shows **Yugam** + backend status

### Checkpoint 3 — Next.js skeleton
- [ ] `/` — Yugam landing + live backend status
- [ ] `/api/health` — `{ status: "ok", app: "Yugam" }`
- [ ] `/copilot` — Copilot test UI

### Checkpoint 4 — Railway backend
- [ ] Service root: `backend`
- [ ] Env: `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_SECRET`
- [ ] `GET /health` → `{ status: "ok", service: "yugam-api" }`
- [ ] `GET /docs` — FastAPI Swagger

### Checkpoint 5 — End-to-end Copilot
- [ ] `NEXT_PUBLIC_API_URL` on Netlify points to Railway URL
- [ ] `/copilot` → Test Copilot → OpenRouter response (no CORS errors)

### Checkpoint 6 — P0 complete
- [ ] Frontend URL documented
- [ ] Backend URL documented
- [ ] Copilot test passes on production Netlify URL
- [ ] Supabase SQL: `apps/web/supabase/migrations/0001_p0_extensions.sql`
- [ ] `docs/COPILOT_SEED_QA.md` in repo for P6 KB seed

---

## Local dev (PowerShell)

```powershell
# Frontend
cd apps\web
copy ..\..\.env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev

# Backend (separate terminal)
cd backend
copy .env.example .env.backend
# Edit .env.backend — add OPENROUTER_API_KEY
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Verify:** http://localhost:3000 → http://localhost:3000/copilot → backend online

---

## Netlify settings

| Setting | Value |
|---------|--------|
| Base directory | *(repo root — `netlify.toml` sets `base = "apps/web"`)* |
| Build command | `npm run build` (in `apps/web`) |
| Plugin | `@netlify/plugin-nextjs` |

---

## Railway settings

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Start | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

---

## Next phase (P1)

- Supabase Auth (magic link)
- Organizations + RLS
- Synthetic sample data (100 SKUs × 24mo) if no Excel yet

See `YUGAM_P0_SETUP_CHECKLIST.md` → Next Steps After P0.
