# ADR-003: Firebase Realtime Database for Community Features

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

The site has community features — a forum, a guestbook, and a wellness tracker — that require persistent storage and multi-user reads. The site is otherwise a static site with no server-side runtime. A storage backend must be reachable directly from the browser without an intermediary API server.

## Decision Drivers

- No dedicated server available (static site constraint — see ADR-001)
- Multi-user persistence required: posts survive page refreshes and are visible to all users
- Free tier must cover expected low traffic for a personal site
- Real-time updates are a nice-to-have for the forum
- Anonymous access must be possible (no mandatory sign-up)

## Options Considered

### Option A — Firebase Realtime Database
Google-managed JSON database, accessible directly from the browser via the Firebase JS SDK. Real-time listeners push updates to all connected clients.

**Pros:** Free Spark tier (1GB storage, 10GB/month transfer, 100 simultaneous connections), browser SDK eliminates the need for a proxy server, real-time listeners for live forum updates, well-documented  
**Cons:** Vendor lock-in (Google), data model is a JSON tree (not relational), security rules can be complex, API keys are exposed in client-side JS (mitigated by Firebase Security Rules)

### Option B — Supabase (PostgreSQL)
Managed PostgreSQL with a REST API and JS client. Free tier available.

**Pros:** Relational data model, SQL queries, row-level security  
**Cons:** Free tier pauses instances after 1 week of inactivity — unacceptable for a forum that may be dormant but must be readable, requires more schema design upfront

### Option C — Local Storage / IndexedDB only
Store all community data in the browser's local storage. No server.

**Pros:** Zero cost, zero infrastructure  
**Cons:** Data is per-device and per-browser — posts written on one device are invisible to everyone else. Not viable for a shared community feature.

### Option D — GitHub Issues / Discussions as a backend
Use GitHub's API to read/write issues as forum posts.

**Pros:** Free, no database to manage  
**Cons:** Requires GitHub authentication for writes, awkward UX, rate limited, exposes the repository to public issues

## Decision

**Chosen option: Option A — Firebase Realtime Database.** It is the only option that supports multi-user persistence from a static site without a server, on a free tier without inactivity pauses, with real-time push built in.

## Consequences

**Positive:**
- Forum posts, guestbook entries, and wellness data persist across devices and users
- Real-time listeners give the forum live update behavior without polling
- Firebase Security Rules enforce read/write permissions without a server
- Free Spark tier is sufficient for personal site traffic

**Negative / accepted tradeoffs:**
- Firebase config (API key, project ID, etc.) is visible in client-side JS. This is expected and safe — Firebase API keys are not secrets; Security Rules are the access control layer
- Data is in Google's infrastructure; export is possible but migration would require a rewrite of all community modules
- Eventual consistency: a write is acknowledged before it propagates to all listeners

**Risks:**
- Firebase Spark free tier limits could be hit if the site goes viral (100 simultaneous connections, 10GB/month transfer)
- Google has deprecated Firebase products before — long-term availability is not guaranteed

## Notes

- Firebase config is generated at deploy time from GitHub Actions secrets: `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc.
- The config is written to `js/config/firebase-config.js` during the CI deploy job
- Community modules: `js/community/forum.js`, `js/community/guestbook.js`, `js/community/wellness.js`
- See `docs/caching-strategy.md` for how Firebase reads are cached
- See `js/circuit-breaker.js` for resilience patterns applied to Firebase calls

## Identity model

Although usernames are stored inside Firebase message and score records, there is **no Firebase "users" node**. Usernames are session-scoped display labels generated client-side — they exist only as fields within the records they attribute, not as standalone identities. A new username is generated each browser session, deliberately preventing cross-session tracking.

- See `docs/privacy-architecture.md` for the full identity model
- See `docs/adr/005-session-scoped-identity.md` for the identity decision record
