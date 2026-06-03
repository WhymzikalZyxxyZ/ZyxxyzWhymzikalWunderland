# Privacy Architecture

**Last updated:** 2026-06-03

---

## Core principle

Every visitor to Whymzykal Wunderland gets **one randomized username per browser session**. That username is not stored anywhere as a standalone identity — it exists only as a field inside the records (messages, scores) that the user creates. When the browser tab closes, the session ends and the username is gone. The next visit generates a new one.

There are no accounts, no logins, no cookies, and no persistent user IDs.

---

## What a username is

A username is a randomly generated string of the form `AdjectiveNoun_NNN` (e.g. `VelvetSiren_847`). It is generated client-side from two wordlists and a random three-digit number, giving approximately 190,000 combinations. It is held in `sessionStorage` for the lifetime of the browser tab.

The username is **not** a user account. It is **display attribution** — a human-readable label so that messages in a shared space are distinguishable from one another within a session.

---

## What IS stored and why

Two categories of data persist beyond the session:

### 1. Messages (forum, game chat)

Each message record contains the username as a field:

```json
{ "username": "VelvetSiren_847", "text": "hello", "ts": 1717430000000 }
```

The username persists here because a message without attribution is indistinguishable from other messages in a shared thread. The username is **inside** the record — it is not a foreign key into a users table. There is no users table. The username in a message cannot be used to look up other messages by the same person after the session ends, because the session username is gone and a new one is generated on the next visit.

### 2. High scores (games)

Each high-score record contains the username as a field:

```json
{ "username": "VelvetSiren_847", "score": 42 }
```

Same principle: the username is attribution inside the record. Leaderboards are a list of records, not a list of users.

---

## What is NOT stored

| What | Why not |
|------|---------|
| Username independently (a "users" node/table) | There are no user accounts — nothing to key against |
| Online presence ("who is active now") | Tracking presence by username builds a persistent identity graph |
| Session history linking messages to a persistent account | A new username each session deliberately breaks this link |
| Cookies | None set anywhere on the site |
| Auth tokens or session tokens | No authentication system exists |
| IP addresses beyond per-minute rate limiting | See Rate Limiting section below |

---

## Feature-by-feature identity model

| Feature | Username scope | Stored in | Backend storage | Notes |
|---------|---------------|-----------|-----------------|-------|
| **Forum** | Session (`sessionStorage`) | Message records | Firebase Realtime DB | Username is in the message, not a separate node |
| **Game chat** | Session (`sessionStorage`) | Message records | Firebase Realtime DB | Same as forum |
| **High scores** | Session (`sessionStorage`) | Score records | Firebase Realtime DB | Username is in the score record |
| **Multiplayer rooms** | Session (`sessionStorage`) | Room document | Firebase Realtime DB | Ephemeral — room is removed when game ends |
| **Collab editors** | Per-connection random `peerId` | Not stored | None | `peerId` is never a username; only used for cursor color routing |
| **Anonymail** | Random email address per mailbox | Not stored | Encrypted, in-memory DO | Username concept does not apply; see ADR-002 |
| **Status page** | Not applicable | Not applicable | Service metrics only | No users involved |
| **Guestbook** | User-provided display name | Entry records | Firebase Realtime DB | Intentionally not anonymous — a guestbook entry is a signed note |

---

## Rate limiting

The API gateway rate-limits requests by IP address using per-minute slot keys (`rl:{ip}:{minuteSlot}`) stored in Durable Object storage. These keys are short-lived (keyed to a one-minute window) and are used purely for abuse prevention. No IP address is stored in analytics records or associated with usernames.

---

## The session boundary

`sessionStorage` is the storage mechanism for usernames. It has two properties that enforce the principle:

1. **Tab-scoped**: each browser tab has its own `sessionStorage`. Two tabs generate two different usernames.
2. **Session-scoped**: `sessionStorage` is cleared when the tab is closed. The username does not survive a browser restart.

This contrasts with `localStorage`, which persists across sessions and browser restarts — which would make the username a persistent identity.

---

## Architecture decision records

- [ADR-005](adr/005-session-scoped-identity.md) — Session-scoped randomized identity
- [ADR-003](adr/003-firebase-community.md) — Firebase for community features (persistence tradeoffs)
- [ADR-002](adr/002-anonymail-storage.md) — Anonymail in-memory storage (the strictest privacy guarantee on the site)
