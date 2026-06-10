#Requires -Version 5.1
<#
.SYNOPSIS
    Start the full ZyxxyzWhymzykalWunderland stack via Docker Compose.
.DESCRIPTION
    Checks prerequisites, creates .env from template if missing, then builds
    and starts all services. Run from the repo root.
.PARAMETER Down
    Stop and remove all containers instead of starting them.
.PARAMETER Rebuild
    Force a full image rebuild even if nothing has changed.
.PARAMETER Logs
    Tail logs from all running containers (attach after startup).
#>
param(
    [switch]$Down,
    [switch]$Rebuild,
    [switch]$Logs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = $PSScriptRoot

# ── Colour helpers ─────────────────────────────────────────────────────────────
function Write-Step  { Write-Host "  --> $args" -ForegroundColor Cyan   }
function Write-Ok    { Write-Host "   OK $args" -ForegroundColor Green  }
function Write-Warn  { Write-Host " WARN $args" -ForegroundColor Yellow }
function Write-Fatal { Write-Host "  ERR $args" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   ZyxxyzWhymzykalWunderland — local stack        ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── 1. Check Docker is installed ───────────────────────────────────────────────
Write-Step "Checking Docker..."
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fatal "Docker is not installed. Download Docker Desktop from https://www.docker.com/products/docker-desktop"
}

# ── 2. Check Docker daemon is running ──────────────────────────────────────────
try {
    docker info *>$null 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Fatal "Docker Desktop is not running. Please start it and try again."
}
Write-Ok "Docker is running"

# ── 3. Stop mode ───────────────────────────────────────────────────────────────
if ($Down) {
    Write-Step "Stopping and removing all containers..."
    Set-Location $RepoRoot
    docker compose down --remove-orphans
    Write-Ok "Stack stopped."
    exit 0
}

# ── 4. Create .env from template if missing ────────────────────────────────────
$EnvFile     = Join-Path $RepoRoot '.env'
$EnvExample  = Join-Path $RepoRoot '.env.example'

if (-not (Test-Path $EnvFile)) {
    Write-Step ".env not found — creating from .env.example..."
    Copy-Item $EnvExample $EnvFile
    Write-Warn ".env created. Open it and set JWT_SECRET before continuing."
    Write-Warn "File: $EnvFile"
    Write-Host ""
    $answer = Read-Host "  Press Enter to continue with the default values, or Ctrl+C to abort"
} else {
    Write-Ok ".env found"
}

# ── 5. Warn if JWT_SECRET is still the placeholder ────────────────────────────
$EnvContent = Get-Content $EnvFile -Raw
if ($EnvContent -match 'JWT_SECRET=change-me') {
    Write-Warn "JWT_SECRET is still the default placeholder — APIs will start but are not secure."
}

# ── 6. Build and start ─────────────────────────────────────────────────────────
Set-Location $RepoRoot

$BuildFlag = if ($Rebuild) { '--build' } else { '' }

Write-Host ""
Write-Step "Building images and starting services (this may take a few minutes on first run)..."
Write-Host ""

if ($BuildFlag) {
    docker compose up --build --detach
} else {
    docker compose up --detach
}

if ($LASTEXITCODE -ne 0) {
    Write-Fatal "docker compose up failed. Check the output above for errors."
}

# ── 7. Print service URLs ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              Services are running                ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Frontend        →  http://localhost:8080        ║" -ForegroundColor Green
Write-Host "║  Anonymail       →  http://localhost:3000        ║" -ForegroundColor Green
Write-Host "║  TypeScript API  →  http://localhost:5060        ║" -ForegroundColor Green
Write-Host "║  Python API      →  http://localhost:5050        ║" -ForegroundColor Green
Write-Host "║  .NET API        →  http://localhost:5001        ║" -ForegroundColor Green
Write-Host "║  Editor Service  →  http://localhost:8085        ║" -ForegroundColor Green
Write-Host "║  Locator         →  http://localhost:3001        ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Stop stack:  .\start.ps1 -Down                  ║" -ForegroundColor Green
Write-Host "║  View logs:   .\start.ps1 -Logs                  ║" -ForegroundColor Green
Write-Host "║  Rebuild:     .\start.ps1 -Rebuild               ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# ── 8. Optionally tail logs ────────────────────────────────────────────────────
if ($Logs) {
    Write-Step "Attaching to logs (Ctrl+C to detach)..."
    docker compose logs --follow
}
