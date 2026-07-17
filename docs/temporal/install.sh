#!/usr/bin/env bash
# Install and start Yugam Temporal cluster (Docker) — Linux VPS / macOS
set -euo pipefail
cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit VPS_WEBHOOK_SECRET to match Netlify."
fi

echo "Building and starting Temporal stack..."
docker compose up -d --build

echo "Waiting for gateway /health..."
ok=0
for i in $(seq 1 36); do
  sleep 5
  if curl -fsS "http://localhost:8090/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  echo "  … still starting ($i)"
done

if [[ "$ok" -ne 1 ]]; then
  echo "Gateway not healthy yet. Check: docker compose logs gateway temporal"
  exit 1
fi

echo "Syncing Temporal schedules..."
docker compose --profile setup run --rm schedules

echo ""
echo "Temporal ready:"
echo "  gRPC     localhost:7233"
echo "  UI       http://localhost:8088"
echo "  Gateway  http://localhost:8090/health"
echo ""
echo "Netlify env:"
echo "  TEMPORAL_GATEWAY_URL=https://YOUR-VPS-HOST:8090"
echo "  VPS_WEBHOOK_SECRET=<same as docs/temporal/.env>"
