# ADR-007: Vanilla JS over a Framework for the Static Site

**Date:** 2026-06-21
**Status:** Accepted
**Deciders:** Zyxxyz

---

## Context

The static site contains ~25 interactive demos, 13 browser games, a community
section, and a creative portfolio. All of these are DOM-driven with user
interaction, state, and in some cases animation. The question was whether to
adopt a framework (React, Vue, Svelte) or stay with vanilla JS.

## Decision Drivers

- The site is a portfolio — it must demonstrate JavaScript fundamentals, not
  framework familiarity, as the primary signal
- Pages are independently navigated; there is no need for client-side routing
  or a shared component tree across the site
- Hosting is static file delivery with no build step, so a bundler would add
  friction without benefit
- Games and canvas-based demos require direct DOM and canvas manipulation;
  a VDOM abstraction adds overhead with no gain
- Time-to-interactive on a cold load matters; shipping zero framework JS is
  the fastest possible baseline

## Options Considered

### Option A — React (with Vite)
Component-based, excellent ecosystem, strong hiring signal.

**Pros:** Familiar to most developers, good tooling, declarative UI  
**Cons:** 45 KB+ runtime shipped to every page, requires a build step for
the static site, VDOM overhead in canvas-heavy games, introduces `useState`
patterns where direct DOM mutation is simpler, framework lock-in

### Option B — Svelte
Compiles to vanilla JS; minimal runtime overhead.

**Pros:** Small output, reactive by default, no VDOM  
**Cons:** Still requires a build step, adds a compilation dependency, less
portfolio differentiation from other React-tired devs

### Option C — Vanilla JS with ES modules
No framework, no build step, direct DOM APIs.

**Pros:** Zero runtime overhead, ships exactly what is written, demonstrates
deep JS literacy, no framework version drift, easiest static hosting story  
**Cons:** No component system (patterns must be invented), more verbose for
complex UI, no ecosystem of ready-made components

## Decision

**Chosen option: Option C** — vanilla JS with ES modules. The portfolio
context makes this the dominant choice: it proves the author can write
idiomatic JS without scaffolding. For The Locator, which is a genuine SPA
with complex state, React was chosen as the right tool — demonstrating
judgment about *when* a framework earns its cost.

## Consequences

**Positive:**
- Zero framework JS shipped to visitors
- Each page is independent; a JS bug on one page cannot cascade
- Games and canvas demos interact directly with browser APIs without adapter layers
- The codebase is readable without framework knowledge
- CI is simpler: ESLint, Stylelint, HTMLHint, Jest — no transpilation

**Negative / accepted tradeoffs:**
- No shared component system — patterns like modals and nav are repeated
- State management in complex demos is done with explicit module-scoped
  variables; discipline is required to avoid spaghetti
- Hiring signal for React roles is lower (mitigated by The Locator's React SPA)

## Notes

- The Locator (`the-locator/client/`) uses React + TypeScript + Vite, demonstrating
  the author knows when to reach for a framework
- See `ADR-001` for the overall static site architecture decision
- The `js/event-bus.js` module provides a lightweight pub/sub layer that
  substitutes for framework-level state sharing across modules
