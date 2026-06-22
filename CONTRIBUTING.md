# Contributing to ZyxxyzWhymzykalWunderland

This is a personal portfolio project, but it is built to the same standard
a team project demands. If you are contributing, here is everything you need.

---

## Prerequisites

Install the tools for the languages you plan to touch. None are globally
required — `scripts/ci-local.sh` skips anything not installed and tells you what
to add.

| Language | Required tools |
|---|---|
| JS / TypeScript | Node.js 22+, npm |
| Python | Python 3.12+, `pip install ruff pytest pytest-cov` |
| Rust | `rustup` (stable), `cargo-tarpaulin`, `wasm-pack` |
| .NET | .NET SDK 9.0 |
| Go | Go 1.22+, `golangci-lint` |
| Kotlin | `ktlint` |
| Swift | macOS only — Xcode + SwiftLint (`brew install swiftlint`) |
| Dart | Dart SDK stable |
| C++ | `cmake`, `clang-tidy` |

---

## Branching strategy

Every change starts on a `version/X.Y.Z` branch — never directly on `main`,
`test`, or `development`.

```bash
git checkout main && git pull
git checkout -b version/X.Y.Z
```

The promote cascade fires automatically once CI passes on `development`:

```
version/X.Y.Z  →  PR into development
                           │
                    CI passes (20 jobs)
                           │
                   development → test → main   (promote.yml)
                                                    │
                                             deploy.yml fires
```

After your PR merges, delete both the remote and local branch:

```bash
git push origin --delete version/X.Y.Z
git branch -d version/X.Y.Z
```

---

## Local checks before pushing

The pre-push hook runs `scripts/ci-local.sh` automatically. You can also run
it manually at any time:

```bash
bash scripts/ci-local.sh        # path-aware: only checks changed languages
bash scripts/ci-local.sh --all  # forces all suites regardless of changes
```

Path-aware mode diffs your branch against `origin/development` and skips
suites whose source directories are untouched. Editing `scripts/ci-local.sh`
or `.github/workflows/ci.yml` overrides this and runs everything.

---

## Commit messages

Commits use conventional format and must be vivid — spell out what changed
and why. The changelog generator reads these to determine semver bump type.

```
feat: add walkscore heatmap overlay to The Locator

Pulls Walk Score API data for the current bbox and renders it as a
choropleth layer. Graduated fill from red (car-dependent) to green
(walker's paradise). Adds /api/walkscore to the worker; cached 6 h in KV.
```

| Prefix | Semver bump |
|---|---|
| `feat:` | minor |
| `fix:`, `perf:` | patch |
| `feat!:`, `fix!:`, `BREAKING CHANGE:` | major |
| `chore:`, `docs:`, `test:`, `ci:`, `refactor:` | none |

---

## Version bumping

When your branch is ready, run the bump script to update `package.json`,
`VERSION`, and generate `CHANGELOG.md`:

```bash
node scripts/bump-version.js
```

The script reads the branch name (`version/X.Y.Z`) to determine the new
version, then reads git log since the last tag to build the changelog entry.

---

## Coverage thresholds

Every language that has tests enforces ≥ 90% line coverage in CI:

- JavaScript: Jest (`--coverage`)
- Python: pytest-cov (`--cov-fail-under=90`)
- Rust: cargo-tarpaulin (`--fail-under 90`)
- Dart: lcov line ratio

If you add code to a tested module, add tests to maintain coverage.

---

## Adding a new page or game

1. Create the HTML file under the relevant section (`gamer/`, `technologist/`, etc.)
2. Add the JS engine under `js/engines/` if it has one
3. Add a test file under `tests/` mirroring the engine filename
4. Update `js/index.js` section listing if it appears in navigation
5. Run `npm run lint:html` to validate markup

---

## Architecture references

- `docs/adr/` — Architecture Decision Records for every major design choice
- `docs/architecture/` — Deeper dives into subsystems
- `docs/caching-strategy.md` — KV TTL and stale-cache fallback design
- `docs/hexagonal-architecture.md` — How the engine/adapter split is applied
- `docs/privacy-architecture.md` — What data is and is not stored

---

## Getting help

Open an issue or reach out at zyxxyz@zyxwonderland.xyz.
