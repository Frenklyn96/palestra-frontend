<#
.SYNOPSIS
    Genera lo ZIP dell'installer AI per il download dal frontend

.DESCRIPTION
    Questo script crea un file zip pulito contenente tutti i file necessari
    per l'installazione del servizio AI, escludendo file temporanei e cache.
    
    Lo zip viene salvato in palestra-frontend/public/ per essere scaricabile
    direttamente dal frontend quando il servizio AI è offline.

.EXAMPLE
    .\build-installer-zip.ps1
    
.NOTES
    Autore: GymProject Team
    Data: Aprile 2026
    Versione: 1.0
#>

param(
    [string]$OutputPath = "$PSScriptRoot\..\public\ai-installer.zip",
    [string]$SourcePath = "$PSScriptRoot",
    [switch]$Verbose
)

Write-Host "`nBUILD INSTALLER ZIP" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Gray

# Cartella temporanea
$tempBase = Join-Path $env:TEMP "GymProjectAI_$(Get-Date -Format 'yyyyMMddHHmmss')"
$tempAI = Join-Path $tempBase "GymProject-AI-Installer"

try {
    # Crea cartella temporanea
    Write-Host "`n[1/5] Creazione cartella temporanea..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $tempAI -Force | Out-Null
    if ($Verbose) { Write-Host "   $tempAI" -ForegroundColor Gray }
    
    # Definisci file/cartelle da escludere
    $excludePatterns = @(
        '__pycache__',
        '*.pyc',
        '*.pyo',
        '*.pyd',
        '.git',
        '.gitignore',
        '.vscode',
        'venv',
        '*.zip',
        '.env',
        '*.log',
        'node_modules',
        'dist',
        'build',
        '*.egg-info',
        '.pytest_cache',
        '.coverage'
    )
    
    Write-Host "[2/5] Copia file sorgente (escludendo cache e temp)..." -ForegroundColor Yellow
    
    # Copia file root
    Get-ChildItem -Path $SourcePath -File | Where-Object {
        $file = $_
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($file.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    } | ForEach-Object {
        Copy-Item $_.FullName -Destination $tempAI -Force
        if ($Verbose) { Write-Host "   + $($_.Name)" -ForegroundColor Gray }
    }
    
    # Copia cartelle (installer, launcher)
    Get-ChildItem -Path $SourcePath -Directory | Where-Object {
        $folder = $_
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($folder.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        -not $shouldExclude
    } | ForEach-Object {
        $destFolder = Join-Path $tempAI $_.Name
        
        # Copia ricorsiva escludendo pattern
        robocopy $_.FullName $destFolder /E /NFL /NDL /NJH /NJS /NC /NS /XD __pycache__ venv .git node_modules /XF *.pyc *.pyo *.log *.zip | Out-Null
        
        if ($Verbose) { Write-Host "   + $($_.Name)\" -ForegroundColor Gray }
    }
    
    # Pulisci file zip esistenti nella cartella installer (evita zip ricorsivi)
    Write-Host "[3/5] Pulizia file zip ricorsivi..." -ForegroundColor Yellow
    Get-ChildItem -Path $tempAI -Recurse -Filter "*.zip" | ForEach-Object {
        Remove-Item $_.FullName -Force
        if ($Verbose) { Write-Host "   - Rimosso: $($_.FullName.Replace($tempAI, ''))" -ForegroundColor Gray }
    }
    
    # Conta file totali
    $totalFiles = (Get-ChildItem -Path $tempAI -Recurse -File).Count
    Write-Host "   File totali: $totalFiles" -ForegroundColor Cyan
    
    # Rimuovi zip esistente
    if (Test-Path $OutputPath) {
        Remove-Item $OutputPath -Force
        Write-Host "`n[4/5] Rimosso zip esistente" -ForegroundColor Yellow
    } else {
        Write-Host "`n[4/5] Creazione nuovo zip..." -ForegroundColor Yellow
    }
    
    # Crea zip
    Write-Host "[5/5] Compressione file..." -ForegroundColor Yellow
    Compress-Archive -Path $tempAI -DestinationPath $OutputPath -CompressionLevel Optimal -Force
    
    # Verifica risultato
    if (Test-Path $OutputPath) {
        $zipSize = [math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
        $zipName = Split-Path $OutputPath -Leaf
        $zipDir = Split-Path $OutputPath -Parent | Split-Path -Leaf
        
        Write-Host "`nBUILD COMPLETATO!" -ForegroundColor Green
        Write-Host "====================================================================" -ForegroundColor Gray
        Write-Host "`nFile generato:" -ForegroundColor Cyan
        Write-Host "  $zipDir/$zipName" -ForegroundColor White
        Write-Host "  Dimensione: $zipSize MB" -ForegroundColor Gray
        Write-Host "  File inclusi: $totalFiles" -ForegroundColor Gray
        Write-Host "`nURL frontend:" -ForegroundColor Cyan
        Write-Host "  http://localhost:5173/$zipName" -ForegroundColor Yellow
        Write-Host "`nPulsante download:" -ForegroundColor Cyan
        Write-Host "  Scanner > AI Service Offline > 'Scarica installer AI'" -ForegroundColor Gray
        Write-Host "`n====================================================================" -ForegroundColor Gray
    } else {
        Write-Host "`nERRORE: Zip non creato!" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "`nERRORE durante la build:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Pulisci temp
    if (Test-Path $tempBase) {
        Remove-Item $tempBase -Recurse -Force -ErrorAction SilentlyContinue
        if ($Verbose) { Write-Host "`nCartella temporanea rimossa" -ForegroundColor Gray }
    }
}
