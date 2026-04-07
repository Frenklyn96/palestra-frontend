@echo off
REM Configura l'avvio automatico del servizio AI all'accesso di Windows

echo.
echo ========================================
echo  Configurazione Avvio Automatico AI
echo ========================================
echo.

cd /d "%~dp0"

echo Installazione task di avvio automatico...
powershell -ExecutionPolicy Bypass -File "install-ai-service.ps1" -Action install-autostart

echo.
echo Premi un tasto per chiudere...
pause >nul
