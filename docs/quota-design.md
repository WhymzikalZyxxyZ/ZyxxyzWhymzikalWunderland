# Quota Design

**Last updated:** 2026-06-01  
**Applies to:** Anonymail Cloudflare Worker

---

## Overview

Quota enforcement prevents a single client or a surge in demand from exhausting the Worker's Durable Object capacity. Without it, an adversary could create thousands of mailboxes, each holding a DO instance, which consumes Cloudflare's per-account DO limits and degrades performance for all users.

---

## Quota Tiers

| Limit | Value | Scope | Enforcement point |
|---|---|---|---|
| Global mailbox capacity | 500 (configurable via `MAX_MAILBOXES` env var) | All active mailboxes at once | RegistryDO on `POST /api/mailbox` |
| Mailbox creation rate | 10 / minute | Per IP | Worker `_ipAllowCreate()` |
| Global request rate | 120 / minute | Per IP | Worker `_ipAllow()` |
| Mailbox TTL | 1 hour default, max 24 hours | Per mailbox | MailboxDO alarm |
| Attachment size | 25 MB per file | Per attachment | MailboxDO `_saveDraft` / `_sendEmail` |
| Attachment count | 20 per email | Per email | MailboxDO |
| Message body | (no hard limit) | Per email | Bounded by the 25 MB attachment cap indirectly |

---

## Global Capacity Enforcement

The `RegistryDO` is the single source of truth for how many active mailboxes exist at any moment. It enforces the global capacity limit atomically — since only one RegistryDO instance runs globally, there are no race conditions.

### Flow

```
Client                  Worker                  RegistryDO
  │                       │                         │
  │  POST /api/mailbox    │                         │
  │──────────────────────►│                         │
  │                       │  POST /do/register      │
  │                       │────────────────────────►│
  │                       │                         │  count < MAX?
  │                       │                         │──────────┐
  │                       │                         │          │ YES: register, return ok
  │                       │                         │◄─────────┘
  │                       │  201 { address, token } │
  │◄──────────────────────│                         │
  │                       │                         │  NO: return 503
  │  503 capacity reached │                         │
  │◄──────────────────────│                         │
```

### RegistryDO enforcement logic

```javascript
// In RegistryDO._handleRegister():
const activeCount = this._sessions.size;
const max = parseInt(env.MAX_MAILBOXES) || 500;
if (max > 0 && activeCount >= max) {
    return _err('Mailbox capacity reached — try again later', 503);
}
// proceed with registration
```

Expired entries are pruned from `this._sessions` on every registration request and on the TTL alarm of each expiring mailbox (which calls the registry to deregister). This keeps the count accurate without a background sweep.

---

## Per-IP Rate Limiting

Implemented in `anonymail/worker/src/index.js` using an in-memory `Map` keyed by IP. Limits reset every sliding window.

```
Rate limit map: { ip → { count, resetAt } }
```

Two limits apply:
1. **Global** — 120 requests/min: prevents scraping and brute-force against the auth token space
2. **Create** — 10 mailboxes/min: prevents bulk mailbox creation from a single IP

**Limitation:** The rate limit map is per-isolate. Cloudflare may run multiple isolates of the same Worker under load — each isolate has its own map. This means the effective limit under high load could be higher than configured. This is acceptable for a personal site; for production, use Cloudflare Rate Limiting rules at the edge instead.

---

## TTL and Auto-Expiry

Each mailbox has a DO alarm set at `expiresAt`. When the alarm fires:
1. All in-memory email data is cleared
2. All WebSocket connections receive `{ type: 'expired' }` and are closed
3. DO persistent storage (token, address, expiresAt) is deleted
4. The registry is notified to remove the token

The maximum TTL is capped at 24 hours in the Worker, regardless of what the client requests via `/api/mailbox/extend`.

---

## Capacity Planning

| Metric | Estimate |
|---|---|
| Avg mailbox memory | ~2 MB (10 emails × ~200 KB each) |
| Max mailboxes (default) | 500 |
| Peak memory | ~1 GB across all DO instances |
| Cloudflare DO memory limit | 128 MB per instance — comfortably within range per mailbox |

The 500 mailbox default is conservative. A busy period might see 50–100 concurrent users. The limit can be raised in `wrangler.toml` (`MAX_MAILBOXES`) without code changes.

---

## Future: Per-IP Mailbox Limits

Currently, one IP can create up to 10 mailboxes per minute and hold all 500 if they create them fast enough. A future improvement would track `{ ip → mailboxCount }` in the RegistryDO and cap each IP at e.g. 5 concurrent mailboxes. This is not implemented yet — the creation rate limit is the primary protection.
