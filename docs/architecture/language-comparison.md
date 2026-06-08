# Language Comparison — Zyxxyz Wunderland Stack

This project uses four primary languages across its layers. Each was chosen for a specific role; understanding their differences explains the architecture.

---

## At a Glance

| | JavaScript | Go | Kotlin | C# |
|---|---|---|---|---|
| **Paradigm** | Multi (OOP, FP, procedural) | Procedural + concurrent | Multi (OOP, FP) | Multi (OOP, FP) |
| **Type system** | Dynamic, weak | Static, strong, inferred | Static, strong, inferred, nullable-safe | Static, strong, inferred, nullable-aware |
| **Compilation** | JIT (V8) / interpreted | AOT native binary | JVM bytecode / KMP native | JIT (CLR) / AOT (NativeAOT) |
| **Memory model** | GC (generational) | GC (tricolor concurrent) | GC (JVM) | GC (generational) |
| **Concurrency** | Event loop + async/await | Goroutines + channels | Coroutines (suspend) | async/await (Task, TPL) |
| **Null safety** | None (undefined/null coexist) | Zero values, no null | Nullable types enforced at compile time | Nullable reference types (opt-in warnings) |
| **Primary role here** | Frontend SPA, CI scripts | HTTP edge service | Android app, shared KMP engine | Cross-platform UI, REST API, real-time, WASM |

---

## JavaScript

**Runtime:** V8 (Node.js server-side, browser client-side)  
**Used for:** Static site frontend, linting scripts, build tooling

### Strengths
- Zero barrier for browser deployment — no compilation step
- Enormous ecosystem (npm); every web primitive has a library
- Prototype-based flexibility enables rapid feature iteration
- Async event loop handles I/O-bound work efficiently without threads

### Weaknesses
- No compile-time type safety; bugs surface at runtime
- `undefined` and `null` as separate concepts creates defensive-coding overhead
- Single-threaded; CPU-bound work blocks the event loop
- Module system fragmentation (CommonJS vs ESM) still causes friction

### In this project
The entire frontend runs as vanilla JS — no framework — with event-driven architecture (EventBus), lazy module loading, and sessionStorage-scoped identity. Linting (ESLint + Stylelint) and HTML validation are npm scripts run in CI.

---

## Go

**Runtime:** Compiled native binary  
**Used for:** `editor-service` — collaborative text editing backend

### Strengths
- Compiles to a single static binary; trivial to deploy
- Goroutines are cheap (2 KB stack vs ~1 MB for OS threads); scales to 100k+ concurrent connections easily
- Channels make concurrent communication explicit and safe
- Minimal syntax; new contributors read Go fluently in days
- Fast compilation; full rebuild of the editor-service in under a second

### Weaknesses
- Verbose error handling (`if err != nil` repeated throughout)
- Generics arrived late (Go 1.18) and the ecosystem hasn't fully adopted them
- No built-in dependency injection; wiring is manual
- GC pauses visible in sub-millisecond latency scenarios

### In this project
Handles real-time operational transform (OT) for collaborative editing. Goroutines manage each client connection; channels coordinate document state. Deployed as a Cloudflare Worker-adjacent binary via the editor-service.

---

## Kotlin

**Runtime:** JVM (Android) + Kotlin/Native (KMP shared module)  
**Used for:** Android app UI (Jetpack Compose), shared chess engine (KMP)

### Strengths
- Null safety enforced at compile time — eliminates entire class of NPE crashes
- Coroutines are first-class: structured concurrency, `suspend` functions, Flow
- Jetpack Compose declarative UI is concise and testable
- KMP (Kotlin Multiplatform) shares pure business logic across Android, iOS, JS, and JVM without duplication
- Interoperable with Java — full access to the JVM ecosystem

### Weaknesses
- JVM startup time and memory overhead vs Go or native
- KMP still maturing; iOS/macOS targets require Xcode to build
- Coroutine stack traces can be hard to read in production
- Build times with Gradle are significantly longer than Go or .NET

### In this project
The chess engine (`ChessEngine.kt`) is a KMP shared module — compiled once, consumed by the Android UI and (in principle) any other Kotlin target. The Android UI uses Jetpack Compose with a ViewModel/StateFlow pattern, mirroring the MAUI MVVM structure in C#.

---

## C#

**Runtime:** CLR (.NET 9 JIT) / WASM (Blazor mono runtime)  
**Used for:** MAUI cross-platform app, ASP.NET Core Web API, SignalR chat, Blazor WASM

### Strengths
- One language covers mobile (MAUI), web server (ASP.NET), real-time (SignalR), and browser (Blazor) — genuine full-stack
- LINQ provides expressive, composable data pipelines with deferred execution
- `async`/`await` is deeply integrated — cancellation tokens thread through every layer
- Records and pattern matching (C# 9+) reduce boilerplate dramatically
- Strong DI container built into ASP.NET Core; testability is first-class
- Nullable reference types catch null dereferences at compile time

### Weaknesses
- .NET ecosystem is large but historically fragmented (.NET Framework vs .NET Core vs Mono legacy)
- MAUI has rough edges on non-Windows platforms (especially macOS Catalyst)
- Blazor WASM initial download size is significant (~10 MB for the mono runtime)
- C# is verbose compared to Go for simple services; ceremony around interfaces and DI

### In this project
The shared library (`ZyxxyzShared`) provides the chess engine and status models in C#, mirroring the KMP shared module strategy in Kotlin. MAUI consumes the shared library for cross-platform mobile/desktop, while Blazor WASM consumes it for browser-based chess — demonstrating that one C# codebase can target four different runtimes.

---

## Concurrency Model Comparison

| | Mechanism | Abstraction | Backpressure |
|---|---|---|---|
| **JavaScript** | Event loop | `Promise` / `async/await` | Manual (no built-in) |
| **Go** | Goroutines + channels | `go func()`, `chan` | Channel buffer size |
| **Kotlin** | Coroutines | `suspend`, `Flow`, `Channel` | `Flow` operators (`buffer`, `conflate`) |
| **C#** | Thread pool + TPL | `Task`, `async/await`, `Channel<T>` | `System.Threading.Channels` |

---

## Type Safety Spectrum

```
Weakest ◄──────────────────────────────────────► Strongest
  JavaScript        C# (nullable opt-in)    Go / Kotlin / C# (nullable on)
  (runtime errors)  (warnings only)         (compile-time enforcement)
```

Go and Kotlin enforce nullability differently: Go uses zero values (no null concept), while Kotlin uses a compile-time nullable type system (`String?` vs `String`). C# added nullable reference types in C# 8 as opt-in warnings, less strict than Kotlin by default.

---

## Performance Characteristics

| | CPU-bound | I/O-bound | Memory footprint |
|---|---|---|---|
| **JavaScript (V8)** | Poor (single-threaded) | Excellent (event loop) | Medium |
| **Go** | Good (native, multi-core) | Excellent (goroutines) | Low |
| **Kotlin/JVM** | Good (JIT) | Good (coroutines) | High (JVM overhead) |
| **C# (.NET)** | Good (JIT/NativeAOT) | Excellent (async I/O) | Medium |

---

## When to Choose Each

| Scenario | Best fit | Why |
|---|---|---|
| Static site / browser UI | JavaScript | No deployment barrier |
| High-concurrency edge service | Go | Goroutine efficiency, small binary |
| Android app with shared logic | Kotlin | KMP, Compose, null safety |
| Cross-platform GUI + backend | C# | MAUI + ASP.NET in one ecosystem |
| Real-time server | Go or C# SignalR | Both handle websockets efficiently |
| Browser app (compiled) | C# Blazor or JavaScript | Blazor shares server models; JS has smaller runtime |
