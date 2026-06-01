# Caching Strategy

**Last updated:** 2026-06-01

---

## Overview

The site has two distinct caching surfaces:

1. **Static assets** — HTML, CSS, JS, images served by GitHub Pages via Cloudflare CDN
2. **Dynamic responses** — Anonymail API responses served by the Cloudflare Worker

Community features (Firebase) are read directly by the browser and are not behind a Worker — caching there is handled by Firebase's own SDK and browser HTTP caching headers.

---

## 1. Static Asset Caching (GitHub Pages + Cloudflare CDN)

### What is cached
All files served from the GitHub Pages origin: `*.html`, `*.css`, `*.js`, `*.png`, `*.svg`, `*.jpg`.

### Cache-Control policy

| Asset type | TTL | Rationale |
|---|---|---|
| HTML pages | Short (browser default / no explicit header) | Pages change on every deploy; stale HTML breaks the site |
| CSS / JS (unminified) | Short | Same as HTML — content changes on deploy |
| CSS / JS (minified, hashed filename) | Long (1 year) | Content-addressed: the filename changes when content changes |
| Images | Medium (1 week) | Infrequent changes; acceptable staleness |
| Fonts | Long (1 year) | Never change |

### Current state
GitHub Pages does not support custom `Cache-Control` headers per-file type. Cloudflare's edge cache respects the origin's `ETag` and `Last-Modified` headers and serves cached responses for repeat requests. A full deploy triggers cache invalidation at the edge automatically.

### Future improvement
To achieve long-TTL caching for hashed assets, the `scripts/minify.js` build step would need to output content-addressed filenames (e.g., `app.a3f9c2.min.css`) and update HTML references accordingly. This is a standard Vite/Webpack feature; manual implementation is possible but not currently prioritized.

---

## 2. Anonymail Worker Caching (Cloudflare Cache API)

### Cacheable endpoints

Only responses that are:
- **Identical for all authenticated requests to the same mailbox** AND
- **Not sensitive in transit**

are eligible for caching. This narrows to:

| Endpoint | Cacheable | TTL | Key |
|---|---|---|---|
| `GET /health` | Yes | 30 seconds | URL only |
| `GET /api/qr` | Yes | 5 minutes | `token:qr` — scoped to the session |
| `GET /api/box/:box` (list) | No | — | Email list changes on delivery |
| `GET /api/box/:box/:id` (full email) | No | — | Emails may be deleted |
| Attachments | No | — | Binary data; auth via token prefix |

### Implementation

`GET /health` is served directly from the Worker without a DO round-trip. No cache needed since it is already sub-millisecond.

`GET /api/qr` is cached in the [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) keyed by a hash of the bearer token. The QR code for a given address does not change during the mailbox lifetime, so caching for the full mailbox TTL (up to 1 hour) is safe. Cache is scoped per-token so different sessions cannot read each other's cached QR.

```javascript
// Worker pseudo-code for QR caching (implemented in mailbox-do.js _handleQr)
const cacheKey = new Request('https://cache.internal/qr/' + sha256(token).slice(0, 16));
const cached   = await caches.default.match(cacheKey);
if (cached) return cached;

const fresh = await generateQr(address);
await caches.default.put(cacheKey, fresh.clone(), { expirationTtl: 3600 });
return fresh;
```

### What is intentionally NOT cached

- Email list and individual emails — real-time delivery via WebSocket means the inbox changes at any moment; a stale cached list would miss emails
- `POST`, `PUT`, `DELETE` requests — never cached (standard HTTP semantics)
- Auth tokens — never stored in cache keys; the hash prefix is used instead

---

## 3. Firebase / Community Caching

Firebase's Realtime Database SDK maintains an in-memory local cache automatically. On reconnect, the SDK re-syncs only delta changes. This provides:
- Instant reads from cache on subsequent page loads within the same session
- Offline read support (data loaded earlier in the session remains readable)

No additional caching layer is implemented at the application level. The circuit breaker (`js/circuit-breaker.js`) handles the case where Firebase is unreachable — it fails fast rather than waiting for a timeout.

---

## 4. Cache Invalidation Rules

| Cache | Invalidated by |
|---|---|
| Cloudflare edge (static) | New GitHub Pages deploy (ETag change) |
| Worker QR cache | Mailbox burn (`DELETE /api/mailbox`) or TTL expiry |
| Firebase SDK cache | Page reload or explicit `.off()` then `.on()` |

---

## Decision log

See `docs/adr/001-static-site-architecture.md` for why GitHub Pages was chosen over a server that would give more caching control.
