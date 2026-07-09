#!/usr/bin/env bash
# Deploy Yugam Optimizer on a Linux VPS (GPU optional for neural/foundation models)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

IMAGE="${IMAGE:-yugam-optimizer:latest}"
PORT="${PORT:-8001}"

echo "Building $IMAGE from repo root..."
docker build -f services/optimizer/Dockerfile -t "$IMAGE" .

echo "Starting container on port $PORT..."
docker rm -f yugam-optimizer 2>/dev/null || true
docker run -d \
  --name yugam-optimizer \
  --restart unless-stopped \
  -p "${PORT}:8001" \
  -e PORT=8001 \
  "$IMAGE"

echo "Health: curl http://localhost:${PORT}/health"
curl -sf "http://localhost:${PORT}/health" && echo ""
