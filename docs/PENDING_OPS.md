# Ops checklist — remaining steps

## Done from this machine (2026-07-17)

- [x] Pushed P4 + Temporal + ERP sync code to GitHub `main` (`89d70fc`, `51c4cec`)
- [x] Netlify env: `BOT_OPEN_DEMO`, `INTEGRATION_SECRET`, `VPS_WEBHOOK_SECRET` aligned
- [x] **Railway `nexova-web` deployed** with autonomy APIs live  
  → https://nexova-web-production.up.railway.app/api/autonomy/run
- [x] Local Temporal cluster up (gateway `:8090`, `erp_sync_hourly` schedule)
- [x] Temporal worker pointed at Railway web (`YUGAM_URL`)

## Blocked / needs you

### 1. Supabase migration `0004` (tables still missing)

[SQL Editor](https://supabase.com/dashboard/project/mtokwiodxducksyrixle/sql) → paste  
`apps/web/supabase/migrations/0004_p4_enterprise.sql` → **Run**

Without this: audit / schedules / demo leads / `executionId` persistence stay empty.

### 2. Netlify credits exhausted

Deploys skipped: **account credit usage exceeded**.  
`sctransformation.netlify.app` is still on old build (autonomy 404).  
Add credits **or** use Railway web as primary frontend until Netlify is topped up.

### 3. Temporal on VPS (optional)

SSH key needed for `root@13.140.181.82`. Local Docker already works.

### 4. Live SAP + formal SOC2

Partner URLs / process — unchanged.
