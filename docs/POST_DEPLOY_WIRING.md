# Post-deploy wiring — finish in 20 minutes

## Live Railway URLs (set 2026-07-11)

| Service | Public URL | Health |
|---------|------------|--------|
| **backend** | https://backend-production-1305.up.railway.app | `/health` → ok |
| **optimizer** | https://optimizer-production-c520.up.railway.app | `/health` → ok · 11 forecast models |
| nexova-web (optional mirror) | https://nexova-web-production.up.railway.app | Next.js frontend only |

## A. Netlify env vars (required — do this now)

[Netlify](https://app.netlify.com) → **sctransformation** → Site configuration → Environment variables

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://backend-production-1305.up.railway.app` |
| `OPTIMIZER_URL` | `https://optimizer-production-c520.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase → Settings → API |
| `SUPABASE_URL` | same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API (secret) |
| `SEED_SECRET` | any long random string |
| `VPS_WEBHOOK_SECRET` | any long random string |
| `INTEGRATION_SECRET` | any long random string |
| `NEXT_PUBLIC_APP_NAME` | `Yugam` |

**Critical:** Do **not** use `https://railway.com/project/...` or the Supabase REST URL as `NEXT_PUBLIC_API_URL`.

Then: **Deploys → Trigger deploy → Clear cache and deploy site**

## B. Supabase SQL (5 min)

1. [Supabase](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste entire file: `apps/web/supabase/migrations/COMBINED_p0_p1_p2.sql`
3. Click **Run**

## C. Seed data (2 min)

```powershell
curl -X POST "https://sctransformation.netlify.app/api/seed/supabase?industry=all" `
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

## D. Verify (3 min)

```
https://sctransformation.netlify.app/api/health/wiring
https://backend-production-1305.up.railway.app/health
https://optimizer-production-c520.up.railway.app/api/forecast/models
```

Expect wiring `"status":"ready"` and forecast page `engine: yugam-optimizer`.

## E. Redeploying backend/optimizer

GitHub auto-builds may use Railpack incorrectly. Prefer CLI from repo root:

```powershell
C:\yugam-opt\bin\railway.exe up --service backend --detach --yes
C:\yugam-opt\bin\railway.exe up --service optimizer --detach --yes
```

## F. Optional — n8n weekly jobs

SSH tunnel: `ssh -N -L 5678:localhost:5678 root@13.140.181.82`  
Import `docs/n8n-weekly-fefo.json`.

Full VPS linking guide: **[VPS_LINKING.md](./VPS_LINKING.md)** — what URLs/secrets to share, webhook contract, all 15 tools.
