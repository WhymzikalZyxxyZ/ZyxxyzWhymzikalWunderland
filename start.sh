#!/usr/bin/env bash
# Start the full ZyxxyzWhymzykalWunderland stack via Docker Compose.
# Usage:
#   ./start.sh            — build (if needed) and start all services
#   ./start.sh --down     — stop and remove all containers
#   ./start.sh --rebuild  — force a full image rebuild
#   ./start.sh --logs     — tail logs after startup
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOWN=0; REBUILD=0; LOGS=0

for arg in "$@"; do
  case "$arg" in
    --down)    DOWN=1    ;;
    --rebuild) REBUILD=1 ;;
    --logs)    LOGS=1    ;;
  esac
done

# ── Colour helpers ─────────────────────────────────────────────────────────────
step()  { printf '\033[36m  --> %s\033[0m\n' "$*"; }
ok()    { printf '\033[32m   OK %s\033[0m\n' "$*"; }
warn()  { printf '\033[33m WARN %s\033[0m\n' "$*"; }
fatal() { printf '\033[31m  ERR %s\033[0m\n' "$*"; exit 1; }

printf '\n\033[35m╔══════════════════════════════════════════════════╗\n'
printf   '║   ZyxxyzWhymzykalWunderland — local stack        ║\n'
printf   '╚══════════════════════════════════════════════════╝\033[0m\n\n'

# ── 1. Check Docker ────────────────────────────────────────────────────────────
step "Checking Docker..."
command -v docker >/dev/null 2>&1 || fatal "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
docker info >/dev/null 2>&1      || fatal "Docker daemon is not running. Please start Docker Desktop."
ok "Docker is running"

# ── 2. Stop mode ───────────────────────────────────────────────────────────────
if [ "$DOWN" -eq 1 ]; then
  step "Stopping and removing all containers..."
  cd "$REPO_ROOT"
  docker compose down --remove-orphans
  ok "Stack stopped."
  exit 0
fi

# ── 3. Create .env if missing ─────────────────────────────────────────────────
ENV_FILE="$REPO_ROOT/.env"
ENV_EXAMPLE="$REPO_ROOT/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  step ".env not found — creating from .env.example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  warn ".env created. Edit $ENV_FILE and set JWT_SECRET before going to production."
fi
ok ".env ready"

# ── 4. Warn on placeholder secret ──────────────────────────────────────────────
if grep -q 'JWT_SECRET=change-me' "$ENV_FILE"; then
  warn "JWT_SECRET is still the default placeholder — not secure for production."
fi

# ── 5. Build and start ─────────────────────────────────────────────────────────
cd "$REPO_ROOT"
step "Building images and starting services (first run may take a few minutes)..."
echo ""

if [ "$REBUILD" -eq 1 ]; then
  docker compose up --build --detach
else
  docker compose up --detach
fi

# ── 6. Print service URLs ──────────────────────────────────────────────────────
printf '\n\033[32m╔══════════════════════════════════════════════════╗\n'
printf   '║              Services are running                ║\n'
printf   '╠══════════════════════════════════════════════════╣\n'
printf   '║  Frontend        →  http://localhost:8080        ║\n'
printf   '║  Anonymail       →  http://localhost:3000        ║\n'
printf   '║  TypeScript API  →  http://localhost:5060        ║\n'
printf   '║  Python API      →  http://localhost:5050        ║\n'
printf   '║  .NET API        →  http://localhost:5001        ║\n'
printf   '║  Editor Service  →  http://localhost:8085        ║\n'
printf   '║  Locator         →  http://localhost:3001        ║\n'
printf   '╠══════════════════════════════════════════════════╣\n'
printf   '║  Stop:    ./start.sh --down                      ║\n'
printf   '║  Logs:    ./start.sh --logs                      ║\n'
printf   '║  Rebuild: ./start.sh --rebuild                   ║\n'
printf   '╚══════════════════════════════════════════════════╝\033[0m\n\n'

# ── 7. Optionally tail logs ────────────────────────────────────────────────────
if [ "$LOGS" -eq 1 ]; then
  step "Attaching to logs (Ctrl+C to detach)..."
  docker compose logs --follow
fi
