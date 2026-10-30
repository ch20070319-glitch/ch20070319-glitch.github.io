@echo off
cd /d "%~dp0"
python preview.py --port 8765
if errorlevel 1 pause
