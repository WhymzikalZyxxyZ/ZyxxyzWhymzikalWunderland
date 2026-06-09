#!/usr/bin/env bash
# Run available CI checks locally — mirrors .github/workflows/ci.yml
# Called automatically by .git/hooks/pre-push; also runnable directly.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

FAILED=()
SKIPPED=()

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BOLD='\033[1m' NC='\033[0m'

step() { echo -e "\n${BOLD}── $1${NC}"; }
pass() { echo -e "  ${GREEN}✓${NC}  $1"; }
fail() { echo -e "  ${RED}✗${NC}  $1"; FAILED+=("$1"); }
skip() { echo -e "  ${YELLOW}⊘${NC}  $1  (${2})"; SKIPPED+=("$1"); }

run() {
  local label="$1"; shift
  if "$@"; then pass "$label"; else fail "$label"; fi
}

# ── Web: JS / CSS / HTML ─────────────────────────────────────────────────────
step "Lint JS · CSS · HTML"
if command -v node &>/dev/null; then
  run "JS lint"   npm run lint:js
  run "CSS lint"  npm run lint:css
  run "HTML lint" npm run lint:html
else
  skip "JS/CSS/HTML lint" "node not installed"
fi

# ── Web: Jest tests ───────────────────────────────────────────────────────────
step "JavaScript tests (Jest)"
if command -v node &>/dev/null; then
  run "Jest + coverage" npm test
else
  skip "Jest" "node not installed"
fi

# ── TypeScript ────────────────────────────────────────────────────────────────
step "TypeScript type-check"
if command -v node &>/dev/null; then
  [ -d typescript/api/node_modules ] || (cd typescript/api && npm install --silent 2>/dev/null)
  # Use relative paths only — avoids POSIX→Windows conversion issues with Node.js on Windows
  run "tsc shared" bash -c 'cd typescript/shared && ../api/node_modules/.bin/tsc --noEmit'
  run "tsc api"    bash -c 'cd typescript/api    && node_modules/.bin/tsc --noEmit'
else
  skip "TypeScript" "node not installed"
fi

# ── .NET ─────────────────────────────────────────────────────────────────────
step ".NET build (warnings-as-errors)"
if command -v dotnet &>/dev/null; then
  # MSYS_NO_PATHCONV stops git-bash from expanding /warnaserror to a Windows path
  run ".NET shared"   env MSYS_NO_PATHCONV=1 dotnet build dotnet/shared/ZyxxyzShared.csproj     -c Release /warnaserror --nologo -v q
  run ".NET API"      env MSYS_NO_PATHCONV=1 dotnet build dotnet/api/ZyxxyzApi.csproj           -c Release /warnaserror --nologo -v q
  run ".NET Blazor"   env MSYS_NO_PATHCONV=1 dotnet build dotnet/blazor/ZyxxyzBlazor.csproj     -c Release /warnaserror --nologo -v q
  run ".NET Realtime" env MSYS_NO_PATHCONV=1 dotnet build dotnet/realtime/ZyxxyzRealtime.csproj -c Release /warnaserror --nologo -v q
else
  skip ".NET build" "dotnet not installed"
fi

# ── Python ────────────────────────────────────────────────────────────────────
step "Python lint (Ruff)"
PYTHON=""
for py in python3 python; do
  if command -v "$py" &>/dev/null && "$py" -m ruff --version &>/dev/null 2>&1; then
    PYTHON="$py"; break
  fi
done
if [ -n "$PYTHON" ]; then
  run "Ruff" "$PYTHON" -m ruff check python/shared/chess_engine.py python/desktop/app.py python/api/app.py
else
  skip "Python ruff" "python+ruff not installed — pip install ruff"
fi

# ── Rust ─────────────────────────────────────────────────────────────────────
step "Rust clippy"
if command -v cargo &>/dev/null; then
  run "clippy shared"  bash -c "cd rust/shared  && cargo clippy -- -D warnings"
  run "clippy API"     bash -c "cd rust/api     && cargo clippy -- -D warnings"
  run "clippy desktop" bash -c "cd rust/desktop && cargo clippy -- -D warnings"
else
  skip "Rust clippy" "cargo not installed"
fi

# ── Go ────────────────────────────────────────────────────────────────────────
step "Go lint (golangci-lint)"
if command -v golangci-lint &>/dev/null; then
  run "golangci-lint" bash -c "cd editor-service && golangci-lint run ./..."
else
  skip "Go golangci-lint" "golangci-lint not installed"
fi

# ── Kotlin ────────────────────────────────────────────────────────────────────
step "Kotlin lint (ktlint)"
if command -v ktlint &>/dev/null; then
  run "ktlint" ktlint --relative 'kotlin/**/*.kt'
else
  skip "Kotlin ktlint" "ktlint not installed"
fi

# ── Swift ─────────────────────────────────────────────────────────────────────
step "Swift lint (SwiftLint)"
if command -v swiftlint &>/dev/null; then
  run "SwiftLint" swiftlint lint --path swift/ --strict
else
  skip "Swift SwiftLint" "swiftlint not installed (macOS only)"
fi

# ── Dart ─────────────────────────────────────────────────────────────────────
step "Dart analyze"
if command -v dart &>/dev/null; then
  run "dart analyze" bash -c "cd dart/shared && dart pub get && dart analyze --fatal-infos"
else
  skip "Dart analyze" "dart not installed"
fi

# ── C++ ──────────────────────────────────────────────────────────────────────
step "C++ lint (clang-tidy)"
if command -v clang-tidy &>/dev/null; then
  run "clang-tidy" clang-tidy cpp/shared/chess_engine.cpp \
    --checks='-*,clang-analyzer-*,modernize-*,bugprone-*,readability-*' \
    -- -std=c++17 -I cpp/shared
else
  skip "C++ clang-tidy" "clang-tidy not installed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}════════════════════════════════════════${NC}"

if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo -e "${YELLOW}Skipped (tool not installed locally):${NC}"
  for s in "${SKIPPED[@]}"; do echo "  ⊘  $s"; done
  echo ""
fi

if [ ${#FAILED[@]} -gt 0 ]; then
  echo -e "${RED}Failed:${NC}"
  for f in "${FAILED[@]}"; do echo "  ✗  $f"; done
  echo -e "\n${RED}✗ CI checks failed — push blocked.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All available CI checks passed.${NC}"
