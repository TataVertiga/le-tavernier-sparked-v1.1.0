$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $ProjectRoot

$LogDirectory = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
$LogFile = Join-Path $LogDirectory "tavernier-local.log"

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Vérification d'Ollama sur le PC." |
    Out-File -FilePath $LogFile -Append -Encoding utf8

$OllamaReady = $false
for ($Attempt = 0; $Attempt -lt 5; $Attempt++) {
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 |
            Out-Null
        $OllamaReady = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $OllamaReady) {
    $OllamaCandidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama app.exe"),
        (Join-Path $env:ProgramFiles "Ollama\ollama app.exe")
    )
    $OllamaApp = $OllamaCandidates |
        Where-Object { Test-Path -LiteralPath $_ } |
        Select-Object -First 1
    if ($OllamaApp) {
        "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Lancement de l'application Ollama." |
            Out-File -FilePath $LogFile -Append -Encoding utf8
        Start-Process -FilePath $OllamaApp
    }
}

if (-not $OllamaReady) {
    for ($Attempt = 0; $Attempt -lt 60; $Attempt++) {
        try {
            Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 |
                Out-Null
            $OllamaReady = $true
            break
        } catch {
            Start-Sleep -Seconds 2
        }
    }
}

if ($OllamaReady) {
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Ollama est disponible." |
        Out-File -FilePath $LogFile -Append -Encoding utf8
} else {
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Ollama ne répond pas encore ; le bot démarre quand même." |
        Out-File -FilePath $LogFile -Append -Encoding utf8
}

& npm.cmd run build *>> $LogFile
if ($LASTEXITCODE -ne 0) {
    throw "La compilation du Tavernier a échoué. Consulte logs/tavernier-local.log."
}

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Démarrage du Tavernier." |
    Out-File -FilePath $LogFile -Append -Encoding utf8
& npm.cmd start *>> $LogFile
$ExitCode = $LASTEXITCODE
"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Le Tavernier s'est arrêté avec le code $ExitCode." |
    Out-File -FilePath $LogFile -Append -Encoding utf8
exit $ExitCode
