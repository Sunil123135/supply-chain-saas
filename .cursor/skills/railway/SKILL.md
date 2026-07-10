---
name: railway
description: Manage Railway deployments, view logs, check status, and manage environment variables for Yugam (backend + optimizer).
---

# Railway CLI Skill (Yugam)

Manage Yugam Railway deployments using the [Railway CLI](https://github.com/railwayapp/cli).

## Yugam services

| Service | Config | Port | Health |
|---------|--------|------|--------|
| `backend` | `backend/railway.toml` | 8000 | `/health` |
| `optimizer` | `services/optimizer/railway.toml` | 8001 | `/health` |

## Pre-flight

```bash
railway status 2>&1 || echo "NOT_LINKED"
```

1. **command not found** → `scoop install railway` or `bash <(curl -fsSL railway.com/install.sh) -y`
2. **Not logged in** → `railway login` or `railway login --browserless`
3. **NOT_LINKED** → `railway list` then `railway link -p <project-id>`

## Commands

### status (default)
```bash
railway status
railway domain
railway deployment list --limit 1
```

### deploy backend
```bash
railway up --service backend
```

### deploy optimizer
```bash
railway up --service optimizer
```

### health
```bash
railway domain
curl -s -o /dev/null -w "%{http_code}" -m 10 <domain-url>/health
```

### logs
```bash
railway logs --service optimizer --lines 50
railway logs --service backend --filter "@level:error"
```

### vars
```bash
railway variables --service backend
railway variables set KEY=value --service optimizer
```

Redact secrets when displaying (first 8 chars + `...`).

### CI deploy

GitHub Action uses `RAILWAY_TOKEN` secret + [bervProject/railway-deploy](https://github.com/bervProject/railway-deploy).

See `docs/RAILWAY_DEPLOY.md` for setup.

## Response format

1. Summary (success / failure)
2. Service URL
3. Next step if failed
