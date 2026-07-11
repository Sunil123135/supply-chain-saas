# Post-deploy wiring — finish in 20 minutes

After Railway deploy succeeds, complete these steps. You only need **two URLs** from Railway.

## A. Copy Railway domains (2 min)

1. Open [Railway project](https://railway.com/project/8ef86391-3e25-4bb0-828e-737b38f058ae)
2. For service **`backend`** → Settings → Networking → **Generate domain** (if missing) → copy  
   → e.g. `https://backend-production-xxxx.up.railway.app`
3. For service **`optimizer`** → same → copy  
   → e.g. `https://optimizer-production-xxxx.up.railway.app`

Verify in a browser:

```
https://YOUR_BACKEND.up.railway.app/health
https://YOUR_OPTIMIZER.up.railway.app/health
https://YOUR_OPTIMIZER.up.railway.app/api/forecast/models
```

## B. Netlify env vars (5 min)

[Netlify](https://app.netlify.com) → **sctransformation** → Site configuration → Environment variables

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR_BACKEND.up.railway.app` |
| `OPTIMIZER_URL` | `https://YOUR_OPTIMIZER.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase → Settings → API |
| `SUPABASE_URL` | same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Settings → API (secret) |
| `SEED_SECRET` | any long random string |
| `VPS_WEBHOOK_SECRET` | any long random string |
| `INTEGRATION_SECRET` | any long random string |
| `NEXT_PUBLIC_APP_NAME` | `Yugam` |

**Critical:** Do **not** use `https://railway.com/project/...` as `NEXT_PUBLIC_API_URL`.

Then: **Deploys → Trigger deploy → Clear cache and deploy site**

## C. Supabase SQL (5 min)

1. [Supabase](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste entire file: `apps/web/supabase/migrations/COMBINED_p0_p1_p2.sql`
3. Click **Run**

## D. Seed data (2 min)

```powershell
curl -X POST "https://sctransformation.netlify.app/api/seed/supabase?industry=all" `
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

## E. Verify (3 min)

```
https://sctransformation.netlify.app/api/health/wiring
```

Expect `"status":"ready"` and both probes `ok: true`.

Then open:

- `/app/modules/demand-forecasting` → `engine: yugam-optimizer`
- `/app/sarvam` → ask about forecast WAPE
- `/copilot` → should no longer show the dashboard URL warning

## F. Optional — n8n weekly jobs

SSH tunnel: `ssh -N -L 5678:localhost:5678 root@13.140.181.82`  
Import workflow from `docs/n8n-weekly-fefo.json` (if present) or create HTTP POST to:

```
POST https://sctransformation.netlify.app/api/integrations/vps/webhook
Header: x-vps-secret: <VPS_WEBHOOK_SECRET>
Body: {"source":"n8n","workflow":"weekly_fefo_scan","agent_id":"ai-inventory-strategist","tool":"inventory_fefo"}
```

## Paste back here

```
BACKEND=https://....up.railway.app
OPTIMIZER=https://....up.railway.app
```

I will verify health endpoints and confirm wiring.
