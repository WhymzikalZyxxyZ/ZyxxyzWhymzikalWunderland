#!/usr/bin/env bash
# Run available CI checks locally — mirrors .github/workflows/ci.yml
# Called automatically by .git/hooks/pre-push; also runnable directly.
# Pass --all to skip path filtering and run every suite regardless of changes.
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

# ── Path-aware filtering ──────────────────────────────────────────────────────
# Computes which files changed relative to where this branch diverged from
# origin/development (falling back to origin/main, then HEAD~1, then HEAD).
# Each language suite only runs when its source paths appear in the diff,
# OR when ci-local.sh / ci.yml itself changed (re-validates the harness),
# OR when --all is passed explicitly.

RUN_ALL=false
for arg in "$@"; do [[ "$arg" == "--all" ]] && RUN_ALL=true; done

if $RUN_ALL; then
  CHANGED=""
  echo -e "${YELLOW}--all: running every suite regardless of changed paths${NC}"
else
  if BASE=$(git merge-base HEAD origin/development 2>/dev/null); then
    BASE_DESC="origin/development"
  elif BASE=$(git merge-base HEAD origin/main 2>/dev/null); then
    BASE_DESC="origin/main"
  elif BASE=$(git rev-parse HEAD~1 2>/dev/null); then
    BASE_DESC="HEAD~1"
  else
    BASE=$(git rev-parse HEAD)
    BASE_DESC="HEAD (initial commit — running all suites)"
    RUN_ALL=true
  fi

  CHANGED=$(git diff --name-only "$BASE" HEAD 2>/dev/null || true)

  if [ -z "$CHANGED" ]; then
    echo -e "${YELLOW}No commits ahead of $BASE_DESC — running all suites${NC}"
    RUN_ALL=true
  else
    COUNT=$(echo "$CHANGED" | wc -l | tr -d ' ')
    echo -e "  Diffing against ${BOLD}${BASE_DESC}${NC} — ${COUNT} file(s) changed"
  fi
fi

# Returns 0 (true) when any changed file matches the given extended-regex,
# OR when --all was passed, OR when the CI scripts themselves changed.
changed_in() {
  $RUN_ALL && return 0
  echo "$CHANGED" | grep -qE "$1" && return 0
  echo "$CHANGED" | grep -qE '^(scripts/ci-local\.sh|\.github/workflows/ci\.yml)$' && return 0
  return 1
}

# ── Web: JS / CSS / HTML ─────────────────────────────────────────────────────
step "Lint JS · CSS · HTML"
if ! changed_in '^(js/|css/|tests/|[^/]+\.html$|package\.json$|package-lock\.json$|eslint\.config|\.htmlhintrc|\.stylelintrc)'; then
  skip "JS/CSS/HTML lint" "no web files changed"
elif command -v node &>/dev/null; then
  run "JS lint"   npm run lint:js
  run "CSS lint"  npm run lint:css
  run "HTML lint" npm run lint:html
else
  skip "JS/CSS/HTML lint" "node not installed"
fi

# ── Web: Jest tests ───────────────────────────────────────────────────────────
step "JavaScript tests (Jest)"
if ! changed_in '^(js/|tests/|package\.json$|package-lock\.json$)'; then
  skip "Jest" "no web files changed"
elif command -v node &>/dev/null; then
  run "Jest + coverage" npm test
else
  skip "Jest" "node not installed"
fi

# ── TypeScript ────────────────────────────────────────────────────────────────
step "TypeScript type-check"
if ! changed_in '^typescript/'; then
  skip "TypeScript" "no typescript/ files changed"
elif command -v node &>/dev/null; then
  [ -d typescript/api/node_modules ] || (cd typescript/api && npm install --silent 2>/dev/null)
  # Use relative paths only — avoids POSIX→Windows conversion issues with Node.js on Windows
  run "tsc shared" bash -c 'cd typescript/shared && ../api/node_modules/.bin/tsc --noEmit'
  run "tsc api"    bash -c 'cd typescript/api    && node_modules/.bin/tsc --noEmit'
else
  skip "TypeScript" "node not installed"
fi

# ── .NET ─────────────────────────────────────────────────────────────────────
step ".NET build (warnings-as-errors)"
if ! changed_in '^dotnet/'; then
  skip ".NET build" "no dotnet/ files changed"
elif command -v dotnet &>/dev/null; then
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
if ! changed_in '^python/'; then
  skip "Python ruff" "no python/ files changed"
else
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
fi

# ── Rust ─────────────────────────────────────────────────────────────────────
step "Rust clippy"
if ! changed_in '^rust/'; then
  skip "Rust clippy" "no rust/ files changed"
elif command -v cargo &>/dev/null; then
  run "clippy shared"  bash -c "cd rust/shared  && cargo clippy -- -D warnings"
  run "clippy API"     bash -c "cd rust/api     && cargo clippy -- -D warnings"
  run "clippy desktop" bash -c "cd rust/desktop && cargo clippy -- -D warnings"
else
  skip "Rust clippy" "cargo not installed"
fi

# ── Go ────────────────────────────────────────────────────────────────────────
step "Go lint (golangci-lint)"
if ! changed_in '^editor-service/'; then
  skip "Go golangci-lint" "no editor-service/ files changed"
elif command -v golangci-lint &>/dev/null; then
  run "golangci-lint" bash -c "cd editor-service && golangci-lint run ./..."
else
  skip "Go golangci-lint" "golangci-lint not installed"
fi

# ── Kotlin ────────────────────────────────────────────────────────────────────
step "Kotlin lint (ktlint)"
if ! changed_in '^kotlin/'; then
  skip "Kotlin ktlint" "no kotlin/ files changed"
elif command -v ktlint &>/dev/null; then
  run "ktlint" ktlint --relative 'kotlin/**/*.kt'
else
  skip "Kotlin ktlint" "ktlint not installed"
fi

# ── Swift ─────────────────────────────────────────────────────────────────────
step "Swift lint (SwiftLint)"
if ! changed_in '^swift/'; then
  skip "Swift SwiftLint" "no swift/ files changed"
elif command -v swiftlint &>/dev/null; then
  run "SwiftLint" swiftlint lint --path swift/ --strict
else
  skip "Swift SwiftLint" "swiftlint not installed (macOS only)"
fi

# ── Dart ─────────────────────────────────────────────────────────────────────
step "Dart analyze"
if ! changed_in '^dart/'; then
  skip "Dart analyze" "no dart/ files changed"
elif command -v dart &>/dev/null; then
  run "dart analyze" bash -c "cd dart/shared && dart pub get && dart analyze --fatal-infos"
else
  skip "Dart analyze" "dart not installed"
fi

# ── C++ ──────────────────────────────────────────────────────────────────────
step "C++ lint (clang-tidy)"
if ! changed_in '^cpp/'; then
  skip "C++ clang-tidy" "no cpp/ files changed"
elif command -v clang-tidy &>/dev/null; then
  run "clang-tidy" clang-tidy cpp/shared/chess_engine.cpp \
    --checks='-*,clang-analyzer-*,modernize-*,bugprone-*,readability-*' \
    -- -std=c++17 -I cpp/shared
else
  skip "C++ clang-tidy" "clang-tidy not installed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}════════════════════════════════════════${NC}"

if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo -e "${YELLOW}Skipped:${NC}"
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
