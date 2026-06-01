# Whymzykal Wunderland — Design Document

**Author:** Zyxxyz  
**Domain:** zyxwonderland.xyz  
**Repository:** ZyxxyzWhymzykalWunderland  
**Last updated:** 2026-06-01

---

## Overview

Whymzykal Wunderland is a personal website built as a static site hosted on GitHub Pages, organized into four themed sections — Gamer, Technologist, Virtuoso, and Community — plus a self-contained encrypted email service (Anonymail) backed by a Cloudflare Worker.

The site requires no server for most features. Backend functionality is limited to two external services: Firebase (community persistence) and Cloudflare Workers (Anonymail).

---

## Site Sections

### Gamer
Interactive browser games. Each game has its own HTML page and a corresponding UI controller in `js/gamer/`. All game logic lives in isolated engine modules under `js/engines/` so that the engines can be unit-tested independently of the DOM.

| Game | Engine | Controller |
|---|---|---|
| Tetris | `js/engines/tetris-engine.js` | `js/gamer/tetris.js` |
| Snake | `js/engines/snake-engine.js` | `js/gamer/snake.js` |
| Rock Paper Scissors | `js/engines/rps-engine.js` | `js/gamer/rps.js` |
| Pong | `js/engines/pong-engine.js` | `js/gamer/pong.js` |
| Puzzle | `js/engines/puzzle-engine.js` | `js/gamer/puzzle.js` |
| Chess | `js/engines/chess-engine.js` | `js/gamer/chess.js` |
| Checkers | `js/engines/checkers-engine.js` | `js/gamer/checkers.js` |
| Blackjack | `js/engines/blackjack-engine.js` | `js/gamer/blackjack.js` |
| Solitaire | `js/engines/solitaire-engine.js` | `js/gamer/solitaire.js` |
| Poker | `js/engines/poker-engine.js` | `js/gamer/poker.js` |
| Five-Card Draw | `js/engines/five-card-draw-engine.js` | `js/gamer/five-card-draw.js` |
| Daedalus | _(inline)_ | `js/gamer/daedalus.js` |

A shared card deck module (`js/engines/card-engine.js`) is used by Blackjack, Poker, Five-Card Draw, and Solitaire.

Daedalus is a custom narrative game with level-based cutscenes. It does not have a separate engine module.

### Technologist
Interactive developer tools and simulators. All tools run entirely in the browser with no server round-trips.

| Tool | File | Description |
|---|---|---|
| Architect | `js/technologist/architect.js` | Conversational system design assistant |
| Pipeline | `js/technologist/pipeline.js` | CI/CD pipeline simulator with metrics |
| Rate Limiter | `js/technologist/rate-limiter.js` | Token bucket / sliding window visualizer |
| System Operator | `js/technologist/systemoperator.js` | Browser-based terminal emulator |
| Editor | `js/technologist/editor.js` | Code editor with syntax highlighting |
| Lapis Lazuli | `js/technologist/lapislazuli.js` | In-browser SQL playground |
| Query Plan | `js/technologist/query-plan.js` | SQL query plan visualizer |
| Schema Diff | `js/technologist/schema-diff.js` | Database schema comparison tool |
| Software | `js/technologist/software.js` | In-browser Python runner (Skulpt + sql.js) |
| State Machine | `js/technologist/state-machine.js` | Finite state machine builder and visualizer |
| BIOS/UEFI | `js/technologist/biosuefi.js` | BIOS simulation |
| Hacker | `js/technologist/hacker.js` | Terminal aesthetic simulator |
| Investor | `js/technologist/investor.js` | Portfolio / returns simulator |
| Prism | `js/technologist/prism.js` | Color / light spectrum tool |
| Sorting Hat | `js/technologist/sortinghat.js` | Algorithm sorting visualizer |
| Distributed Systems | `js/technologist/distributed.js` | Raft consensus, partitions, Lamport clocks |

### Virtuoso
Creative content display. These pages are primarily presentational — they render user-created content (drawings, audio, animations, stories, comics, crafts).

```
virtuoso/
  drawings/doodles.html     — Freehand drawings
  audio/melody.html         — Original music / MIDI
  audio/adagio.html         — Classical-style compositions
  animations/motionpictures.html
  comics/webcomic.html
  crafts/handmade.html
  writings/stories.html
```

### Community
Social features backed by Firebase Realtime Database.

| Feature | Page | Module |
|---|---|---|
| Forum | `community/forum.html` | `js/community/forum.js`, `js/community/forum-utils.js` |
| Guestbook | `community/guestbook.html` | `js/community/guestbook.js` |
| Wellness | `community/wellness.html` | `js/community/wellness.js` |
| Gamer Chat | _(embedded in games hub)_ | `js/gamer/gamer-chat.js` |

All community data is written to and read from Firebase. Anonymous usernames are generated client-side via `js/username-gen.js`.

---

## Anonymail

A self-contained temporary encrypted email service. It lives at `anonymail/` and is architecturally independent from the rest of the site.

### User Flow

```
1. User visits Anonymail → clicks "Generate my address"
2. POST /api/mailbox  →  Worker creates MailboxDO, registers token
3. Browser connects via WebSocket (/ws?addr=...)
4. Inbound email arrives via Cloudflare Email Routing → email() handler → MailboxDO
5. MailboxDO broadcasts { type: 'new_email' } to all open WebSockets
6. Browser fetches and decrypts the email from GET /api/box/inbox/:id
7. Mailbox auto-expires after 1 hour (configurable); all data is discarded
```

### Backend Architecture

The Worker runs on Cloudflare's edge. Two Durable Objects handle state:

**MailboxDO** (`src/mailbox-do.js`)
- One instance per email address, keyed by address string
- Stores email data in memory only — nothing written to DO persistent storage except `address`, `token`, and `expiresAt` (for re-authentication after eviction)
- Manages WebSocket connections for real-time delivery
- Encrypts all email content with AES-256-GCM on arrival
- Sets a DO alarm at `expiresAt` to auto-evict and broadcast `expired`
- Handles inbox, drafts, and sent mailboxes
- Blocks executable MIME types on attachment upload

**RegistryDO** (`src/registry-do.js`)
- Single global instance (`idFromName('registry')`)
- Maps bearer tokens → email addresses for authentication
- Used by the Worker's `resolveMailbox()` on every authenticated request

### API Surface

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/mailbox` | None | Create mailbox; returns `{ address, token, expiresAt }` |
| `GET` | `/api/mailbox` | Bearer | Get mailbox info |
| `POST` | `/api/mailbox/extend` | Bearer | Extend TTL by `extra` ms |
| `DELETE` | `/api/mailbox` | Bearer | Burn mailbox immediately |
| `GET` | `/api/qr` | Bearer | QR code image for address |
| `GET` | `/api/box/:box` | Bearer | List emails in inbox/drafts/sent |
| `GET` | `/api/box/:box/:id` | Bearer | Fetch single email |
| `DELETE` | `/api/box/:box/:id` | Bearer | Delete email |
| `GET` | `/api/box/:box/:id/attachment/:attachId` | Token in query | Download attachment |
| `POST` | `/api/draft` | Bearer | Save draft |
| `PUT` | `/api/draft/:id` | Bearer | Update draft |
| `POST` | `/api/send` | Bearer | Send outbound email |
| `WS` | `/ws?addr=...` | First message | Real-time event stream |

Rate limits: 120 requests/min per IP globally; 10 mailbox creations/min per IP.

### Security

- Bearer tokens are 256-bit random hex (`randomHex(32)`) — never placed in URLs
- WebSocket auth: token sent as the first message after connection (`{ type: 'auth', token }`) rather than in the query string
- AES-256-GCM encryption for all email body and attachment data stored in the DO
- Strict CSP and security headers on every response
- Blocked MIME types: `.exe`, `.sh`, `.bat`, `.com`, PE executables

### Frontend

```
anonymail/public/
  index.html       — Single-page app shell
  css/app.css      — Standalone stylesheet (not shared with main site)
  js/
    app.js         — Main application controller
    api.js         — API and WebSocket client
```

The Anonymail frontend is a single-page app with no framework dependency. State lives in `sessionStorage` to support multiple simultaneous addresses in one browser tab.

---

## Distributed Systems Architecture

The project incorporates distributed systems at two levels: the real infrastructure that runs the site, and an interactive simulator that teaches the underlying concepts.

### Real Distributed Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
└──────────────┬──────────────────────────┬───────────────────┘
               │ HTTP / WebSocket          │ HTTPS
               ▼                           ▼
┌──────────────────────────┐  ┌────────────────────────────────┐
│  Cloudflare Edge Network │  │     GitHub Pages (CDN)         │
│  ┌────────────────────┐  │  │  Static assets served from     │
│  │  Anonymail Worker  │  │  │  edge PoPs globally             │
│  │  (per-region DO)   │  │  └────────────────────────────────┘
│  │                    │  │
│  │  ┌─────────────┐   │  │  ┌────────────────────────────────┐
│  │  │ RegistryDO  │   │  │  │  Firebase Realtime Database    │
│  │  │ (global     │   │  │  │  Community: forum, guestbook,  │
│  │  │  singleton) │   │  │  │  wellness, gamer chat          │
│  │  └─────────────┘   │  │  └────────────────────────────────┘
│  │  ┌─────────────┐   │  │
│  │  │ MailboxDO   │   │  │  ┌────────────────────────────────┐
│  │  │ (per-addr)  │   │  │  │  Cloudflare Email Routing      │
│  │  └─────────────┘   │  │  │  Inbound SMTP → Worker email() │
│  └────────────────────┘  │  └────────────────────────────────┘
└──────────────────────────┘
```

**Consistency model — Anonymail:**
Each `MailboxDO` is a single-writer, single-reader Durable Object. Cloudflare guarantees exactly one instance of each DO is active at a time globally, so all reads and writes to a mailbox are serialized — no split-brain, no stale reads. This is CP (Consistent + Partition-tolerant) by design: if the DO's region is unavailable, the mailbox is temporarily unreachable rather than serving stale data.

**Consistency model — Firebase community features:**
Firebase Realtime Database uses eventual consistency with optimistic local updates. Writes propagate globally within seconds. This makes community features AP (Available + Partition-tolerant): the forum and guestbook stay readable during a Firebase region outage, though fresh writes may be delayed.

**CAP tradeoffs by subsystem:**

| Subsystem | Model | Tradeoff |
|---|---|---|
| Anonymail (MailboxDO) | CP | Strongly consistent; unavailable during DO eviction |
| Anonymail (RegistryDO) | CP | Single global token registry; same eviction caveat |
| Firebase (forum/guestbook) | AP | Always available; eventual consistency on writes |
| GitHub Pages | AP | CDN-cached; stale content possible during deploys |

**Lamport clocks — Anonymail:**
The Anonymail Worker attaches a monotonically incrementing logical clock to every message sent between the Worker and its Durable Objects. This provides a happens-before ordering of events within a single mailbox session, which is important for correct email ordering when multiple WebSocket connections deliver messages concurrently.

**Network partitions — Cloudflare Email Routing:**
If a MailboxDO is not yet initialized when an email arrives (e.g., the address was never registered or the DO expired), the Worker calls `message.setReject('Mailbox not found')`. The sending MTA receives a bounce, which is the correct partition behavior: reject rather than silently drop.

### Distributed Systems Simulator (`/technologist/distributed`)

An interactive browser-based simulator that demonstrates core distributed systems concepts:

**Raft Consensus (simplified)**
- Each node runs a state machine: `follower → candidate → leader`
- Followers start with a random election timeout (2.8s–5.6s)
- If a follower's timeout expires without a heartbeat, it starts an election: increments its term, votes for itself, and broadcasts `vote-req` to all peers
- A candidate that collects a majority of `vote-grant` responses becomes leader
- The leader broadcasts periodic heartbeats to reset follower timeouts and prevent new elections

**Network Partitions**
- A draggable partition line splits the canvas into two isolated groups
- Messages between nodes in different groups are silently dropped (simulating packet loss, not TCP reset — the sender doesn't know the message was lost)
- The "Split Brain" preset pre-creates two leaders on opposite sides of a partition; when the partition heals, one leader is demoted

**Lamport Logical Clocks**
- Each node maintains a Lamport clock initialized to 0
- On send: `sender.lamport++`; the clock value is embedded in the message
- On receive: `receiver.lamport = max(receiver.lamport, msg.lamport) + 1`
- The sidebar clock bar panel shows all nodes' clocks updating in real time

**Presets:**

| Preset | Purpose |
|---|---|
| 3-Node Cluster | Baseline: watch automatic leader election |
| 5-Node Cluster | Larger quorum; majority = 3 of 5 |
| Split Brain | Two leaders, one per partition side; heal to trigger re-election |
| Byzantine (7-Node) | 2 faulty (dead) nodes; demonstrates f < n/3 fault tolerance floor |

**Key invariant modeled:** a leader is only elected when it receives `⌊n/2⌋ + 1` votes from reachable live nodes. A minority partition cannot elect a leader when the majority partition is reachable and already has one.

---

## Infrastructure

### Hosting

| Layer | Provider | Notes |
|---|---|---|
| Static site | GitHub Pages | Deployed from `main` branch root |
| Anonymail Worker | Cloudflare Workers | Deployed from `anonymail/worker/` |
| Email routing | Cloudflare Email Routing | Routes inbound mail to the Worker's `email()` handler |
| Community data | Firebase Realtime Database | Keys stored as GitHub Actions secrets |
| Domain | Porkbun | DNS pointing to GitHub Pages + Cloudflare |

### CI/CD Pipeline (`.github/workflows/deploy.yml`)

Three jobs run on every push to `main`:

```
lint-and-test
  ├── ESLint (js/**/*.js)
  ├── Stylelint (css/*.css)
  ├── HTMLHint (**/*.html)
  └── Jest with coverage (90% threshold on all engine modules)

deploy-worker          (needs: lint-and-test)
  └── wrangler deploy  (anonymail/worker/)

deploy                 (needs: lint-and-test)
  ├── Generate Firebase config from secrets
  ├── Minify assets (Terser + clean-css-cli, inside node:20-alpine)
  ├── Upload artifact
  └── Deploy to GitHub Pages
```

`deploy-worker` and `deploy` run in parallel after `lint-and-test` passes.

### Required GitHub Secrets

| Secret | Used by |
|---|---|
| `FIREBASE_API_KEY` | `deploy` job — Firebase config generation |
| `FIREBASE_AUTH_DOMAIN` | `deploy` job |
| `FIREBASE_DATABASE_URL` | `deploy` job |
| `FIREBASE_PROJECT_ID` | `deploy` job |
| `FIREBASE_STORAGE_BUCKET` | `deploy` job |
| `FIREBASE_MESSAGING_SENDER_ID` | `deploy` job |
| `FIREBASE_APP_ID` | `deploy` job |
| `CLOUDFLARE_API_TOKEN` | `deploy-worker` job |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-worker` job |

---

## Code Organization

```
/
├── index.html                  — Site root / navigation hub
├── about.html
├── search.html
├── blog/
├── gamer/                      — Game pages
├── technologist/               — Tool pages
├── virtuoso/                   — Creative content pages
├── community/                  — Social pages
├── images/
├── css/
│   └── styles.css              — Shared stylesheet
├── js/
│   ├── script.js               — Global IIFE: theme, navigation, page transitions
│   ├── utils.js                — Shared helpers (esc, etc.)
│   ├── config/
│   │   └── firebase-config.js  — Generated at build time from secrets
│   ├── engines/                — Pure game logic (no DOM — unit-testable)
│   ├── gamer/                  — Game UI controllers
│   ├── technologist/           — Tool controllers
│   ├── virtuoso/               — Creative section controllers
│   └── community/              — Community feature modules
├── anonymail/
│   ├── public/                 — Anonymail frontend (standalone)
│   └── worker/                 — Cloudflare Worker (Node-incompatible runtime)
│       └── src/
│           ├── index.js        — HTTP + email entry points, routing
│           ├── mailbox-do.js   — Per-address Durable Object
│           ├── registry-do.js  — Token → address registry
│           ├── address.js      — Random address generator
│           └── crypto.js       — AES-256-GCM helpers
├── scripts/
│   └── minify.js               — Build-time asset minification
├── tests/                      — Jest test suite
└── .github/workflows/
    └── deploy.yml              — CI/CD pipeline
```

### Engine / Controller Split

Games use a two-layer pattern to keep logic testable:

- **Engine** (`js/engines/*.js`): pure functions and classes; no `document`, no `canvas` context, no `window`. Input: game state + action. Output: new state.
- **Controller** (`js/gamer/*.js`): reads DOM, calls engine, renders result to canvas or HTML.

This allows Jest to import and test engines directly in a Node environment without a browser.

---

## Testing

Jest runs in `node` environment. Coverage is collected from all engine modules and `forum-utils.js` and `username-gen.js`. The threshold is 90% across lines, functions, branches, and statements.

Browser-dependent files (`script.js`, all controllers) are excluded from coverage because they require a DOM and are not unit-testable in isolation.

---

## Local Development

```bash
# Install dependencies
npm install

# Run lint suite
npm run lint

# Run tests with coverage
npm test

# Minify assets locally
npm run minify

# Anonymail Worker (local dev server)
cd anonymail/worker
npm install
npm run dev     # wrangler dev
```

Firebase config for local development: copy `js/config/firebase-config.example.js` to `js/config/firebase-config.js` and fill in your project values.

The Anonymail frontend at `anonymail/public/` is served by `wrangler dev` from the Worker's `[assets]` binding — open `http://localhost:8787` when the dev server is running.
