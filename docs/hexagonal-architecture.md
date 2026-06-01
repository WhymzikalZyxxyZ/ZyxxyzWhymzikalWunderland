# Hexagonal Architecture (Ports and Adapters)

**Last updated:** 2026-06-01

---

## What it is

Hexagonal Architecture (also called Ports and Adapters, coined by Alistair Cockburn) organizes code around a core domain that has no knowledge of the outside world. The outside world — databases, UIs, APIs, test runners — connects to the core through well-defined interfaces called **ports**. The concrete implementations of those interfaces are **adapters**.

```
         ┌─────────────────────────────────────────┐
         │              Driving side                │
         │  (things that trigger the application)  │
         │                                         │
         │   Browser DOM   Jest tests   CLI         │
         └──────────────┬──────────────────────────┘
                        │  (calls port)
               ┌────────▼────────┐
               │                 │
               │   Core Domain   │  ← Pure logic, no I/O
               │    (Engine)     │
               │                 │
               └────────┬────────┘
                        │  (calls port)
         ┌──────────────▼──────────────────────────┐
         │              Driven side                 │
         │  (things the application calls out to)  │
         │                                         │
         │   Canvas renderer   Firebase   Fetch API │
         └─────────────────────────────────────────┘
```

The core never does `document.getElementById(...)`. The adapter never contains game rules.

---

## How this project applies it

### Games — the clearest example

**Port (the engine interface):**
Each game engine exposes pure functions that take state and return new state. No DOM, no canvas, no `window`.

```
js/engines/
  tetris-engine.js     — createGame(), drop(), rotate(), move()
  chess-engine.js      — createGame(), makeMove(), getLegalMoves()
  card-engine.js       — createDeck(), shuffle(), deal()
  ...
```

**Adapters (the driving side):**
Controllers wire the engine to the DOM and canvas. They receive user input, call the engine, and render the result.

```
js/gamer/
  tetris.js            — keydown → engine.move() → canvas render
  chess.js             — click → engine.makeMove() → board redraw
  ...
```

**Adapters (the driven side — test runner):**
Jest imports engines directly in Node, with no DOM. This is the second adapter — the test suite is just another adapter for the same port.

```
tests/
  tetris-engine.test.js   — calls engine.drop(), asserts on returned state
  chess-engine.test.js    — calls engine.makeMove(), asserts on board
```

The engine doesn't know whether it's being called by a browser or by Jest. That is the point.

### Anonymail — server-side hexagonal

**Core domain (MailboxDO logic):**
The `_handleDeliver`, `_saveDraft`, `_sendEmail` methods in `mailbox-do.js` are the domain core. They enforce business rules: attachment size limits, MIME type blocking, TTL enforcement.

**Adapters:**
- **HTTP adapter** (`index.js`) — translates HTTP requests into calls to the DO
- **WebSocket adapter** (`_handleWs` in `mailbox-do.js`) — translates WebSocket messages into domain operations
- **Email adapter** (`email()` handler in `index.js`) — translates Cloudflare Email Routing messages into domain `deliver` calls

The domain core (`mailbox-do.js`) does not parse HTTP. `index.js` does not make business decisions.

### Community features — partial application

The community modules (`forum.js`, `guestbook.js`, `wellness.js`) currently mix domain logic with Firebase adapter code inline. The event bus (`js/event-bus.js`) is the first step toward separation: domain events are emitted as facts, and the Firebase audit log subscriber is an adapter that reacts to them.

A fuller application of the pattern would extract a community domain layer:

```
js/community/
  domain/
    forum-domain.js       — validatePost(), buildThread(), filterByTag()
    guestbook-domain.js   — validateEntry(), paginateEntries()
  adapters/
    firebase-forum.js     — reads/writes via Firebase (current: inline in forum.js)
    firebase-guestbook.js — reads/writes via Firebase (current: inline in guestbook.js)
  forum.js               — wires domain + Firebase adapter + DOM
  guestbook.js           — wires domain + Firebase adapter + DOM
```

This refactor is not yet done — it is the natural next step for the community section.

---

## The rule in one sentence

**If you find yourself writing `document.getElementById` inside an engine, or game rules inside a controller, the boundary has been crossed.**

---

## Benefits realized

| Benefit | Evidence |
|---|---|
| Engine logic is unit-testable without a browser | 486 Jest tests pass in Node, zero DOM stubs in engine test files |
| 90% coverage threshold is enforceable | Engines have no untestable DOM branches |
| Card engine is reused across 4 games | `card-engine.js` is imported by Blackjack, Poker, Solitaire, Five-Card Draw |
| Rendering changes don't break logic | Controller rewrites have happened without touching engine test files |

---

## References

- Alistair Cockburn: [Hexagonal Architecture (2005)](https://alistair.cockburn.us/hexagonal-architecture/)
- See `docs/adr/004-engine-controller-separation.md` for the decision record
- Engines: `js/engines/`
- Controllers: `js/gamer/`, `js/technologist/`, `js/community/`
- Event bus: `js/event-bus.js`
