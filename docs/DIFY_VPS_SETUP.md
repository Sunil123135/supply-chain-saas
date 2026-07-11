# Connect VPS Dify to Yugam (local + Netlify)

Your UI at `http://localhost:8082/apps` is an **SSH tunnel** to the VPS.  
Netlify **cannot** use `127.0.0.1` / `localhost`.

## Already done in this repo

- [x] `apps/web/.env.local` with local Dify URL + key (gitignored)
- [x] Client accepts `.../v1` or bare origin (`normalizeDifyBaseUrl`)
- [x] Production refuses localhost Dify URLs
- [x] `/api/health/wiring` reports Dify config / localhost warning

## A — Local Sarvam + Dify (you can do today)

1. Tunnel:

```powershell
ssh -L 8082:127.0.0.1:8082 root@13.140.181.82
```

2. Confirm [http://localhost:8082/apps](http://localhost:8082/apps) loads.

3. In Dify: Chat app published, knowledge base includes `docs/rag/pain-playbook.md`, API key copied.

4. From `apps/web`:

```powershell
npm run dev
```

5. Open `/app/sarvam`, ask e.g. “which lots expire soon?” with LLM on.

6. Optional probe (tunnel must be up):

```powershell
curl.exe -s http://127.0.0.1:8082/v1/parameters -H "Authorization: Bearer YOUR_APP_KEY"
```

## B — Production (Dokploy public HTTPS) — you must do this in Dokploy

Cursor cannot SSH your VPS from this environment (permission denied).

1. Log into **Dokploy** on the VPS.
2. Open the **Dify** (or `dify-api` / `nginx`) service that serves port **8082**.
3. **Domains** → add e.g. `dify.yourdomain.com` → enable HTTPS / Let’s Encrypt.
4. Wait until this works **without** SSH tunnel:

   `https://dify.yourdomain.com`

5. Netlify → **sctransformation** → Environment variables:

| Name | Value |
|------|--------|
| `DIFY_API_URL` | `https://dify.yourdomain.com` (no `/v1`) |
| `DIFY_API_KEY` | new `app-...` key (rotate — old key was pasted in chat) |
| `DIFY_USER` | `yugam-sarvam` |

6. **Deactivate** any Netlify `DIFY_API_URL` that contains `127.0.0.1` or `localhost`.
7. **Clear cache and deploy**.
8. Check: https://sctransformation.netlify.app/api/health/wiring  
   Expect `dify_not_localhost: true` and `dify_reachable: true`.

## C — Rotate the API key (recommended)

The key shared in chat should be revoked in Dify → App → API Access → regenerate, then update `.env.local` and Netlify only.

## Wrong vs right

| Environment | `DIFY_API_URL` |
|-------------|----------------|
| Local `.env.local` | `http://127.0.0.1:8082` |
| Netlify | `https://dify.YOUR-DOMAIN` |
| Never on Netlify | `http://127.0.0.1:8082` or `.../v1` |

## After you have the public URL

Paste it here (e.g. `https://dify.xxx.com`) and we can verify the wiring probe and Netlify env wording exactly.
