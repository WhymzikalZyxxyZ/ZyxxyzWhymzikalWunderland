# ADR-008: Cloudflare Workers over AWS Lambda@Edge

**Date:** 2026-06-21
**Status:** Accepted
**Deciders:** Zyxxyz

---

## Context

The Locator worker, Anonymail, and the gateway all need edge compute: code
that runs globally close to the user, handles HTTP requests, and can access
fast persistent storage. The two primary candidates were Cloudflare Workers
and AWS Lambda@Edge.

## Decision Drivers

- Free tier must be sufficient for portfolio traffic
- Cold start latency must be imperceptible to users
- KV-style storage must be available without a paid tier
- Deployment must be automatable from GitHub Actions without AWS IAM complexity
- The runtime must be familiar enough to reason about without deep platform expertise

## Options Considered

### Option A — AWS Lambda@Edge + DynamoDB/ElastiCache
Lambda functions deployed to CloudFront edge locations, with DynamoDB for
persistence.

**Pros:** Part of the dominant cloud platform, strong hiring signal, mature
ecosystem, triggers available from many AWS services  
**Cons:** Lambda@Edge cold starts are 100–500 ms; DynamoDB free tier is
limited; IAM role configuration is verbose; CloudFront distribution setup
is complex; no true free tier for always-on edge compute; billing is
unpredictable at the function invocation level

### Option B — Cloudflare Workers + KV
V8 isolate-based workers deployed to Cloudflare's 300+ PoPs, with KV for
eventually-consistent distributed storage.

**Pros:** Sub-millisecond cold starts (isolate recycling, not container
spin-up); generous free tier (100k requests/day, 1 GB KV); `wrangler`
CLI makes deploy trivial; Workers runs on the same V8 as the browser so
the mental model is familiar; built-in CORS, rate limiting primitives  
**Cons:** No Node.js stdlib (must use Web APIs); KV is eventually consistent
(unsuitable for strong-consistency use cases); Durable Objects (for
real-time features) are behind a $5/month paid plan; vendor lock-in to
Cloudflare's platform

### Option C — Vercel Edge Functions
Next.js-native edge functions with built-in KV (Vercel KV, powered by Upstash).

**Pros:** Excellent DX if already on Vercel; tight integration with Next.js  
**Cons:** Vercel KV requires a paid plan for meaningful storage; the portfolio
does not use Next.js, so this would add framework overhead purely for hosting

## Decision

**Chosen option: Option B** — Cloudflare Workers with KV. The free tier
covers all portfolio traffic, cold starts are imperceptible, and `wrangler`
deploys in under 30 seconds from CI. The V8 runtime means worker code reads
like browser JS — no platform-specific mental model required.

## Consequences

**Positive:**
- Global edge compute at zero ongoing cost for the portfolio
- Sub-millisecond cold starts; users never wait for a container to spin up
- KV provides the stale-cache fallback pattern without a separate cache service
- `wrangler.toml` is a single-file deployment manifest; no IAM, no VPC config
- The Locator worker handles 8 upstream APIs with timeout + retry entirely in V8

**Negative / accepted tradeoffs:**
- No `fs`, no `child_process`, no Node builtins — must use `fetch` and Web APIs
- KV is eventually consistent: suitable for read-heavy geo data caches, not
  financial transactions
- Durable Objects (needed for the collab worker) require the $5/month paid plan
- All worker code ships in a single file after bundling; large dependencies are
  a deployment problem

## Notes

- See `ADR-001` for the overall hosting decision
- `docs/caching-strategy.md` details the KV TTL and stale-cache fallback design
- The rate limiter in `index.js` uses an in-memory Map per isolate — it resets
  on isolate eviction (roughly every few minutes), which is acceptable for
  portfolio-scale abuse prevention
