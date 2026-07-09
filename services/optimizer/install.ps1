# Install Yugam optimizer with neural + foundation models (Windows)
# Uses C:\yugam-opt\.venv — PyTorch fails on long OneDrive paths (WinError 206)

$ErrorActionPreference = "Stop"
$Venv = "C:\yugam-opt\.venv"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path "$Venv\Scripts\python.exe")) {
  Write-Host "Creating venv at $Venv ..."
  py -3.12 -m venv $Venv
}

$Py = "$Venv\Scripts\python.exe"
$Pip = "$Venv\Scripts\pip.exe"

& $Py -m pip install --upgrade pip
& $Pip install torch --index-url https://download.pytorch.org/whl/cpu
& $Pip install -r "$Here\requirements.txt"

Write-Host ""
Write-Host "Installed. Verify:"
Write-Host "  `$env:PYTHONPATH = '$Here'"
Write-Host "  & '$Py' -c `"import torch, neuralforecast, chronos, uni2ts; print('ok')`""
Write-Host ""
Write-Host "Run optimizer:"
Write-Host "  npm run optimizer:dev"
