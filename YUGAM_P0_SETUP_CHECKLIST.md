# Yugam P0 Setup Checklist
**Target:** Deploy Next.js frontend (Netlify) + FastAPI backend (Railway) + working Copilot call to OpenRouter  
**Estimated time:** 2–3 hours  
**Repo:** https://github.com/Sunil123135/supply-chain-saas

---

## CREDENTIALS (store locally only — never commit)

Put real values in:
- `apps/web/.env.local`
- `backend/.env.backend`

Use placeholders from `.env.example` and `backend/.env.example`.

> **Security:** If keys were ever pasted into chat or docs, rotate them in Supabase and OpenRouter dashboards.

| Secret | Where to set |
|--------|----------------|
| Supabase URL + anon key | `NEXT_PUBLIC_*` in `.env.local`; service role in `.env.backend` |
| OpenRouter API key | `OPENROUTER_API_KEY` in `.env.backend` + Railway variables |
| Railway API URL | `NEXT_PUBLIC_API_URL` in Netlify + `.env.local` |

---

## PHASE 1: GITHUB & LOCAL SETUP (20 min)

### Step 1: Clone repo
```bash
git clone https://github.com/Sunil123135/supply-chain-saas.git
cd supply-chain-saas
```

### Step 2: Create `.env.local` (Next.js frontend secrets)
```bash
cd apps/web
cp ../../.env.example .env.local
# Edit .env.local — add Supabase URL, anon key, NEXT_PUBLIC_API_URL
```

### Step 3: Create `.env.backend` (FastAPI backend secrets)
```bash
cd backend
cp .env.example .env.backend
# Edit .env.backend — add OPENROUTER_API_KEY, Supabase service role
```

✅ **Checkpoint 1:** GitHub repo ready, credentials stored locally

---

## PHASE 2: NETLIFY SETUP (15 min)

### Step 4: Connect GitHub repo
- [ ] netlify.com → New site from Git → `Sunil123135/supply-chain-saas`
- [ ] Branch: `main`
- [ ] `netlify.toml` handles build (`base = apps/web`)

### Step 5: Set Netlify environment variables
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_API_URL=<railway-url-after-deploy>
```
(Do **not** put OpenRouter key in Netlify — backend only.)

### Step 6: Deploy
- [ ] Deploy site; copy Netlify URL (e.g. `https://yugam-xxx.netlify.app`)

✅ **Checkpoint 2:** Netlify site deployed

---

## PHASE 3: NEXT.JS SKELETON (15 min)

Code at `apps/web/` — landing `/`, Copilot `/copilot`, health `/api/health`.

✅ **Checkpoint 3:** `/copilot` accessible on Netlify

---

## PHASE 4: RAILWAY SETUP (20 min)

### Step 7: Create FastAPI service
- Root directory: `backend`
- `main.py` — `/health`, `POST /api/copilot`

### Step 8: Railway environment variables
```
OPENROUTER_API_KEY=<your-key>
SUPABASE_URL=<your-url>
SUPABASE_SERVICE_ROLE_SECRET=<your-service-role>
APP_URL=<your-netlify-url>
```

### Step 9: Deploy and copy Railway public URL

✅ **Checkpoint 4:** FastAPI running on Railway

---

## PHASE 5: CONNECTIVITY & TESTING (15 min)

### Step 10: Update URLs
- Set `NEXT_PUBLIC_API_URL` in Netlify env and `apps/web/.env.local`

### Step 11: Test Copilot on Netlify
- [ ] Visit `https://your-site.netlify.app/copilot`
- [ ] Test prompt → OpenRouter response via Railway

✅ **Checkpoint 5:** End-to-end Netlify → Railway → OpenRouter

---

## PHASE 6: DOCUMENTATION (10 min)

- [ ] Document frontend + backend URLs in README or wiki
- [ ] Run Supabase migration: `apps/web/supabase/migrations/0001_p0_extensions.sql`

✅ **Checkpoint 6 — P0 complete**

---

## Local dev

```powershell
cd apps\web && npm install && npm run dev
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
```

See [docs/P0_SETUP.md](docs/P0_SETUP.md) for troubleshooting.
