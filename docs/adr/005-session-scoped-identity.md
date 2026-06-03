# ADR-005: Session-Scoped Randomized Identity

**Date:** 2026-06-03  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

The site has community and multiplayer features where messages and scores need human-readable attribution so that participants can distinguish one another within a shared space. A decision is needed on how to handle user identity: specifically, whether usernames persist across visits and how they are stored.

The site has no authentication system and no user accounts. The design goal is to allow participation without requiring sign-up, while maintaining enough attribution for messages to be readable in context.

## Decision Drivers

- No accounts, no logins — participation must be frictionless and anonymous
- Messages and scores need attribution so a thread is readable
- A username must not become a persistent tracked identity
- No cookies, no auth tokens, no cross-session linkage
- The identity model must be implementable entirely client-side

## Options Considered

### Option A — localStorage (persistent across sessions)
Generate a username once and store it in `localStorage`. The same username reappears on every return visit.

**Pros:** Consistent identity across sessions — the user "has" a username  
**Cons:** The username becomes a persistent tracked identity. Anyone observing Firebase data over time can correlate all messages from a single device to one username. This breaks the no-persistent-identity principle.

### Option B — sessionStorage (session-scoped)
Generate a username once per browser tab session and store it in `sessionStorage`. The username lives for the lifetime of the tab; a new one is generated on the next visit.

**Pros:** Username is tab-scoped and session-scoped — it cannot be used to track a user across visits. Still provides readable attribution within a session. No server-side storage required. Frictionless — no prompt or sign-up.  
**Cons:** The user gets a different username each visit — they cannot "be" the same person across sessions. Deleting your own old messages after returning is not possible (session UID is also session-scoped — by design).

### Option C — No username at all (fully anonymous)
Messages are stored with no attribution. All messages appear identical except for timestamp.

**Pros:** Maximum anonymity  
**Cons:** A thread of messages with no attribution is unreadable in a multi-user space. "Who said what" is information that makes a forum usable. The site's community features require at minimum ephemeral display names.

### Option D — User-chosen username with presence claim
Allow users to type a username, claim it via a Firebase transaction (blocking duplicates), and persist it in `sessionStorage`. A presence node in Firebase tracks who is online.

**Pros:** Users can self-identify with a name they chose  
**Cons:** Presence nodes track "online" status by username — this is persistent identity through the back door. Claiming a username creates a record of "this username was active at this time." The claim mechanism adds complexity with no privacy benefit.

## Decision

**Chosen option: Option B — sessionStorage.** It is the only option that provides human-readable attribution within a session while refusing to persist identity across sessions. The username is display attribution inside a record, not a user account.

The username is generated from a fixed wordlist (adjective + noun + random 3-digit number, ~190,000 combinations) entirely client-side. No server is involved in username generation or validation.

## Consequences

**Positive:**
- A username cannot be used to correlate messages across sessions — each visit produces a new one
- No presence tracking, no online/offline status by username
- No server-side user management — zero infrastructure for identity
- The site's privacy principle is consistently enforced: usernames exist only inside the records they attribute

**Negative / accepted tradeoffs:**
- A user cannot reclaim their username across visits — if they return, they are effectively a new participant
- "Delete my old messages" is not possible after the session ends (the session UID that gates deletion is also session-scoped)
- Two tabs open simultaneously generate two different usernames — this is a feature, not a bug

**Risks:**
- With ~190,000 combinations and low traffic, collisions within a session are unlikely but not impossible. The session UID (`crypto.randomUUID()`) is the authoritative authorship token; the username is display-only.

## Notes

- Username generation: `js/username-gen.js` — `genUsername()` and `getOrCreateUsername()`
- Storage: `sessionStorage` with key `zyxUsername`
- Forum implementation: `js/community/forum.js`
- See `docs/privacy-architecture.md` for the full data model
- This ADR supersedes the prior behavior (Option A, `localStorage`) which was removed in version/3.0.0
