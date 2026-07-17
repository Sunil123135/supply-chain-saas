# Open product decisions — proposed defaults

| Decision | Proposed default | Rationale |
|----------|------------------|-----------|
| First target vertical | **MedTech + India CPG** (dual packs) | MedTech differentiator; CPG proves logistics |
| ERP connector first | **SAP** (CSV now → IDoc mapper next) | QuidelOrtho-like buyers |
| Telematics partner | **Carrier API + e-way EDI first**; OEM TBD | Don't block track-trace on OEM contract |
| Copilot brand | **Sarvam** (locked) | Already shipped |
| Voice / Excel channels | Deferred to P6 | Text + Slack/Teams/WhatsApp first |

## Env to enable enterprise paths

```
YUGAM_REQUIRE_AUTH=true
YUGAM_DEMO_ROLE=planner
SLACK_SIGNING_SECRET=...
BOT_SHARED_SECRET=...
CRM_WEBHOOK_URL=https://hooks.zapier.com/...
CRM_WEBHOOK_SECRET=...
```

## Temporal on VPS / local

```powershell
cd docs/temporal
.\install.ps1
```

```bash
cd docs/temporal && chmod +x install.sh && ./install.sh
```

Netlify / `.env.local`:
```
TEMPORAL_GATEWAY_URL=http://localhost:8090
# production: https://temporal-gw.YOUR-DOMAIN
VPS_WEBHOOK_SECRET=<same as docs/temporal/.env>
```

See `docs/temporal/README.md`.
