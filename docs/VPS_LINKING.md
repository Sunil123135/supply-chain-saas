# Link VPS-hosted apps to Yugam SaaS

Your SaaS app is the **control plane** on Netlify. VPS apps (n8n, Hermes, Temporal, Dify, Flowise, Dokploy services) are **workers** that call into Yugam over HTTPS.

```
┌─────────────────────┐         HTTPS + secret          ┌──────────────────────────┐
│  VPS 13.140.181.82  │  ─────────────────────────────► │  sctransformation.netlify │
│  n8n / Hermes / …   │    x-vps-secret                 │  /api/integrations/vps/…  │
│  Dokploy public URL │ ◄─────────────────────────────  │  /api/agents/execute      │
└─────────────────────┘   optional callbacks            └──────────────────────────┘
```

## 1. What to share from the VPS (give these to Yugam)

| Item | Example | Where it goes |
|------|---------|---------------|
| **Public base URL** of each app | `https://n8n.yourdomain.com` or Dokploy URL | Netlify env `VPS_PUBLIC_URL` (primary) + optional `VPS_N8N_URL`, `VPS_HERMES_URL` |
| **Webhook secret** (shared) | same as Netlify `VPS_WEBHOOK_SECRET` | Already set: `yugam-vps-2026-n4r7t1wz` (rotate anytime) |
| **Which apps are live** | n8n, Hermes, Dify, … | Document in this file / team wiki |
| **SSH only if private** | `ssh root@13.140.181.82` | Use tunnel for admin UI; **do not** put private ports in SaaS |

### Recommended Netlify env (optional discovery)

```
VPS_PUBLIC_URL=https://YOUR-DOKPLOY-OR-DOMAIN
VPS_N8N_URL=https://n8n.YOUR-DOMAIN
VPS_WEBHOOK_SECRET=<same secret n8n uses>
```

SaaS does **not** need to scrape your VPS. It only needs:
1. Apps that can **call out** to Netlify, and  
2. Optionally a public URL so operators know where the worker UI lives.

## 2. How VPS apps call the SaaS (this is the real link)

### A. Run math immediately (preferred)

```http
POST https://sctransformation.netlify.app/api/integrations/vps/webhook
x-vps-secret: <VPS_WEBHOOK_SECRET>
Content-Type: application/json

{
  "source": "n8n",
  "workflow": "weekly_fefo_scan",
  "agent_id": "ai-inventory-strategist",
  "tool": "inventory_fefo",
  "industry": "medtech",
  "params": { "horizonDays": 60 }
}
```

Response includes `executed: true`, `summary`, and full `data`.

### B. Explicit agent execute (same engines)

```http
POST https://sctransformation.netlify.app/api/agents/execute
Content-Type: application/json

{
  "tool": "demand_forecast",
  "industry": "cpg",
  "agent_id": "ai-demand-analyst"
}
```

List tools: `GET https://sctransformation.netlify.app/api/agents/execute`

### C. Chat / narrative

```http
POST https://sctransformation.netlify.app/api/sarvam/chat
Content-Type: application/json

{ "prompt": "Which lots expire in 14 days?" }
```

## 3. Tools VPS can call (all 15 modules)

| Tool | Module |
|------|--------|
| `inventory_fefo` | Inventory |
| `freight_audit` | Freight settlement |
| `demand_forecast` | Demand / WAPE |
| `control_tower` | Control Tower exceptions |
| `dispatch_analysis` | Dispatch |
| `risk_scan` | Risk |
| `scenario_baseline` | Scenarios |
| `rccp` | Rough-cut capacity |
| `production_plan` | Production |
| `warehouse_plan` | Warehouse |
| `load_build` | 3D load building |
| `fleet_size` | Fleet sizing |
| `rfq_score` | RFQ & bidding |
| `eta_predict` | ETA |
| `epod_validate` | ePOD |

## 4. Wire n8n on the VPS (5 minutes)

1. Tunnel admin UI: `ssh -N -L 5678:localhost:5678 root@13.140.181.82`
2. Open `http://localhost:5678`
3. Import `docs/n8n-weekly-fefo.json`
4. In n8n → Settings → Variables: `VPS_WEBHOOK_SECRET` = same as Netlify
5. Activate workflow (Monday 06:00 cron)

Or create a one-shot HTTP node pointing at the webhook URL above.

## 5. Temporal full cluster

```bash
# On VPS (or local Docker)
cd /opt/yugam/temporal   # copy of docs/temporal
./install.sh
```

Expose gateway `8090` via Dokploy HTTPS (or SSH tunnel for local). Netlify:

```
TEMPORAL_GATEWAY_URL=https://temporal-gw.YOUR-DOMAIN
VPS_WEBHOOK_SECRET=<same secret>
```

Worker pushes to Netlify `/api/autonomy/run`; SaaS can queue via `POST /api/autonomy/run` with `"via":"temporal"`.

## 6. Dokploy / public hostname checklist

If the app is only on `http://127.0.0.1:PORT` inside the VPS, SaaS **cannot** reach it. You need either:

1. **Dokploy / Traefik public URL** with HTTPS → share that URL as `VPS_*_URL`, **or**
2. **Outbound-only** pattern (recommended): VPS schedules jobs and **pushes** results into Netlify webhooks (no inbound firewall holes).

Outbound-only is what Yugam expects today.

## 7. Verify the link

```powershell
# Probe SaaS webhook (auth required for POST)
curl -X POST "https://sctransformation.netlify.app/api/integrations/vps/webhook" `
  -H "x-vps-secret: YOUR_SECRET" `
  -H "Content-Type: application/json" `
  -d "{\"source\":\"manual\",\"tool\":\"control_tower\",\"industry\":\"medtech\"}"

# Discover tools
curl "https://sctransformation.netlify.app/api/agents/execute"
```

Wiring health: https://sctransformation.netlify.app/api/health/wiring  
Expect `vps_webhook_secret: true`.

## 8. What you do **not** need to share

- Root SSH password in chat / git  
- Private Docker ports without reverse proxy  
- Database credentials from VPS into Netlify (use Supabase on SaaS side)

---

**TL;DR:** Publish each VPS app via Dokploy HTTPS if humans need a UI; for automation, put the **same `VPS_WEBHOOK_SECRET`** in n8n/Hermes and POST `tool` jobs to `https://sctransformation.netlify.app/api/integrations/vps/webhook`.
