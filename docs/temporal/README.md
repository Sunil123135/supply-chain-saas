# Yugam Temporal — full cluster connection

## What this folder installs

| Service | Port | Role |
|---------|------|------|
| Temporal server | `7233` | Workflow engine |
| Temporal UI | `8088` | Operator console |
| Worker | — | Runs activities → calls Netlify `/api/autonomy/run` |
| Gateway | `8090` | HTTP bridge for SaaS (`/health`, `/workflows/start`, `/schedules/sync`) |

## One-command install

**Windows**
```powershell
cd supply-chain-saas\docs\temporal
.\install.ps1
```

**VPS / Linux**
```bash
cd /opt/yugam/temporal   # or docs/temporal
chmod +x install.sh
./install.sh
```

## Connect SaaS (Netlify / local Next)

```
TEMPORAL_GATEWAY_URL=http://localhost:8090
# production: https://temporal-gw.YOUR-DOMAIN or http://VPS_IP:8090
VPS_WEBHOOK_SECRET=<same as docs/temporal/.env>
```

Then:
- `GET /api/temporal/status` — gateway health
- `POST /api/autonomy/run` with `"via":"temporal"` — start on Temporal
- Autonomy UI → **Run via Temporal**

## Manual smoke

```bash
curl http://localhost:8090/health
curl -X POST http://localhost:8090/workflows/start \
  -H "content-type: application/json" \
  -H "x-vps-secret: $VPS_WEBHOOK_SECRET" \
  -d '{"workflowId":"control_tower_daily","industry":"medtech"}'
```

Worker calls `YUGAM_URL/api/autonomy/run`. For local Docker Desktop:

```
YUGAM_URL=http://host.docker.internal:3000
```

Production: set Netlify `VPS_WEBHOOK_SECRET` to match `docs/temporal/.env`, redeploy so `/api/autonomy/run` is live, then set `YUGAM_URL` back to the Netlify site. Corporate SSL inspection may need `YUGAM_SSL_VERIFY=false`.

## Cron schedules (Asia/Kolkata)

Registered by `schedules.py` / `install.*`:

| Workflow | Cron |
|----------|------|
| fefo_weekly | `0 6 * * 1` |
| freight_monthly | `0 7 1 * *` |
| freight_weekly | `0 7 * * 3` |
| control_tower_daily | `0 8 * * *` |
| dispatch_vrp | `30 5 * * 1-5` |
| load_build_3d | `45 5 * * 1-5` |
| full_morning_brief | `30 6 * * *` |
| medtech_compliance_daily | `15 7 * * *` |
| planning_pva_weekly | `0 16 * * 5` |
| erp_sync_hourly | `15 * * * *` |
| vertical_skills_weekly | `0 9 * * 3` |
| sensing_indent_daily | `0 6 * * *` |
| network_mip_weekly | `0 10 * * 2` |
| plant_ops_daily | `45 4 * * 1-5` |
| execution_daily | `0 9 * * *` |
| rfq_weekly | `0 11 * * 4` |

## Without Docker (cron-only)

```bash
pip install -r requirements.txt
# or stub:
python worker_stub.py fefo_weekly medtech
```
