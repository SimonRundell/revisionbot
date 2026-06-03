<#
.SYNOPSIS
    Deploy dist/ and api/ to the Hostinger VPS via WinSCP SFTP.

.DESCRIPTION
    Reads credentials from deploy.config.json, then uploads:
      - dist/*  (excluding .config.json)
      - api/*   (excluding .config.json and .config.live.json)
    to the configured remote path.

    Requires WinSCP to be installed. Download free from https://winscp.net

.NOTES
    Creative Commons NC-BY-SA 4.0 — Simon Rundell
    deploy.config.json must NOT be committed — it is in .gitignore.
#>

# ---------------------------------------------------------------------------
# Load config
# ---------------------------------------------------------------------------
$configPath = Join-Path $PSScriptRoot "deploy.config.json"
if (-not (Test-Path $configPath)) {
    Write-Error "deploy.config.json not found. Copy deploy.config.json.example and fill in your credentials."
    exit 1
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$remoteHost = $config.host
$port       = if ($config.port) { $config.port } else { 22 }
$username   = $config.username
$password   = $config.password
$remotePath = $config.remotePath.TrimEnd("/")

# ---------------------------------------------------------------------------
# Locate WinSCP
# ---------------------------------------------------------------------------
$winscpPaths = @(
    "C:\Program Files (x86)\WinSCP\WinSCP.com",
    "C:\Program Files\WinSCP\WinSCP.com",
    "$env:LOCALAPPDATA\Programs\WinSCP\WinSCP.com"
)
$winscp = $winscpPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $winscp) {
    Write-Error @"
WinSCP not found. Please install it from https://winscp.net/eng/download.php
Then re-run this script.
"@
    exit 1
}

Write-Host "Using WinSCP at: $winscp" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Build WinSCP script
# Files to exclude from both dist and api:  .config.json
# Extra exclusion for api:                  .config.live.json
# ---------------------------------------------------------------------------
$localDist = Join-Path $PSScriptRoot "dist"
$localApi  = Join-Path $PSScriptRoot "api"

$script = @"
open sftp://${username}:${password}@${remoteHost}:${port}/ -hostkey=*
option batch abort
option confirm off

# Upload dist/ (exclude .config.json; protect the remote api subfolder from deletion)
synchronize remote -delete -criteria=size -filemask="|.config.json; api/" "$localDist" $remotePath

# Ensure remote api/ exists before syncing into it
mkdir $remotePath/api

# Upload api/ (exclude .config.json and .config.live.json)
synchronize remote -delete -criteria=size -filemask="|.config.json; .config.live.json" "$localApi" $remotePath/api

exit
"@

$scriptFile = [System.IO.Path]::GetTempFileName() + ".winscp"
$script | Out-File -FilePath $scriptFile -Encoding utf8

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "Deploying to ${remoteHost}:${remotePath} ..." -ForegroundColor Yellow
Write-Host "  dist/ -> $remotePath" -ForegroundColor Gray
Write-Host "  api/  -> $remotePath/api" -ForegroundColor Gray
Write-Host ""

& $winscp /script=$scriptFile /log="$PSScriptRoot\deploy.log"
$exitCode = $LASTEXITCODE

Remove-Item $scriptFile -Force

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "Deployment complete." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Deployment FAILED (exit code $exitCode). Check deploy.log for details." -ForegroundColor Red
    exit $exitCode
}
