# Yugam optimizer venv lives at C:\yugam-opt\.venv (short path — PyTorch fails on long OneDrive paths on Windows)

$Venv = "C:\yugam-opt\.venv"
if (-not (Test-Path "$Venv\Scripts\python.exe")) {
  Write-Host "Creating venv at $Venv ..."
  py -3.12 -m venv $Venv
}
& "$Venv\Scripts\Activate.ps1"
Set-Location $PSScriptRoot
uvicorn main:app --reload --port 8001
