@echo off
REM Yugam optimizer — use short-path venv (avoids Windows MAX_PATH on OneDrive)
set VENV=C:\yugam-opt\.venv
if not exist "%VENV%\Scripts\python.exe" (
  echo Creating venv at %VENV% ...
  py -3.12 -m venv "%VENV%"
)
call "%VENV%\Scripts\activate.bat"
cd /d "%~dp0"
uvicorn main:app --reload --port 8001
