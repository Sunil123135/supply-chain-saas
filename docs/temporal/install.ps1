#Requires -Version 5.1
<#
.SYNOPSIS
  Install and start Yugam Temporal cluster (Docker).
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — edit VPS_WEBHOOK_SECRET to match Netlify."
}

Write-Host "Building and starting Temporal stack..."
docker compose up -d --build

Write-Host "Waiting for gateway /health..."
$ok = $false
for ($i = 0; $i -lt 36; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:8090/health" -TimeoutSec 5
    if ($r.ok) { $ok = $true; break }
  } catch {
    Write-Host "  … still starting ($i)"
  }
}

if (-not $ok) {
  Write-Host "Gateway not healthy yet. Check: docker compose logs gateway temporal"
  exit 1
}

Write-Host "Syncing Temporal schedules..."
docker compose --profile setup run --rm schedules

Write-Host ""
Write-Host "Temporal ready:"
Write-Host "  gRPC     localhost:7233"
Write-Host "  UI       http://localhost:8088"
Write-Host "  Gateway  http://localhost:8090/health"
Write-Host ""
Write-Host "Netlify env:"
Write-Host "  TEMPORAL_GATEWAY_URL=http://localhost:8090   # or public VPS URL"
Write-Host "  VPS_WEBHOOK_SECRET=<same as docs/temporal/.env>"
