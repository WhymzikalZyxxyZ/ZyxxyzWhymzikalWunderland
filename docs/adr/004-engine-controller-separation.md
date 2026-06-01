# ADR-004: Engine / Controller Separation for Games (Hexagonal Architecture)

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

The site hosts eleven browser games (Tetris, Snake, Chess, Checkers, Pong, Puzzle, Blackjack, Solitaire, Poker, Five-Card Draw, RPS). Each game needs a rendering layer (canvas or DOM) and game logic (rules, state transitions, AI). A decision is needed on how to structure these to keep logic testable and rendering concerns separate.

## Decision Drivers

- Game logic must be unit-testable without a browser (Jest runs in Node)
- Rendering code changes frequently; logic should be stable and independently verifiable
- Code reuse: card games share deck mechanics — a shared module should be possible
- CI enforces 90% coverage on logic; rendering cannot be covered in unit tests

## Options Considered

### Option A — Monolithic per-game file
Each game is one file containing both logic and rendering mixed together.

**Pros:** Simple, no abstraction overhead  
**Cons:** Logic is coupled to `document` and `canvas` — untestable in Node, changes to rendering risk breaking logic, no code reuse between related games (Poker and Five-Card Draw would duplicate card mechanics)

### Option B — Engine / Controller split (Hexagonal pattern)
Game logic lives in a pure engine module (`js/engines/*.js`) with no DOM dependencies. A controller (`js/gamer/*.js`) wires the engine to the DOM and canvas. A shared card engine (`js/engines/card-engine.js`) is imported by all card games.

**Pros:** Engines are pure functions testable in Node, rendering changes don't touch logic, 90% coverage threshold is enforceable, card engine is shared by Blackjack, Poker, Solitaire, and Five-Card Draw  
**Cons:** Two files per game instead of one, some coordination needed at the boundary

### Option C — Class-based with dependency injection
Each game is a class. The constructor accepts a renderer interface that can be swapped for a test double.

**Pros:** Explicit boundary via interface  
**Cons:** Overkill for browser-only games, JavaScript class DI adds boilerplate without meaningful benefit over the module split, harder for a solo developer to maintain

## Decision

**Chosen option: Option B — Engine / Controller split.** It achieves testability, code reuse, and rendering isolation at the lowest complexity cost. This is a practical application of the Hexagonal Architecture pattern (Ports and Adapters): the engine exposes a port (its public functions), the controller is the adapter that connects it to the DOM.

## Consequences

**Positive:**
- All fourteen engine modules are covered at 90%+ by Jest (486 tests total)
- Card engine (`js/engines/card-engine.js`) is shared by four games — zero duplication of deck/hand logic
- Rendering changes are isolated to controller files, which are not in the coverage scope
- The pattern is consistent and navigable: every game follows the same two-file structure

**Negative / accepted tradeoffs:**
- Daedalus (the custom narrative game) does not have a separate engine — its logic is inlined in the controller. Acceptable because Daedalus has no reusable logic and no test coverage target.
- The split requires discipline: any developer adding a game must not add DOM calls to the engine

**Risks:**
- Controller files can accumulate logic that should live in engines if not actively reviewed
- Test coverage applies only to engines; controller rendering bugs have no automated safety net

## Notes

- See `docs/hexagonal-architecture.md` for the full pattern documentation
- Engine files: `js/engines/`
- Controller files: `js/gamer/`
- Card engine is the canonical example of the shared-port pattern: `js/engines/card-engine.js`
- Coverage config: `package.json` → `collectCoverageFrom`
