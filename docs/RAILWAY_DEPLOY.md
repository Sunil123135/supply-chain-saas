# Deploy Yugam to Railway

Uses [Railway CLI](https://github.com/railwayapp/cli) via [bervProject/railway-deploy](https://github.com/bervProject/railway-deploy) GitHub Action.

## One-time setup (15 min)

### 1. Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `Sunil123135/supply-chain-saas`

### 2. Add two services

**Service A — `backend` (Yugam API / Sarvam LLM)**

| Setting | Value |
|---------|--------|
| Service name | `backend` |
| Config file | `backend/railway.toml` |
| Variable `PORT` | `8000` |

Add env vars: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `APP_URL`, `SUPABASE_URL`, etc.

**Service B — `optimizer` (forecasting)**

| Setting | Value |
|---------|--------|
| Service name | `optimizer` |
| Config file | `services/optimizer/railway.toml` |
| Variable `PORT` | `8001` |

Uses `Dockerfile.railway` (CPU — no GPU): ETS, Prophet, Croston, LightGBM.

### 3. Generate domains

Each service → **Settings** → **Networking** → **Generate Domain**

- `https://backend-xxxx.up.railway.app`
- `https://optimizer-xxxx.up.railway.app`

### 4. GitHub secret

Railway project → **Settings** → **Tokens** → **Create project token**

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|------|--------|
| `RAILWAY_TOKEN` | your project token |

### 5. Netlify env vars

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://backend-xxxx.up.railway.app` |
| `OPTIMIZER_URL` | `https://optimizer-xxxx.up.railway.app` |

Redeploy Netlify after setting.

## Auto-deploy

Push to `main` triggers `.github/workflows/railway-deploy.yml`.

Manual redeploy: GitHub → **Actions** → **Railway Deploy** → **Run workflow**.

## Local CLI (optional)

Install per [railwayapp/cli](https://github.com/railwayapp/cli):

```powershell
# Windows — if npm fails (corporate SSL), use Scoop or WSL:
scoop install railway
# or
bash <(curl -fsSL railway.com/install.sh) -y
```

```bash
railway login
railway link          # pick your Yugam project
railway up --service backend
railway up --service optimizer
```

Browserless login (SSH / no browser):

```bash
railway login --browserless
```

## Verify

```bash
curl https://YOUR_BACKEND.up.railway.app/health
curl https://YOUR_OPTIMIZER.up.railway.app/health
curl https://YOUR_OPTIMIZER.up.railway.app/api/forecast/models
```

## Cursor skill

Railway deploy skill lives at `.cursor/skills/railway/SKILL.md` (from [mshumer/claude-skill-railway](https://github.com/mshumer/claude-skill-railway)).

Ask Cursor: *"railway status"*, *"railway deploy optimizer"*, *"railway health"*.
