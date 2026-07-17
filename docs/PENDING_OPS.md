# Ops checklist — still needs your credentials

Code for these is ready; they cannot finish from this machine alone.

## 1. Supabase — run migration `0004`

Open Supabase SQL Editor → paste `apps/web/supabase/migrations/0004_p4_enterprise.sql` → Run.

Creates: `demo_leads`, `audit_events`, `agent_schedules`.

## 2. Netlify env + redeploy

Set (Site settings → Environment variables), then **Trigger deploy**:

```
TEMPORAL_GATEWAY_URL=https://YOUR-TEMPORAL-GATEWAY   # or http://VPS:8090
VPS_WEBHOOK_SECRET=<same as docs/temporal/.env>
SLACK_SIGNING_SECRET=...
INTEGRATION_SECRET=...
ERP_WEBHOOK_URL=...          # optional — live SAP middleware
ERP_FEED_URL=...             # optional — inbound IDoc JSON feed
CRM_WEBHOOK_URL=...          # optional
YUGAM_REQUIRE_AUTH=true      # optional harden
```

Without redeploy, Temporal worker gets **404** on `/api/autonomy/run`.

## 3. Temporal on VPS

SSH (key required — last probe: `Permission denied`):

```bash
scp -r docs/temporal root@13.140.181.82:/opt/yugam/temporal
ssh root@13.140.181.82 'cd /opt/yugam/temporal && ./install.sh'
```

Local Docker already works: `docs/temporal/install.ps1` (Docker Desktop must be running).

## 4. Live SAP partner

Mapper + write-back queue + continuous sync are in code.  
Point `ERP_WEBHOOK_URL` / `ERP_FEED_URL` at your middleware (CPI / Boomi / custom).  
True RFC/IDoc partner login is outside this repo.

## 5. Formal compliance (not software)

SOC2 / pen-test / ISO — see `docs/SECURITY_SOC2.md` checklist (process + vendors).
