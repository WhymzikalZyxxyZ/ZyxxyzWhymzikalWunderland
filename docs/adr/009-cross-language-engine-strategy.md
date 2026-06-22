# ADR-009: Cross-Language Chess Engine Strategy

**Date:** 2026-06-21
**Status:** Accepted
**Deciders:** Zyxxyz

---

## Context

The portfolio needs to demonstrate proficiency across multiple programming
languages without superficial "hello world" examples. The question was how to
create a meaningful, comparable implementation across all target languages.

## Decision Drivers

- Implementations must be non-trivial enough to demonstrate real language idioms
- They must be directly comparable — same algorithm, same test cases, same
  coverage requirements
- Each implementation must be independently useful (not just a benchmark toy)
- CI must be able to lint and test all implementations in parallel
- The choice of problem domain must be interesting enough to sustain the work

## Options Considered

### Option A — Separate problems per language
Implement a different classic algorithm in each language (sorting in Rust,
a web server in Go, a GUI app in Swift, etc.).

**Pros:** Shows each language in its natural domain  
**Cons:** Incomparable — you cannot evaluate quality across languages when
the problems differ; no unified test suite; harder to explain as a portfolio
narrative

### Option B — Shared algorithm, language-native implementations
Implement the same chess engine (alpha-beta minimax with piece-square tables)
in all target languages, with a shared set of positions used as test oracle.

**Pros:** Direct comparison of language characteristics (verbosity, type safety,
concurrency model, memory layout); same test oracle across all implementations;
chess is rich enough to exercise most language features (recursion, data
structures, pattern matching, mutability); natural benchmark suite  
**Cons:** Chess engine logic is intricate; bugs are easy to introduce when
porting; language-native idioms sometimes conflict with direct translation

### Option C — Wrap one canonical implementation via FFI
Implement in Rust and call it from all other languages via FFI/WASM/JNI.

**Pros:** One source of truth; guaranteed identical behavior  
**Cons:** Defeats the purpose — you learn nothing about the host language's
type system or idioms; CI is simpler but the portfolio signal is weaker

## Decision

**Chosen option: Option B** — same algorithm, independently implemented in
each language. The chess engine was chosen because:
- It exercises all fundamental language features: types, pattern matching,
  recursion, mutable state management, data structure choice
- It has an unambiguous correctness oracle (legal move generation against known
  positions)
- The minimax tree is a natural benchmark: nodes/second varies ~20x across
  implementations, making performance trade-offs visible and discussable
- It compiles to a native binary, a JVM artifact, a WASM module, and a
  browser script — covering all major execution environments

## Consequences

**Positive:**
- 9 independently linted and tested implementations, each at ≥ 90% coverage
- The benchmark suite (see `benchmarks/`) provides a data-driven language
  comparison narrative: Rust is fastest, Python is most readable, Swift and
  Kotlin benefit from compile-time safety, JS runs in every browser
- Each implementation doubles as a platform demo: the Swift engine runs in a
  macOS SwiftUI app; the Dart engine runs in a Flutter mobile app; the WASM
  build runs in the browser chess game as a progressive enhancement
- The discipline of porting the same algorithm nine times exposed two bugs
  in the original JS engine (en passant capture and castling rights propagation)

**Negative / accepted tradeoffs:**
- Maintaining correctness parity across 9 implementations is a non-trivial
  ongoing cost; a logic change must be propagated to all languages
- Some language idioms conflict with the direct port approach (e.g. Go prefers
  iteration over recursion; the minimax is recursive in all other languages)
- CI runs 20 jobs for a codebase that is largely one algorithm

## Notes

- See `docs/architecture/language-comparison.md` for a detailed language
  comparison derived from this work
- See `benchmarks/results.md` for the cross-language performance comparison
- The WASM build (`rust/wasm/`) allows the Rust engine to be loaded as a
  progressive enhancement in the browser chess game
- The Kotlin implementation uses Kotlin Multiplatform to share the engine
  between Android and JVM targets
