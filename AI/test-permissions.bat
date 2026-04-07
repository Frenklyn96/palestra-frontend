@echo off
REM Test Permessi Webcam

cd /d "%~dp0"

echo =====================================================
echo   Test Permessi Webcam - Privacy Windows
echo =====================================================
echo.

REM Controlla se esiste il venv del servizio AI
if exist "installer\ai-service\venv\Scripts\python.exe" (
    echo Usando Python dal virtual environment...
    echo.
    installer\ai-service\venv\Scripts\python.exe test-webcam-permissions.py
) else (
    REM Usa Python di sistema
    echo Virtual environment non trovato, usando Python di sistema...
    echo.
    
    REM Cerca py launcher
    where py >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        py -3.11 test-webcam-permissions.py
    ) else (
        REM Prova python diretto
        where python >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            python test-webcam-permissions.py
        ) else (
            echo ERRORE: Python non trovato!
            echo.
            echo Installa Python 3.11 da: https://www.python.org/downloads/
            pause
            exit /b 1
        )
    )
)
