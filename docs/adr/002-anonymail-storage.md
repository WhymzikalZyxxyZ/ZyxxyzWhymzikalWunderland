# ADR-002: Anonymail — In-Memory Storage via Durable Objects

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

Anonymail generates temporary email addresses that expire after one hour. Each mailbox must hold emails, WebSocket connections, and session state for its lifetime, then disappear completely. The core product promise is that nothing is written to disk — ever. The backend must also support real-time email delivery to connected browser clients via WebSocket.

## Decision Drivers

- "Nothing persisted" is a hard product requirement, not a preference
- Real-time push to browser clients when email arrives
- Auto-expiry after TTL with guaranteed cleanup
- Single-writer consistency per mailbox (no concurrent writers)
- Free or low-cost to operate

## Options Considered

### Option A — Cloudflare Durable Objects (in-memory)
One `MailboxDO` instance per email address, keyed by address. Email data is held in the JavaScript heap — never written to DO persistent storage. A DO alarm fires at `expiresAt` to clear the instance. WebSocket connections are held as live objects on the DO.

**Pros:** True in-memory guarantee, single-writer per mailbox, WebSocket native, DO alarms handle TTL automatically, globally consistent  
**Cons:** Requires Workers Paid plan ($5/month) for Durable Objects

### Option B — Cloudflare KV with TTL keys
Store encrypted mailbox data in KV, setting a TTL so keys auto-expire. No persistent server needed.

**Pros:** Free tier (100k reads/day, 1k writes/day), no paid plan  
**Cons:** KV writes to disk — the core "nothing persisted" promise is broken. KV is eventually consistent; reads can return stale data. No WebSocket support; real-time delivery would require client polling. TTL granularity is seconds, not milliseconds.

### Option C — Redis (Upstash free tier)
Store encrypted sessions in Redis with key expiry. Can be accessed from a Cloudflare Worker via Upstash REST API.

**Pros:** Free tier, true in-memory Redis, sub-millisecond reads  
**Cons:** Data leaves Cloudflare's network on every read/write (latency), no WebSocket support, another vendor dependency, Upstash free tier has 10k commands/day limit

### Option D — Node.js server with in-memory Map
A long-running server holds all mailboxes in a JavaScript `Map`. Emails are never written to disk.

**Pros:** True in-memory, no third-party storage, WebSocket trivial  
**Cons:** Server requires dedicated hosting ($5+/month), single region means global latency, process restart loses all active sessions, no free option

## Decision

**Chosen option: Option A — Durable Objects.** It is the only option that satisfies all three hard requirements simultaneously: true in-memory storage, native WebSocket connections, and guaranteed TTL cleanup via alarms. The $5/month cost is accepted for production.

During development and while evaluating the paid plan, the `deploy-worker` CI job can be disabled (see `ADR-001`).

## Consequences

**Positive:**
- Emails genuinely never touch disk — the product promise is kept
- WebSocket push is native; no polling or SSE workaround needed
- DO alarms guarantee expiry even if the Worker is idle
- Single-writer consistency means no race conditions on inbox operations
- Cloudflare handles global routing and failover

**Negative / accepted tradeoffs:**
- $5/month Workers Paid plan required; free tier is insufficient
- DO eviction (if the instance is idle) clears ephemeral state before `expiresAt` — mitigated by persisting only `address`, `token`, and `expiresAt` to DO storage so re-authentication works after eviction
- Debugging DOs locally requires `wrangler dev` with limitations

**Risks:**
- If Cloudflare experiences a regional DO outage, active mailboxes in that region are unreachable
- DO memory is limited (~128MB per instance) — mitigated by the 25MB attachment cap and 1-hour TTL

## Notes

- `MailboxDO` implementation: `anonymail/worker/src/mailbox-do.js`
- `RegistryDO` (token → address index): `anonymail/worker/src/registry-do.js`
- The KV option (B) was explicitly rejected because it breaks the product's privacy promise
- See `docs/quota-design.md` for mailbox capacity limits
