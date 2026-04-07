@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  GymProject - Setup e Avvio Rapido
REM  Doppio click per installare e avviare tutto
REM ═══════════════════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              GymProject - Setup Completo                     ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0Setup-GymProject.ps1"
