# GymProject - Setup e Avvio Completo
# Installa il servizio AI, crea icona desktop e avvia tutto

param(
    [string]$VideoSource = "1"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   GymProject - Setup Completo" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installerDir = Join-Path $scriptDir "installer"
$launcherDir = Join-Path $scriptDir "launcher"
$installScript = Join-Path $installerDir "install-ai-service.ps1"

# STEP 1: Verifica Python
Write-Host "Step 1/4: Verifica Python..." -ForegroundColor Yellow

$pythonCheck = $null
try {
    $pythonCheck = & py -3.11 --version 2>&1
} catch {}

if ($pythonCheck -match "Python 3\.11") {
    Write-Host "   OK - Python 3.11 trovato" -ForegroundColor Green
} else {
    Write-Host "   AVVISO - Python 3.11 non trovato" -ForegroundColor Yellow
    Write-Host "   Verra installato automaticamente al primo avvio" -ForegroundColor Gray
}

# STEP 2: Verifica Script Servizio AI
Write-Host ""
Write-Host "Step 2/4: Verifica script servizio AI..." -ForegroundColor Yellow

if (-not (Test-Path $installScript)) {
    Write-Host "   ERRORE - Script di installazione non trovato" -ForegroundColor Red
    Write-Host "   Percorso: $installScript" -ForegroundColor Gray
    pause
    exit 1
}

Write-Host "   OK - Script di installazione trovato" -ForegroundColor Green
Write-Host "   Il tray manager gestira l'avvio del servizio" -ForegroundColor Gray

# STEP 3: Crea Collegamento Desktop
Write-Host ""
Write-Host "Step 3/4: Creazione collegamento desktop..." -ForegroundColor Yellow

$batFile = Join-Path $scriptDir "Setup-GymProject.bat"
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'GymProject AI.lnk'

if (Test-Path $shortcutPath) {
    Write-Host "   OK - Collegamento gia esistente" -ForegroundColor Green
} else {
    try {
        $WScriptShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WScriptShell.CreateShortcut($shortcutPath)
        $Shortcut.TargetPath = $batFile
        $Shortcut.WorkingDirectory = $scriptDir
        $Shortcut.Description = 'GymProject AI Service Manager'
        $Shortcut.Save()
        
        Write-Host "   OK - Collegamento desktop creato" -ForegroundColor Green
    } catch {
        Write-Host "   AVVISO - Impossibile creare collegamento" -ForegroundColor Yellow
    }
}

# STEP 4: Avvia Tray Manager
Write-Host ""
Write-Host "Step 4/4: Avvio Tray Manager..." -ForegroundColor Yellow

$trayScript = Join-Path $launcherDir "gym-app-tray.py"

if (Test-Path $trayScript) {
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host "  Setup completato!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Icona desktop: GymProject AI" -ForegroundColor Cyan
    Write-Host "  Icona tray: apparira a breve" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Il tray manager controllera e avviera" -ForegroundColor Gray
    Write-Host "  il servizio AI automaticamente" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Gestisci il servizio con click destro" -ForegroundColor Gray
    Write-Host "  sull'icona 'AI' nella tray" -ForegroundColor Gray
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host ""
    
    $pythonExe = $null
    try {
        $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    } catch {}
    
    if (-not $pythonExe) {
        try {
            $pythonExe = (Get-Command py -ErrorAction SilentlyContinue).Source
        } catch {}
    }
    
    if ($pythonExe) {
        & $pythonExe $trayScript
    } else {
        Write-Host "   AVVISO - Python non trovato" -ForegroundColor Yellow
        Write-Host "   Avvia manualmente: python $trayScript" -ForegroundColor Gray
        Write-Host ""
        pause
    }
} else {
    Write-Host "   ERRORE - Script tray manager non trovato" -ForegroundColor Red
    Write-Host "   Percorso: $trayScript" -ForegroundColor Gray
    pause
}
