@echo off
REM Test Webcam usando il virtual environment del servizio AI

cd /d "%~dp0installer"

echo ========================================
echo   Test Webcam - Diagnostica
echo ========================================
echo.

REM Cerca Python 3.11
set PYTHON_CMD=
for %%p in (py python python3) do (
    %%p -3.11 --version >nul 2>&1
    if not errorlevel 1 (
        set PYTHON_CMD=%%p -3.11
        goto :found
    )
)

:found
if "%PYTHON_CMD%"=="" (
    echo ERRORE: Python 3.11 non trovato
    echo.
    echo Installa Python 3.11 da: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Usando: %PYTHON_CMD%
echo.

REM Controlla se esiste il venv
if not exist "ai-service\venv\Scripts\python.exe" (
    echo Virtual environment non trovato.
    echo Creo venv e installo dipendenze...
    echo.
    
    cd ai-service
    %PYTHON_CMD% -m venv venv
    call venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    pip install opencv-python-headless
    cd ..
)

REM Attiva venv ed esegui test
call ai-service\venv\Scripts\activate.bat
python ..\test-webcam.py

echo.
pause
