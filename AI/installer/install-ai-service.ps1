param(
    [string]$DataRoot = [System.IO.Path]::Combine([Environment]::GetFolderPath("MyPictures"), "GymProject AI"),
    [string]$VideoSource = "0",
    [string]$PackageRoot = $PSScriptRoot,
    [ValidateSet("start", "status", "stop", "install-autostart", "uninstall-autostart")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function New-DataFolders {
    param([string]$RootPath)

    if (-not (Test-Path $RootPath)) {
        New-Item -Path $RootPath -ItemType Directory | Out-Null
    }

    $photosDir = Join-Path $RootPath "photos"
    $runtimeDir = Join-Path $RootPath "runtime"

    foreach ($dir in @($photosDir, $runtimeDir)) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory | Out-Null
        }
    }

    return @{
        Root = (Resolve-Path $RootPath).Path
        Photos = (Resolve-Path $photosDir).Path
        Runtime = (Resolve-Path $runtimeDir).Path
    }
}

function Get-PythonRuntime {
    # Cerca Python 3.11 specificatamente (richiesto da ultralytics)
    $py311Cmd = Get-Command py -ErrorAction SilentlyContinue
    if ($py311Cmd) {
        # Prova py -3.11
        $testVersion = & py -3.11 --version 2>&1
        if ($testVersion -match "Python 3\.11") {
            Write-Host "Trovato Python 3.11 tramite py launcher" -ForegroundColor Green
            return @{ Exe = $py311Cmd.Source; Prefix = @("-3.11") }
        }
    }
    
    # Cerca python3.11 direttamente
    $python311Cmd = Get-Command python3.11 -ErrorAction SilentlyContinue
    if ($python311Cmd) {
        Write-Host "Trovato Python 3.11" -ForegroundColor Green
        return @{ Exe = $python311Cmd.Source; Prefix = @() }
    }

    Write-Step "Python 3.11 non trovato. Installazione con winget"
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget non disponibile. Installa Python 3.11 manualmente da https://www.python.org/downloads/ e rilancia lo script."
    }

    Write-Host "Installazione Python 3.11 in corso..." -ForegroundColor Yellow
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements --silent

    # Ricontrolla dopo l'installazione
    Start-Sleep -Seconds 3
    
    $py311Cmd = Get-Command py -ErrorAction SilentlyContinue
    if ($py311Cmd) {
        $testVersion = & py -3.11 --version 2>&1
        if ($testVersion -match "Python 3\.11") {
            Write-Host "Python 3.11 installato con successo" -ForegroundColor Green
            return @{ Exe = $py311Cmd.Source; Prefix = @("-3.11") }
        }
    }
    
    $python311Cmd = Get-Command python3.11 -ErrorAction SilentlyContinue
    if ($python311Cmd) {
        return @{ Exe = $python311Cmd.Source; Prefix = @() }
    }

    throw "Python 3.11 installato ma non rilevato. Riapri PowerShell e rilancia lo script.`nSe il problema persiste, scarica Python 3.11 manualmente da https://www.python.org/downloads/"
}

function New-OrUpdateVenv {
    param(
        [hashtable]$PythonRuntime,
        [string]$ProjectDir,
        [string]$RuntimeDir
    )

    $venvDir = Join-Path $RuntimeDir "venv"
    $venvPython = Join-Path $venvDir "Scripts\python.exe"
    $requirementsPath = Join-Path $ProjectDir "requirements.txt"
    $hashFile = Join-Path $RuntimeDir "requirements.hash"

    if (-not (Test-Path $venvPython)) {
        Write-Step "Creazione virtual environment"
        & $PythonRuntime.Exe @($PythonRuntime.Prefix + @("-m", "venv", $venvDir))
        if ($LASTEXITCODE -ne 0) {
            throw "Errore nella creazione del virtual environment"
        }
    }

    $currentHash = (Get-FileHash -Path $requirementsPath -Algorithm SHA256).Hash
    $storedHash = if (Test-Path $hashFile) { (Get-Content $hashFile -Raw).Trim() } else { "" }

    if ($storedHash -ne $currentHash) {
        Write-Step "Installazione dipendenze Python (può richiedere qualche minuto...)"
        
        Write-Host "Aggiornamento pip..." -ForegroundColor Gray
        try {
            & $venvPython -m pip install --upgrade pip --quiet 2>&1 | Out-Null
        } catch {
            Write-Host "Warning: Errore durante l'aggiornamento pip, continuo comunque..." -ForegroundColor Yellow
        }
        
        Write-Host "Installazione pacchetti da requirements.txt..." -ForegroundColor Gray
        $installOutput = & $venvPython -m pip install -r $requirementsPath 2>&1 | Out-String
        
        # Verifica che uvicorn sia installato (il vero controllo)
        Write-Host "Verifica installazione uvicorn..." -ForegroundColor Gray
        $uvicornCheck = & $venvPython -c "import uvicorn; print('OK')" 2>&1
        
        if ($uvicornCheck -notmatch "OK") {
            Write-Host "`nOutput installazione:" -ForegroundColor Red
            Write-Host $installOutput -ForegroundColor Red
            throw "uvicorn non è stato installato correttamente. Vedere output sopra. Prova a eliminare la cartella venv e riprovare."
        }
        
        Write-Host "Pacchetti installati con successo" -ForegroundColor Green
        Set-Content -Path $hashFile -Value $currentHash -Encoding UTF8
    } else {
        Write-Host "Dipendenze Python già aggiornate (hash corrispondente)" -ForegroundColor Gray
    }

    return $venvPython
}

function Stop-PreviousService {
    param([string]$RuntimeDir)

    $pidFile = Join-Path $RuntimeDir "ai-service.pid"
    if (-not (Test-Path $pidFile)) {
        return
    }

    $processId = (Get-Content $pidFile -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($processId)) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Step "Arresto servizio AI precedente"
            $proc | Stop-Process -Force
        }
    }

    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

function Start-AiService {
    param(
        [string]$VenvPython,
        [string]$ProjectDir,
        [string]$PhotosDir,
        [string]$VideoSource,
        [string]$RuntimeDir
    )

    Write-Step "Avvio servizio AI"

    $logFile = Join-Path $RuntimeDir "ai-service.log"
    $errorLogFile = Join-Path $RuntimeDir "ai-service.error.log"

    $env:PORT = "8001"
    $env:PHOTOS_DIR = $PhotosDir
    $env:VIDEO_SOURCE = $VideoSource

    $args = @("-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001")
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $VenvPython
    $psi.Arguments = $args -join " "
    $psi.WorkingDirectory = $ProjectDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $psi.EnvironmentVariables["PORT"] = "8001"
    $psi.EnvironmentVariables["PHOTOS_DIR"] = $PhotosDir
    $psi.EnvironmentVariables["VIDEO_SOURCE"] = $VideoSource

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    
    $outBuilder = New-Object System.Text.StringBuilder
    $errBuilder = New-Object System.Text.StringBuilder
    
    $outEvent = Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action {
        if (-not [string]::IsNullOrEmpty($EventArgs.Data)) {
            [System.IO.File]::AppendAllText($Event.MessageData.LogFile, $EventArgs.Data + "`n")
        }
    } -MessageData @{ LogFile = $logFile }
    
    $errEvent = Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action {
        if (-not [string]::IsNullOrEmpty($EventArgs.Data)) {
            [System.IO.File]::AppendAllText($Event.MessageData.LogFile, $EventArgs.Data + "`n")
        }
    } -MessageData @{ LogFile = $errorLogFile }

    $null = $proc.Start()
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Set-Content -Path (Join-Path $RuntimeDir "ai-service.pid") -Value $proc.Id -Encoding UTF8
    
    # Attendi 2 secondi e verifica se il processo è ancora vivo
    Start-Sleep -Seconds 2
    if ($proc.HasExited) {
        Unregister-Event -SourceIdentifier $outEvent.Name -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier $errEvent.Name -ErrorAction SilentlyContinue
        
        $errorContent = if (Test-Path $errorLogFile) { Get-Content $errorLogFile -Raw } else { "" }
        $logContent = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { "" }
        
        throw "Il processo AI è terminato immediatamente. Exit code: $($proc.ExitCode).`nLog: $logFile`nError log: $errorLogFile`n`nErrore: $errorContent`nLog: $logContent"
    }
    
    Write-Host "Processo avviato (PID: $($proc.Id)). Log: $logFile" -ForegroundColor Green
}

function Wait-Health {
    param([int]$TimeoutSeconds = 45)

    $healthUrl = "http://localhost:8001/api/health"
    $elapsed = 0

    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $res = Invoke-WebRequest -Uri $healthUrl -Method GET -UseBasicParsing -TimeoutSec 3
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 300) {
                return $true
            }
        }
        catch {
        }

        Start-Sleep -Seconds 3
        $elapsed += 3
    }

    return $false
}

function Get-ServiceStatus {
    param([string]$RuntimeDir)

    $pidFile = Join-Path $RuntimeDir "ai-service.pid"
    if (-not (Test-Path $pidFile)) {
        return @{ Running = $false; Pid = ""; Health = $false }
    }

    $processId = (Get-Content $pidFile -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($processId)) {
        return @{ Running = $false; Pid = ""; Health = $false }
    }

    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (-not $proc) {
        return @{ Running = $false; Pid = $processId; Health = $false }
    }

    $isHealthy = $false
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:8001/api/health" -Method GET -UseBasicParsing -TimeoutSec 3
        $isHealthy = $res.StatusCode -ge 200 -and $res.StatusCode -lt 300
    }
    catch {
    }

    return @{ Running = $true; Pid = $processId; Health = $isHealthy }
}

function Show-ServiceStatus {
    param([string]$RuntimeDir)

    $status = Get-ServiceStatus -RuntimeDir $RuntimeDir

    if (-not $status.Running) {
        Write-Host "Servizio AI: NON in esecuzione" -ForegroundColor Yellow
        if (-not [string]::IsNullOrWhiteSpace($status.Pid)) {
            Write-Host "PID registrato ma processo assente: $($status.Pid)" -ForegroundColor Yellow
        }
        return
    }

    Write-Host "Servizio AI: IN ESECUZIONE (PID: $($status.Pid))" -ForegroundColor Green
    if ($status.Health) {
        Write-Host "Health-check: OK" -ForegroundColor Green
    }
    else {
        Write-Host "Health-check: non raggiungibile" -ForegroundColor Yellow
    }
}

function Install-AutoStart {
    Write-Step "Installazione Avvio Automatico"
    
    $taskName = "GymProject AI Service"
    $scriptPath = $MyInvocation.ScriptName
    
    if (-not $scriptPath) {
        $scriptPath = Join-Path $PSScriptRoot "install-ai-service.ps1"
    }
    
    # Crea azione: esegue lo script all'avvio
    $action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`" -Action start -VideoSource `"$VideoSource`"" `
        -WorkingDirectory $PSScriptRoot
    
    # Trigger: all'accesso dell'utente
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    
    # Impostazioni
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0)
    
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
    
    # Rimuovi task esistente
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Registra nuovo task
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Avvia automaticamente il servizio AI per GymProject all'accesso di Windows" | Out-Null
    
    Write-Host "`nAvvio automatico configurato con successo!" -ForegroundColor Green
    Write-Host "Il servizio AI si avvierà automaticamente al prossimo accesso." -ForegroundColor Green
    Write-Host "`nPer disabilitarlo: .\install-ai-service.ps1 -Action uninstall-autostart" -ForegroundColor Gray
    Write-Host "VideoSource configurata: $VideoSource" -ForegroundColor Gray
}

function Uninstall-AutoStart {
    Write-Step "Disinstallazione Avvio Automatico"
    
    $taskName = "GymProject AI Service"
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if ($task) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "Avvio automatico rimosso con successo!" -ForegroundColor Green
    } else {
        Write-Host "Avvio automatico non era configurato." -ForegroundColor Yellow
    }
}

function Show-AutoStartStatus {
    $taskName = "GymProject AI Service"
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    Write-Host "`nStato Avvio Automatico:" -ForegroundColor Cyan
    
    if ($task) {
        Write-Host "  Stato: ATTIVO" -ForegroundColor Green
        Write-Host "  Task: $taskName" -ForegroundColor Gray
        Write-Host "  Stato: $($task.State)" -ForegroundColor Gray
        if ($task.LastRunTime) {
            Write-Host "  Ultimo avvio: $($task.LastRunTime)" -ForegroundColor Gray
        }
        if ($task.NextRunTime) {
            Write-Host "  Prossimo avvio: $($task.NextRunTime)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  Stato: NON CONFIGURATO" -ForegroundColor Yellow
        Write-Host "  Per attivarlo: .\install-ai-service.ps1 -Action install-autostart" -ForegroundColor Gray
    }
}

try {
    # Gestione comandi speciali avvio automatico
    if ($Action -eq "install-autostart") {
        Install-AutoStart
        Show-AutoStartStatus
        exit 0
    }
    
    if ($Action -eq "uninstall-autostart") {
        Uninstall-AutoStart
        exit 0
    }

    Write-Step "Setup servizio AI locale con Python venv"

    $projectDir = Join-Path $PackageRoot "ai-service"
    if (-not (Test-Path (Join-Path $projectDir "app.py"))) {
        throw "Cartella progetto mancante: $projectDir. Estrai ai-installer.zip completo e rilancia install-ai-service.ps1."
    }

    $folders = New-DataFolders -RootPath $DataRoot
    Write-Host "Cartella dati: $($folders.Root)" -ForegroundColor Green
    Write-Host "Cartella foto: $($folders.Photos)" -ForegroundColor Green

    if ($Action -eq "status") {
        Show-ServiceStatus -RuntimeDir $folders.Runtime
        Show-AutoStartStatus
        exit 0
    }

    if ($Action -eq "stop") {
        Stop-PreviousService -RuntimeDir $folders.Runtime
        Write-Host "Servizio AI arrestato (se era in esecuzione)." -ForegroundColor Green
        exit 0
    }

    $pythonRuntime = Get-PythonRuntime
    Stop-PreviousService -RuntimeDir $folders.Runtime

    $venvPython = New-OrUpdateVenv -PythonRuntime $pythonRuntime -ProjectDir $projectDir -RuntimeDir $folders.Runtime
    Start-AiService -VenvPython $venvPython -ProjectDir $projectDir -PhotosDir $folders.Photos -VideoSource $VideoSource -RuntimeDir $folders.Runtime

    if (Wait-Health) {
        Write-Host "Servizio AI avviato con successo." -ForegroundColor Green
    }
    else {
        Write-Host "Servizio avviato, ma health-check non ancora pronto. Attendi qualche secondo o verifica i log locali." -ForegroundColor Yellow
    }

    Show-ServiceStatus -RuntimeDir $folders.Runtime

    if (Get-Command explorer.exe -ErrorAction SilentlyContinue) {
        Start-Process explorer.exe $folders.Photos | Out-Null
    }

    Write-Host "`nEndpoint servizio AI:" -ForegroundColor Cyan
    Write-Host "  Health: http://localhost:8001/api/health"
    Write-Host "  Video : http://localhost:8001/video_feed"
    Write-Host "  WebSocket: ws://localhost:8001/ws"
    Write-Host "`nFile di log:" -ForegroundColor Cyan
    Write-Host "  Log: $($folders.Runtime)\ai-service.log"
    Write-Host "  Errori: $($folders.Runtime)\ai-service.error.log"
    
    # Controlla se l'avvio automatico è configurato
    $taskName = "GymProject AI Service"
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    
    if (-not $task) {
        Write-Host "`n💡 Suggerimento:" -ForegroundColor Yellow
        Write-Host "  Per avviare automaticamente il servizio all'accesso di Windows:" -ForegroundColor Gray
        Write-Host "  .\install-ai-service.ps1 -Action install-autostart" -ForegroundColor Cyan
    }
    
    Write-Host "`nCompletato." -ForegroundColor Green
}
catch {
    Write-Host "`nErrore: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Suggerimento: usa ai-installer.zip completo (con cartella ai-service + install-ai-service.ps1)." -ForegroundColor Yellow
    exit 1
}
