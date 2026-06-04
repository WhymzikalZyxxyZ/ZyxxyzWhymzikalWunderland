# .NET C# Portfolio — Architecture Overview

## Project Map

```
dotnet/
├── shared/          ZyxxyzShared       net9.0 class library
├── maui/            ZyxxyzMaui         .NET MAUI cross-platform app
├── api/             ZyxxyzApi          ASP.NET Core Web API
├── realtime/        ZyxxyzRealtime     ASP.NET Core + SignalR
└── blazor/          ZyxxyzBlazor       Blazor WebAssembly SPA
```

`ZyxxyzPortfolio.sln` at `dotnet/` references all five projects for a single-command build.

---

## Shared Library (`dotnet/shared/`)

**Purpose:** Platform-agnostic business logic reused by MAUI and Blazor.

| Namespace | Contents |
|---|---|
| `ZyxxyzShared.Chess` | `ChessEngine`, `ChessGame`, `ChessMove`, `ChessModels` |
| `ZyxxyzShared.Status` | `ServiceStatus`, `SparklinePoint`, `ApiResult<T>` |

### Chess Engine Design

The engine uses a split-apply pattern to avoid circular dependency during legal-move generation:

- `ApplyMoveRaw` — applies a move to the board state without recomputing legal moves; used internally by `GetLegalMoves` when testing whether a move leaves the king in check.
- `ApplyMove` — public API; calls `ApplyMoveRaw`, then `GetLegalMoves`, then `UpdateStatus`.

**AI:** Minimax with alpha-beta pruning. Move ordering uses MVV-LVA (most-valuable-victim / least-valuable-attacker) to improve cutoff rates. Depth is capped at 4 plies for response-time reasons.

**Evaluation:** Material value + piece-square tables (PST) for all six piece types. PSTs encode positional preferences (e.g. knights prefer the centre, kings prefer corners in the middlegame).

---

## MAUI App (`dotnet/maui/`)

**Pattern:** MVVM via CommunityToolkit.Mvvm.

```
MauiProgram.cs          DI registration
AppShell.xaml           TabBar: Chess | Status
Pages/
  ChessPage.xaml(.cs)   Board built programmatically in code-behind
  StatusPage.xaml(.cs)  Pull-to-refresh CollectionView
ViewModels/
  ChessViewModel.cs     ObservableObject; AI runs on Task.Run(Dispatchers.Default)
  StatusViewModel.cs    ObservableObject; delegates to StatusService
Services/
  StatusService.cs      HttpClient wrapper for status.zyxwonderland.xyz
Converters/
  StatusColorConverter  bool? → Color (green/red)
  NotNullConverter      object? → bool visibility
```

**Board rendering:** The `ChessPage` code-behind rebuilds an 8×8 `Grid` of `Label` elements on every `BoardChanged` event. Labels use Unicode chess glyphs (♙♟♘♞…) and tap gesture recognisers routed back to `ChessViewModel.SquareTappedCommand`.

**Targets:** Android 21+, iOS 15+, macCatalyst 15+, Windows 10.0.19041+.

---

## Web API (`dotnet/api/`)

**Pattern:** Layered — Controllers → Services → Repositories → EF Core (in-memory).

```
Controllers/
  AuthController      POST /api/auth/register, POST /api/auth/login
  ScoresController    GET  /api/scores/{game}?limit=N
                      POST /api/scores  (requires Bearer JWT)
Services/
  AuthService         SHA-256 password hashing, 7-day JWT issuance
  ScoreService        Leaderboard query + score submission
Repositories/
  ScoreRepository     EF Core queries against AppDbContext
Data/
  AppDbContext        Scores + Users DbSets (in-memory database)
Models/
  Dtos.cs             Request/response records with validation attributes
  ScoreEntity.cs      EF entity
  UserEntity.cs       EF entity
```

**Authentication:** Symmetric HMAC-SHA256 JWT. Key configured via `Jwt:Key` in `appsettings.json`; override with an environment variable in production.

**OpenAPI:** Swagger UI at `/swagger`. Bearer security scheme registered so tokens can be tested inline.

---

## SignalR Chat Server (`dotnet/realtime/`)

**Pattern:** Single `ChatHub` with a singleton `RoomService` managing in-memory state.

```
Hubs/
  ChatHub           JoinRoom, LeaveRoom, SendMessage, OnDisconnectedAsync
Services/
  RoomService       connection→(room,username) map; per-room Queue<ChatMessage> (max 50)
Models/
  ChatMessage       record(Room, Username, Text, SentAt)
DemoClient.cs       Inline HTML/JS demo page served at GET /
```

**Client events emitted:**

| Event | Payload | When |
|---|---|---|
| `History` | `ChatMessage[]` | On JoinRoom — last 50 messages |
| `ReceiveMessage` | `ChatMessage` | On every new message |
| `UserJoined` | `string username` | When a connection joins a room |
| `UserLeft` | `string username` | On LeaveRoom or disconnect |

**CORS:** `AllowAnyOrigin + AllowCredentials` with `SetIsOriginAllowed(_ => true)` — required for SignalR WebSocket upgrade.

---

## Blazor WebAssembly (`dotnet/blazor/`)

**Pattern:** Scoped state service + reactive Razor components.

```
Program.cs              WebAssemblyHostBuilder, DI
App.razor               Router
Layouts/
  MainLayout.razor      NavBar + @Body
Pages/
  ChessPage.razor       @page "/"; 8×8 board grid, click handling
Services/
  ChessStateService.cs  Holds ChessGame state; fires StateChanged event
wwwroot/
  index.html            Bootstrap entry point
  app.css               Dark theme matching site palette
```

**Reactivity:** `ChessStateService` fires `Action StateChanged` after each state mutation. `ChessPage.razor` subscribes in `OnInitialized` and calls `InvokeAsync(StateHasChanged)` to schedule a re-render on the Blazor synchronisation context.

**AI:** `Task.Run(() => ChessEngine.GetAIMove(game))` offloads the minimax search from the WASM thread, keeping the UI responsive during computation.

**Shares:** `ZyxxyzShared.Chess` directly — same engine, same models, zero duplication with MAUI.

---

## Cross-cutting Concerns

| Concern | Approach |
|---|---|
| Shared logic | `ZyxxyzShared` class library (`net9.0`, no platform deps) |
| Chess AI thread safety | `ChessGame` is an immutable record; AI operates on a snapshot |
| State reset on restart | Intentional — in-memory stores are portfolio demos, not production |
| Build verification | `.github/workflows/dotnet.yml` restores and builds all projects on push |
| Namespace convention | `Zyxxyz<Project>` root namespace, `Zyxxyz<Project>.<Layer>` sub-namespaces |
