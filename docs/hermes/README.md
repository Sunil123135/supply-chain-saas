# Link Hermes to Yugam SaaS

Hermes is the **orchestrator**; Yugam on Railway is the **control plane** (math + autonomy + Sarvam).

```
┌──────────────┐   x-vps-secret    ┌─────────────────────────────────────┐
│ Hermes (VPS) │ ───────────────► │ nexova-web-production.up.railway.app │
│ bridge agent │ ◄─────────────── │ /api/integrations/hermes             │
└──────────────┘   optional notify └─────────────────────────────────────┘
```

## 1. SaaS side (in repo)

| Piece | Path |
|-------|------|
| Agent card | `GET /api/integrations/hermes` |
| Run role / workflow / tool / chat | `POST /api/integrations/hermes` |
| Role → workflow map | `apps/web/src/lib/hermes/manifest.ts` |
| Bridge script | `docs/hermes/yugam_hermes_agent.py` |

Railway env (recommended):

```
APP_URL=https://nexova-web-production.up.railway.app
VPS_WEBHOOK_SECRET=<same as Hermes>
BOT_OPEN_DEMO=true
HERMES_URL=https://hermes.YOUR-DOMAIN
```

`HERMES_URL` is optional — only needed if SaaS should POST completion callbacks to Hermes.

## 2. Hermes / VPS side (5 minutes)

```bash
export YUGAM_URL=https://nexova-web-production.up.railway.app
export VPS_WEBHOOK_SECRET=your-shared-secret
export YUGAM_INDUSTRY=medtech
# if corporate SSL inspection:
export YUGAM_SSL_VERIFY=false

python docs/hermes/yugam_hermes_agent.py manifest
python docs/hermes/yugam_hermes_agent.py role orchestrator
python docs/hermes/yugam_hermes_agent.py workflow sensing_indent_daily
```

Cron example (daily morning brief):

```cron
30 6 * * * YUGAM_URL=... VPS_WEBHOOK_SECRET=... python /opt/yugam/yugam_hermes_agent.py role orchestrator
```

Or configure Hermes HTTP tool:

```http
POST https://nexova-web-production.up.railway.app/api/integrations/hermes
x-vps-secret: <secret>
Content-Type: application/json

{ "action": "run_role", "role": "replenishment_controller", "industry": "medtech" }
```

## 3. Roles

| Hermes role | Workflow |
|-------------|----------|
| `orchestrator` | `full_morning_brief` |
| `inventory_guardian` | `fefo_weekly` |
| `settlement_auditor` | `freight_weekly` / monthly |
| `visibility_controller` | `control_tower_daily` |
| `replenishment_controller` | `sensing_indent_daily` |
| `plant_controller` | `plant_ops_daily` |
| `execution_controller` | `execution_daily` |
| `network_planner` | `network_mip_weekly` |
| `sourcing_controller` | `rfq_weekly` |

Full live list: `GET /api/integrations/hermes`.

## 4. UI

- Autonomy page: `/autonomy` — Hermes card + Run via Hermes
- Probe: `/api/integrations/hermes?ping=1`
