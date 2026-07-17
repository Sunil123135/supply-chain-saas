# First-time guide: connect your VPS apps to Yugam SaaS

You are new to VPS — use this as a checklist. No advanced Docker knowledge needed.

## Mental model (read once)

| Piece | What it is | Your URL / host |
|-------|------------|-----------------|
| **SaaS (brain + UI)** | Yugam on Netlify | https://sctransformation.netlify.app |
| **Optimizer / API** | Railway services | already wired |
| **VPS (workers)** | Server that runs n8n, Hermes, Dokploy, etc. | `13.140.181.82` |

**How they connect:** VPS apps call **out** to Netlify over the internet (HTTPS).  
Netlify does **not** need to SSH into your VPS.

```
Your laptop ──SSH tunnel──► VPS (open n8n UI)
                                  │
                                  │  HTTPS POST + secret
                                  ▼
                         Yugam SaaS (Netlify)
                         runs FEFO / forecast / …
```

---

## Part 0 — Confirm SaaS is ready (2 min)

1. Open: https://sctransformation.netlify.app/api/health/wiring  
2. Confirm `"vps_webhook_secret": true`  
3. Confirm `"status":"ready"` (or at least backend + optimizer OK)

**Shared secret** (already set on Netlify earlier):

```text
VPS_WEBHOOK_SECRET = yugam-vps-2026-n4r7t1wz
```

Use this **exact same string** inside n8n / Hermes.  
(You can rotate it later in Netlify → Environment variables.)

**Webhook URL** (bookmark this):

```text
https://sctransformation.netlify.app/api/integrations/vps/webhook
```

---

## Part 1 — Log into the VPS (SSH)

### Windows (PowerShell)

```powershell
ssh root@13.140.181.82
```

- First time: type `yes` when asked about fingerprint  
- Enter the VPS password (or use your SSH key if already set up)

If SSH fails: check cloud firewall allows port **22**, and that you have the correct password from your VPS provider.

### See what’s running (optional)

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

Look for names like `n8n`, `dokploy`, `hermes`, `dify`, `flowise`, `temporal`.

Exit SSH when done:

```bash
exit
```

---

## Part 2 — Open n8n in your browser (SSH tunnel)

n8n often listens only on the VPS (`localhost:5678`), not on the public internet.  
So you **tunnel** it to your PC:

### On your Windows machine (leave this window open)

```powershell
ssh -N -L 5678:localhost:5678 root@13.140.181.82
```

- `-N` = don’t open a shell, just forward ports  
- Leave this PowerShell window running  

### In Chrome / Edge

Open: http://localhost:5678

You should see the **n8n** login / editor.

> If port 5678 is wrong, on the VPS run `docker ps` and find n8n’s port mapping (e.g. `0.0.0.0:5678->5678/tcp`).

---

## Part 3 — Put the shared secret into n8n

1. In n8n: **Settings** (gear) → **Variables** (or **Environments**, depending on version)  
2. Add:

| Name | Value |
|------|--------|
| `VPS_WEBHOOK_SECRET` | `yugam-vps-2026-n4r7t1wz` |

3. Save

This must match Netlify’s `VPS_WEBHOOK_SECRET`.

---

## Part 4 — First connection test (manual, 1 click)

Do this **before** weekly cron — proves the link works.

### Option A — from your laptop (PowerShell)

```powershell
curl.exe -X POST "https://sctransformation.netlify.app/api/integrations/vps/webhook" `
  -H "x-vps-secret: yugam-vps-2026-n4r7t1wz" `
  -H "Content-Type: application/json" `
  -d "{\"source\":\"manual\",\"workflow\":\"first_test\",\"tool\":\"control_tower\",\"industry\":\"medtech\"}"
```

**Success looks like:**

- `"ok": true`  
- `"executed": true` (if latest code is deployed)  
- a `summary` about exceptions / shipments  

**Failure:**

| Response | Fix |
|----------|-----|
| `401 Unauthorized` | Secret mismatch — check Netlify env + curl header |
| Timeout / SSL errors | Corporate proxy; try from phone hotspot or another network |
| `"executed": false` + unknown tool | Typo in `tool` name |

### Option B — create a one-shot workflow in n8n

1. **Workflows** → **Add workflow**  
2. Add node: **Manual Trigger**  
3. Add node: **HTTP Request**  
4. Configure HTTP Request:

| Field | Value |
|-------|--------|
| Method | `POST` |
| URL | `https://sctransformation.netlify.app/api/integrations/vps/webhook` |
| Authentication | None |
| Headers | `x-vps-secret` = `{{ $env.VPS_WEBHOOK_SECRET }}` |
| Headers | `Content-Type` = `application/json` |
| Body | JSON (below) |

Body:

```json
{
  "source": "n8n",
  "workflow": "first_test",
  "agent_id": "ai-visibility-controller",
  "tool": "control_tower",
  "industry": "medtech"
}
```

5. Click **Execute workflow**  
6. Open the HTTP node result — you should see Yugam JSON with a summary

---

## Part 5 — Import the weekly Yugam workflow

On your PC, the file is:

```text
supply-chain-saas/docs/n8n-weekly-fefo.json
```

In n8n:

1. **Workflows** → **Import from File** (or **…** → Import)  
2. Select `n8n-weekly-fefo.json`  
3. Open the imported workflow  
4. Confirm both HTTP nodes point to:

   `https://sctransformation.netlify.app/api/integrations/vps/webhook`

5. Confirm header uses `{{ $env.VPS_WEBHOOK_SECRET }}`  
6. Toggle **Active** = ON  

This runs **Monday 06:00** (cron) and calls:

- `inventory_fefo`  
- `demand_forecast`

You can also hit **Execute workflow** once now to test.

---

## Part 6 — Optional: give SaaS your VPS public URLs

Only needed so you (and health checks) remember where worker UIs live.

If Dokploy already gave you HTTPS URLs (example):

```text
https://n8n.YOURDOMAIN.com
https://dokploy.YOURDOMAIN.com
```

Add on Netlify → **sctransformation** → Environment variables:

| Key | Value |
|-----|--------|
| `VPS_PUBLIC_URL` | your main Dokploy / panel URL |
| `VPS_N8N_URL` | your public n8n URL (if any) |

Then **Clear cache and deploy**.

If you **only** use SSH tunnels (no public domain), skip this — automation still works via outbound POSTs.

---

## Part 7 — Other VPS apps (Hermes, Dify, Flowise, Temporal)

Same pattern for each:

1. Open the app UI (tunnel or Dokploy URL)  
2. Create an HTTP / webhook action that POSTs to the Yugam webhook  
3. Always send header: `x-vps-secret: <same secret>`  
4. Always include a `"tool": "..."` from the list below  

### Tools you can call

| `tool` value | What it does |
|--------------|--------------|
| `inventory_fefo` | Near-expiry / FEFO queue |
| `freight_audit` | Freight overbill recovery |
| `demand_forecast` | WAPE / forecast dashboard |
| `control_tower` | Exception inbox |
| `dispatch_analysis` | Underfilled loads |
| `risk_scan` | In-transit risks |
| `scenario_baseline` | Demand what-if |
| `rccp` | Rough-cut capacity |
| `production_plan` | Production from open orders |
| `warehouse_plan` | Dock util |
| `load_build` | 3D / cube load builder |
| `fleet_size` | Fleet mix |
| `rfq_score` | Carrier RFQ scoring |
| `eta_predict` | ETA / late risk |
| `epod_validate` | ePOD / e-way checks |

List from API: https://sctransformation.netlify.app/api/agents/execute

### Alternate endpoint (no webhook secret)

```http
POST https://sctransformation.netlify.app/api/agents/execute
Content-Type: application/json

{
  "tool": "freight_audit",
  "industry": "cpg",
  "agent_id": "ai-settlement-auditor"
}
```

Use the **webhook** for VPS automation (secret-protected). Use `/api/agents/execute` for quick tests from your laptop.

---

## Part 8 — Dokploy public HTTPS (when you want a URL without SSH)

1. Log into Dokploy (usually via tunnel or its own domain)  
2. Open the **n8n** (or other) service  
3. Add a **domain** / Traefik route with HTTPS  
4. Wait until `https://n8n.yourdomain.com` loads  
5. Put that URL in Netlify as `VPS_N8N_URL`  
6. You can then stop using the SSH tunnel for daily n8n editing  

Until then, **SSH tunnel is fine**.

---

## Part 9 — Success checklist

- [ ] SSH to `root@13.140.181.82` works  
- [ ] Tunnel opens http://localhost:5678 (n8n)  
- [ ] `VPS_WEBHOOK_SECRET` set in n8n = same as Netlify  
- [ ] Manual curl or n8n test returns `"ok": true`  
- [ ] Weekly workflow imported and **Active**  
- [ ] (Optional) Dokploy public URLs saved in Netlify  

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| SSH connection refused | Firewall / wrong IP / VPS powered off |
| localhost:5678 blank | Tunnel not running; wrong port; n8n container down (`docker ps`) |
| 401 from webhook | Secret typo; redeploy Netlify after changing env |
| Workflow runs but SaaS unchanged | Check HTTP response body in n8n; ensure `"tool"` is present |
| Latest tools missing on live site | Push/deploy latest `main` to Netlify (module math + webhook execute) |

---

## Security habits

- Never commit the VPS root password to GitHub  
- Prefer SSH keys over password long-term  
- Rotate `VPS_WEBHOOK_SECRET` if it was pasted in chat  
- Don’t open n8n to the whole internet without login + HTTPS  

---

## What to send me if you want help wiring a specific app

Send **only**:

1. App name (n8n / Hermes / Dify / …)  
2. How you open it today (`localhost:PORT` via tunnel, or `https://…`)  
3. Screenshot or note that the Part 4 test already returned `"ok": true`

Do **not** paste root passwords or API keys in chat.
