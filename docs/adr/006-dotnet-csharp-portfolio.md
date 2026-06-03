# ADR-006: .NET C# Portfolio Projects

**Date:** 2026-06-03  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

The site already has a JavaScript/TypeScript frontend, a Go backend (editor-service), and a Kotlin Multiplatform Android app. Adding C# projects rounds out the portfolio with the dominant enterprise ecosystem and demonstrates cross-platform, web API, real-time, and WASM capabilities within a single cohesive stack.

## Decision Drivers

- Demonstrate .NET breadth: mobile, REST API, real-time, and browser-based WASM
- Share business logic (chess engine, status models) across targets without duplication
- Each project must stand alone as a portfolio artefact with a clear, recognisable purpose
- Consistent namespace and project layout so the four projects read as a suite

## Options Considered

### Option A — Four independent projects with duplicated logic
Each project reimplements its own chess engine, DTOs, and status models.

**Pros:** No shared-library coupling  
**Cons:** Duplicated code, drift across implementations

### Option B — Shared class library with four consuming projects (chosen)
`dotnet/shared/ZyxxyzShared` is a `net9.0` library referenced by MAUI and Blazor. The API and SignalR are independent servers with no chess dependency.

**Pros:** Single source of truth for chess engine and status models; demonstrates library design  
**Cons:** Shared library must remain platform-agnostic (no MAUI/browser-specific APIs)

### Option C — Monolith ASP.NET Core app with hosted Blazor and SignalR
One project serving both the Blazor SPA and the SignalR hub.

**Pros:** Simpler deployment  
**Cons:** Mixes concerns; obscures the individual skills each project demonstrates

## Decision

**Chosen option: Option B** — shared class library consumed by MAUI and Blazor, with the API and realtime server as separate, independently runnable projects.

## Consequences

**Positive:**
- Chess engine and status models are tested once and reused everywhere
- Each project demonstrates a distinct skill: cross-platform UI (MAUI), REST (API), real-time (SignalR), WASM (Blazor)
- `ZyxxyzPortfolio.sln` lets a reviewer build the entire suite with a single `dotnet build`

**Negative / accepted tradeoffs:**
- MAUI and Blazor cannot independently evolve the chess engine without touching shared
- In-memory EF Core and in-memory SignalR state reset on restart — intentional for portfolio simplicity, not production-ready

**Risks:**
- net9.0 MAUI requires Xcode/Android SDK to build platform targets; CI only does a restore+build check, not device tests

## Notes

- See `docs/architecture/dotnet-portfolio.md` for a full project-by-project breakdown
- Shared library: `dotnet/shared/`
- MAUI app: `dotnet/maui/`
- Web API: `dotnet/api/`
- SignalR chat: `dotnet/realtime/`
- Blazor WASM: `dotnet/blazor/`
