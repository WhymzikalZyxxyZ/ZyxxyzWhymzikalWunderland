# ADR-001 — ELINAL System Architecture

**Status:** Accepted  
**Date:** 2026-06-27  
**Author:** Whymzikal Zyxxyz  

---

## Context

ELINAL ("Explain Like I'm Not A Lawyer") serves plain-language reading materials for SCOTUS opinions. The goal is a public-facing tool that:

- Scrapes recent opinions from CourtListener automatically
- Generates structured educational materials using a large language model
- Serves a fast, embeddable React SPA from a single subdomain
- Operates with zero ongoing maintenance (no server to babysit, no bills for idle time)
- Lives inside the existing `ZyxxyzWhymzykalWunderland` monorepo and deploys via the existing CI pipeline

The operator (a non-engineer) needs to be able to walk away after initial setup and trust the system to run itself.

---

## Decision

ELINAL is built entirely on **Cloudflare's developer platform**: a single Worker handles all routing, data access, AI inference, and asset serving. There is no origin server, no VPS, no Docker container, and no managed database outside Cloudflare's ecosystem.

The four platform primitives used:

| Primitive | Role |
|---|---|
| **Cloudflare Worker** | HTTP router, scraper orchestrator, API, SPA serving |
| **Workers AI** (`@cf/meta/llama-3.3-70b-instruct`) | Reading material generation |
| **D1** (SQLite at the edge) | Persistent opinion and reading materials storage |
| **KV** | Immutable read cache for generated materials |

---

## Architecture

### Request flow

```
Browser / Social Crawler
        │
        ▼
elinal.zyxwonderland.xyz  (Cloudflare DNS / proxy)
        │
        ▼
  Cloudflare Worker  (src/index.js)
        │
        ├─ /api/health           → liveness check (external + binding probes)
        ├─ /api/search?q=        → D1 LIKE search (opinions + glossary)
        ├─ /api/opinions         → paginated opinion list (D1)
        ├─ /api/opinions/:docket → opinion detail (D1)
        ├─ /api/opinions/:docket/reading
        │       │
        │       ├─ KV hit  → return cached JSON  (X-Cache: hit)
        │       └─ KV miss → D1 → return + backfill KV
        │
        ├─ POST /api/admin/ingest  → manual scraper trigger (Bearer token)
        │
        └─ /* (SPA fallback)
                │
                ├─ ASSETS.fetch()   → serve built React app
                ├─ HTMLRewriter     → inject per-opinion OG meta for crawlers
                └─ CSP frame-ancestors → allow embedding on zyxwonderland.xyz
```

### Ingestion pipeline

```
Cron trigger (weekdays 15:00 UTC)
        │
        ▼
  runScraper()  (src/scraper.js)
        │
        ├─ Pass 1: fetchRecentOpinions() → CourtListener API
        │           └─ upsertOpinion() → D1  (ON CONFLICT DO NOTHING)
        │
        └─ Pass 2: listPending() → D1
                    │  (includes stale 'processing' > 1 hour)
                    │
                    ▼  for each pending opinion:
                    ├─ fetchOpinionText() → CourtListener API
                    ├─ generateReadingMaterials() → Workers AI (Llama 3.3 70B)
                    │       └─ validateReadingMaterials() (≥4 sections, body ≥100 chars)
                    ├─ saveReadingMaterials() → D1
                    ├─ setOpinionStatus('ready') → D1
                    └─ ELINAL_CACHE.put('rm:{docket}') → KV
```

### Client (React SPA)

```
elinal/client/  (React 18 + Vite 5 + TypeScript + React Router v6)
        │
        ├─ /               → OpinionList (fetches /api/opinions)
        │       └─ SearchBar → /api/search (300ms debounce, 30 req/min limit)
        │
        └─ /:docket        → ReadingView
                ├─ Polls /api/opinions/:docket/reading (202 → retry, max 6 × 10s)
                ├─ SectionBlock → inline GlossaryTooltip (hover/focus, longest-first)
                ├─ GlossarySection → full term list
                ├─ DiscussionQuestions
                ├─ FurtherReading
                ├─ ShareButton (Web Share API → clipboard fallback)
                └─ postMessage bridge → zyxwonderland.xyz parent frame
```

---

## Key Design Decisions

### 1. Workers AI instead of an external LLM API

**Why:** No API key management, no third-party billing, no egress. The model runs on Cloudflare's own GPU infrastructure, billed per neuron-second against the same account that hosts the worker. Failure of the AI layer is isolated to the worker's scheduled run; the reading-materials-served path hits KV/D1 and never calls the model at all.

**Trade-off:** Workers AI model selection is limited to what Cloudflare offers. `llama-3.3-70b-instruct` is capable for this task, but if a better model is needed later, switching requires only a `ELINAL_MODEL` env var change and a prompt re-test.

### 2. KV as an immutable read cache in front of D1

**Why:** Reading materials, once generated, never change. KV reads are sub-millisecond at the edge, globally consistent for reads, and free at low volume. D1 has slightly higher latency and counts against query limits. For the hot path (a user loading a known opinion), KV avoids the D1 round-trip entirely.

**Trade-off:** KV has no TTL on these entries — materials cached there are permanent. If regeneration is ever needed (e.g., `PROMPT_VERSION` bump), the operator must manually delete the KV entry or flush the namespace. This is acceptable because regeneration is expected to be rare (once per major prompt change) and can be handled with a `wrangler kv key delete` command.

### 3. D1 (SQLite) for durable storage

**Why:** The data model is simple: two tables, foreign key relationship, integer and text columns. SQLite's query model is well understood, D1 is provisioned in seconds via `wrangler d1 create`, and it requires no connection pooling or maintenance windows. Migrations are plain `.sql` files run via `wrangler d1 execute`.

**Trade-off:** D1 is not a high-throughput OLTP database. At SCOTUS scale (dozens of opinions per term), this is irrelevant. If ELINAL were extended to cover all federal courts (thousands of opinions weekly), D1 would need to be replaced with a more capable persistence layer.

### 4. Per-IP in-memory rate limiting

**Why:** Simple, zero-latency, zero-cost. No Durable Object needed at this traffic level.

**Trade-off:** Not globally consistent — Cloudflare runs multiple isolates per PoP and routes requests non-deterministically. The effective limit is `max × active_isolates`. For a low-traffic personal project this is acceptable. If global enforcement becomes necessary, the `ipAllow` function is the only thing that needs to be replaced (with a Durable Object counter).

### 5. React SPA served from Worker ASSETS binding

**Why:** Keeps the entire application on one subdomain (`elinal.zyxwonderland.xyz`) with one deploy pipeline step. The Worker intercepts all requests first (`run_worker_first = true`), handles API routes, and falls through to the asset binding for SPA delivery. This also allows the Worker to inject per-opinion OG meta tags at serve time via `HTMLRewriter`, giving social crawlers proper previews without SSR.

**Trade-off:** Every SPA request goes through the Worker, adding a small overhead versus serving assets directly from Cloudflare's CDN. In practice this overhead is ~1ms at the edge and imperceptible.

### 6. HTMLRewriter for per-opinion OG meta

**Why:** The SPA is a single `index.html`. Social crawlers (Twitter, Slack, iMessage) fetch the raw HTML and do not execute JavaScript, so React cannot dynamically populate OG tags for them. HTMLRewriter lets the Worker rewrite the static HTML stream in-flight, injecting opinion-specific `<title>`, `og:title`, `og:description`, and `twitter:*` tags without SSR or a separate prerender step.

**Trade-off:** Only works when the opinion is already in KV cache (i.e., after the pipeline has run). New opinions that haven't been processed yet will get the default OG meta. This is acceptable — by the time a case is shareable, it has already been processed and cached.

### 7. `postMessage` bridge for parent-frame embedding

**Why:** ELINAL is designed to be embeddable inside `zyxwonderland.xyz` via an `<iframe>`. The bridge allows the parent page to navigate ELINAL programmatically and receive events (which opinion is being viewed). Origin validation is strict — only `https://zyxwonderland.xyz` and `*.zyxwonderland.xyz` are trusted.

**Trade-off:** The `X-Frame-Options: DENY` header is removed for SPA responses and replaced with `Content-Security-Policy: frame-ancestors 'self' https://zyxwonderland.xyz https://*.zyxwonderland.xyz`. This is more precise than `DENY` (allows the specific parent, blocks everything else) but requires the CSP to be kept in sync with allowed parent origins if those ever change.

---

## Data Model

```sql
opinions (
    docket       TEXT PRIMARY KEY,    -- normalised, e.g. "24-1234"
    term         TEXT NOT NULL,       -- 2-digit, e.g. "24" (2024-25 term)
    title        TEXT NOT NULL,
    decided_date TEXT,                -- ISO 8601 date string
    cl_opinion_id   INTEGER,          -- CourtListener opinion ID
    cl_cluster_id   INTEGER,          -- CourtListener cluster ID
    status       TEXT NOT NULL        -- pending | processing | ready | error
        CHECK (status IN ('pending','processing','ready','error')),
    error_msg    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
)

reading_materials (
    docket          TEXT PRIMARY KEY REFERENCES opinions(docket) ON DELETE CASCADE,
    prompt_version  TEXT NOT NULL,    -- e.g. "v1"; bump to re-generate on next cron
    model           TEXT NOT NULL,    -- e.g. "@cf/meta/llama-3.3-70b-instruct"
    generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    sections        TEXT NOT NULL,    -- JSON: Section[]
    glossary        TEXT NOT NULL,    -- JSON: GlossaryEntry[]
    discussion      TEXT NOT NULL,    -- JSON: string[]
    further_reading TEXT NOT NULL     -- JSON: FurtherReadingEntry[]
)
```

---

## Reading Materials Format

The AI is instructed to return a single JSON object. The prompt pins the structure, the voice, and the required sections. `validateReadingMaterials()` in `pipeline.js` enforces structural integrity before anything is written to D1 or KV.

```ts
{
  sections: [{
    heading:    string,
    body:       string,   // 2–4 paragraphs separated by \n\n
    key_terms:  string[],
    pull_quote: string | null,
  }],
  glossary: [{
    term:       string,
    definition: string,   // precise and literal, written with seductive clarity
  }],
  discussion_questions: string[],
  further_reading: [{
    title:       string,
    description: string,
  }],
}
```

Required sections (in order): Background & Context → The Question Before the Court → What the Court Decided → The Reasoning → The Dissent (optional, only if present in opinion) → Why It Matters.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Cross-origin API abuse | `CORS: ALLOWED_ORIGIN_RE` — only `*.zyxwonderland.xyz` receives CORS headers |
| Rate abuse | Per-IP in-memory limiter: 60/min general, 30/min search, 5/min admin |
| Admin endpoint abuse | Static Bearer token (`ELINAL_ADMIN_TOKEN`) injected as a Worker secret |
| SQL injection | Parameterised D1 queries throughout; `likeEscape()` + `ESCAPE '\\'` for LIKE wildcards |
| MIME sniffing | `X-Content-Type-Options: nosniff` on all API responses |
| Clickjacking | `X-Frame-Options: DENY` on API responses; `CSP frame-ancestors` on SPA responses |
| Information leakage | `error_msg` field from D1 is never echoed in API responses; logged server-side only |
| Malicious iframe parent | `postMessage` listener validates `ev.origin` against trusted list before acting |
| XSS via OG injection | `HTMLRewriter.setAttribute()` handles encoding natively; no manual string interpolation |

---

## Operational Runbook

**Trigger a manual ingest:**
```
curl -X POST https://elinal.zyxwonderland.xyz/api/admin/ingest \
  -H "Authorization: Bearer $ELINAL_ADMIN_TOKEN"
```

**Check system health:**
```
curl https://elinal.zyxwonderland.xyz/api/health
```

**Regenerate reading materials for one opinion (prompt version bump):**
1. Update `PROMPT_VERSION` in `wrangler.toml` (e.g., `"v1"` → `"v2"`)
2. Delete the KV entry: `wrangler kv key delete --namespace-id=<id> "rm:<docket>"`
3. Set opinion back to pending in D1: `wrangler d1 execute elinal-db --remote --command="UPDATE opinions SET status='pending', error_msg=NULL WHERE docket='<docket>'"`
4. Trigger manual ingest

**Add a new schema migration:**
1. Create `elinal/worker/migrations/000N_description.sql`
2. Add a new migration step in `deploy.yml` (copy the existing step, change the filename)
3. D1's `IF NOT EXISTS` guards make it safe to run on every deploy

---

## Consequences

**Positive:**
- Zero ongoing server maintenance; no process to keep alive
- Global edge delivery with sub-50ms API responses for cached reads
- The entire system — scraper, AI, API, SPA, cache — is a single deployable unit
- Local tests run in Node via Vitest; no Cloudflare-specific test harness required
- Total monthly cost at low traffic: effectively $0 (within Cloudflare's free tier for Workers, D1, and KV)

**Negative / Accepted:**
- Rate limiting is per-isolate, not globally consistent
- KV cache eviction (for regeneration) is a manual operation
- Opinion list pagination is not implemented at launch — first 20 opinions only
- `decidedTerm()` uses 2-digit years; will need revisiting in 2100

---

## Alternatives Considered

| Alternative | Reason rejected |
|---|---|
| Next.js + Vercel | SSR overhead, separate deployment pipeline, external AI API cost |
| Fly.io + PostgreSQL + OpenAI | Monthly fixed cost even at zero traffic; two services to maintain instead of one |
| Static site + Lambda | Cold start latency; API key management for external AI; no edge-native KV |
| Cloudflare Pages Functions | Less control over routing; can't serve ASSETS and run Worker logic cleanly on same origin without the `run_worker_first` pattern |
