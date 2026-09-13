@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" main.py -c test.conf
) else (
    echo .venv\Scripts\python.exe not found.
    exit /b 1
)