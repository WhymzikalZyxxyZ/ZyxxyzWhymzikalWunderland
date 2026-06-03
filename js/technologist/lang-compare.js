'use strict';

/* ════════════════════════════════════════════════════════════
   DATA
════════════════════════════════════════════════════════════ */

const LANGS = {
    js: { label: 'JavaScript', color: '#f7df1e', role: 'Frontend · CI scripts' },
    go: { label: 'Go',         color: '#00acd7', role: 'Editor-service backend' },
    kt: { label: 'Kotlin',     color: '#a07fff', role: 'Android · KMP shared engine' },
    cs: { label: 'C#',         color: '#c07fe0', role: 'MAUI · API · SignalR · Blazor' },
    py: { label: 'Python',     color: '#4b8bbe', role: 'Scripting · Data · ML adjacency' },
    jv: { label: 'Java',       color: '#e76f00', role: 'JVM foundation · Android legacy' },
};

const METRICS = [
    { key: 'cpu',       label: 'CPU Performance',  scores: { js: 4, go: 9, kt: 7, cs: 8, py: 3, jv: 7 } },
    { key: 'io',        label: 'I/O Concurrency',  scores: { js: 8, go: 10, kt: 8, cs: 9, py: 6, jv: 7 } },
    { key: 'safety',    label: 'Type Safety',       scores: { js: 2, go: 7, kt: 10, cs: 8, py: 4, jv: 7 } },
    { key: 'ecosystem', label: 'Ecosystem',         scores: { js: 10, go: 6, kt: 7, cs: 8, py: 10, jv: 9 } },
    { key: 'xplat',     label: 'Cross-platform',   scores: { js: 9, go: 7, kt: 8, cs: 9, py: 9, jv: 9 } },
    { key: 'learn',     label: 'Ease of Learning',  scores: { js: 8, go: 8, kt: 6, cs: 5, py: 10, jv: 5 } },
];

function pill(text, cls) {
    return `<span class="pill pill-${cls}">${text}</span>`;
}

const ROWS = [
    { category: 'Core', items: [
        { label: 'Paradigm',
            js: 'multi-paradigm', go: 'procedural', kt: 'multi-paradigm',
            cs: 'multi-paradigm', py: 'multi-paradigm', jv: 'OOP' },
        { label: 'Type system',
            js: pill('dynamic','orange'), go: pill('static','green'), kt: pill('static','green'),
            cs: pill('static','green'),   py: pill('dynamic','orange'), jv: pill('static','green') },
        { label: 'Null safety',
            js: pill('none','red'),    go: pill('zero values','blue'), kt: pill('enforced','green'),
            cs: pill('opt-in','yellow'), py: pill('none','red'),        jv: pill('none','red') },
        { label: 'Compilation',
            js: 'JIT / interpreted', go: 'AOT native', kt: 'JVM / KMP native',
            cs: 'JIT CLR / WASM', py: 'interpreted (CPython)', jv: 'JVM bytecode (JIT)' },
    ]},
    { category: 'Concurrency', items: [
        { label: 'Model',
            js: 'Event loop', go: 'Goroutines + channels', kt: 'Coroutines',
            cs: 'async/await + TPL', py: 'asyncio / GIL-limited', jv: 'Threads / Virtual threads' },
        { label: 'Async syntax',
            js: 'async/await', go: 'go func()', kt: 'suspend fun',
            cs: 'async Task', py: 'async/await', jv: 'CompletableFuture' },
        { label: 'CPU parallelism',
            js: pill('none','red'), go: pill('native GOMAXPROCS','green'), kt: pill('JVM threads','blue'),
            cs: pill('ThreadPool','blue'), py: pill('GIL limited','red'), jv: pill('native threads','green') },
    ]},
    { category: 'Performance', items: [
        { label: 'Startup',
            js: pill('fast','green'), go: pill('instant','green'), kt: pill('JVM slow','orange'),
            cs: pill('medium','yellow'), py: pill('fast','green'), jv: pill('JVM slow','orange') },
        { label: 'Memory',
            js: 'medium', go: pill('low','green'), kt: pill('high (JVM)','orange'),
            cs: 'medium',  py: 'medium',           jv: pill('high (JVM)','orange') },
        { label: 'GC',
            js: 'V8 generational', go: 'tricolor concurrent', kt: 'JVM G1/ZGC',
            cs: '.NET generational', py: 'ref-count + cyclic', jv: 'G1/ZGC/Shenandoah' },
    ]},
    { category: 'Ecosystem', items: [
        { label: 'Package mgr',
            js: 'npm', go: 'go mod', kt: 'Gradle', cs: 'NuGet', py: 'pip / Poetry', jv: 'Maven / Gradle' },
        { label: 'Test framework',
            js: 'Jest', go: 'testing (stdlib)', kt: 'JUnit / Kotest', cs: 'xUnit', py: 'pytest', jv: 'JUnit 5' },
        { label: 'Linter',
            js: 'ESLint', go: 'golangci-lint', kt: 'ktlint', cs: 'Roslyn', py: 'Ruff / flake8', jv: 'Checkstyle / PMD' },
    ]},
];

const MATRIX = [
    { problem: 'Browser UI / SPA',               best: 'js',  runner: 'cs',  avoid: ['py','go'] },
    { problem: 'High-throughput HTTP API',        best: 'go',  runner: 'cs',  avoid: ['py','js'] },
    { problem: 'REST API — rich features',        best: 'cs',  runner: 'go',  avoid: ['jv'] },
    { problem: 'Android app (new project)',       best: 'kt',  runner: 'jv',  avoid: ['cs','py'] },
    { problem: 'Cross-platform mobile + desktop', best: 'cs',  runner: 'kt',  avoid: ['py','js'] },
    { problem: 'Real-time / WebSocket server',    best: 'cs',  runner: 'go',  avoid: ['js'] },
    { problem: 'Browser-compiled application',    best: 'cs',  runner: 'js',  avoid: ['py','jv'] },
    { problem: 'AI / ML — model training',        best: 'py',  runner: null,  avoid: ['js','jv'] },
    { problem: 'AI / ML — inference serving',     best: 'go',  runner: 'cs',  avoid: ['py'] },
    { problem: 'Data pipeline / ETL',             best: 'py',  runner: 'go',  avoid: ['jv','js'] },
    { problem: 'CLI / developer tooling',         best: 'go',  runner: 'py',  avoid: ['jv','cs'] },
    { problem: 'Scripting / automation',          best: 'py',  runner: 'go',  avoid: ['jv','cs'] },
    { problem: 'Game development (Unity)',        best: 'cs',  runner: null,  avoid: ['py','go'] },
    { problem: 'Shared logic: Android + iOS',     best: 'kt',  runner: null,  avoid: ['jv','py'] },
    { problem: 'Enterprise legacy integration',   best: 'jv',  runner: 'cs',  avoid: ['go','py'] },
    { problem: 'Chess AI — training',             best: 'py',  runner: null,  avoid: ['jv','js'] },
    { problem: 'Chess AI — search speed',         best: 'go',  runner: 'cs',  avoid: ['py','js'] },
];

const SUMMARY = [
    { key: 'py', text: 'The <em>lab</em>. Experiments, data, and AI start here. Everything else inherits its results.' },
    { key: 'go', text: 'The <em>pipe</em>. Moves data between systems at scale, without ceremony or overhead.' },
    { key: 'cs', text: 'The <em>studio</em>. Full product — UI, API, real-time, browser — one language, one ecosystem.' },
    { key: 'kt', text: 'The <em>Android specialist</em>. Null-safe, modern, and the only language with first-class iOS sharing via KMP.' },
    { key: 'jv', text: 'The <em>foundation</em>. Already running in most large enterprises. Join it — don\'t fight it.' },
    { key: 'js', text: 'The <em>window</em>. The only language that belongs in the browser by birthright. Everywhere else is borrowed territory.' },
];

const PROFILES = {
    js: {
        tagline: 'The only one who was always there.',
        desc: 'No installation required. No compilation step. It runs wherever a browser exists — which is everywhere. JavaScript is dangerous when trusted too blindly, and indispensable within its domain. The browser is its birthright. Everywhere else, it is a guest.',
        strengths: [
            { text: 'Zero deployment friction — a script tag is enough',
              detail: 'A &lt;script src="…"&gt;&lt;/script&gt; in any HTML file is a fully working deployment. No build pipeline, no runtime install, no packaging. This structural advantage is why JS dominates the browser unconditionally.' },
            { text: 'Async I/O via the event loop handles thousands of idle connections',
              detail: 'The V8 event loop processes callbacks without blocking. While one request waits on a network response, thousands of others are served. Ideal for chat servers, live feeds, and APIs with many concurrent but mostly-idle clients.' },
            { text: 'npm: the largest package registry on earth',
              detail: 'Over 2.5 million packages covering everything from cryptography to color conversion. Nearly any utility, UI component, or third-party integration has an existing npm module — often several competing ones.' },
            { text: 'Runs client-side and server-side from a single codebase',
              detail: 'Node.js brings the same V8 runtime to the server. Teams write one language for both layers — shared validation logic, shared TypeScript types, shared utility functions — without context-switching.' },
            { text: 'Prototype, ship, and iterate faster than any compiled language',
              detail: 'No compile step. No type annotations required. Open a file, write code, refresh the browser. The feedback loop is instant. This is why JS is the dominant rapid-prototyping choice even among teams that eventually switch to TypeScript.' },
        ],
        limits: [
            { text: 'Single-threaded — CPU-bound work blocks the event loop',
              detail: 'A 500 ms calculation in the main thread freezes every in-flight request. Web Workers exist as an escape hatch, but inter-worker communication is serialized and coordination overhead is significant.' },
            { text: 'No compile-time type safety without TypeScript',
              detail: 'A misnamed property, a wrong argument type, a null dereference — these surface at runtime, often in production. TypeScript solves this but requires a build step that plain JS projects deliberately avoid.' },
            { text: 'Runtime errors where other languages fail at build',
              detail: 'JS will silently coerce types ([] + {} === "[object Object]"), return undefined for missing keys, and continue executing. Strict mode and ESLint reduce this but cannot eliminate it — the language was designed to never crash the browser.' },
            { text: 'undefined and null coexist as separate concepts',
              detail: 'typeof null === "object" is a 30-year-old historical accident that cannot be fixed without breaking the web. Two distinct "nothing" values force defensive checks at every boundary: if (x !== null && x !== undefined).' },
            { text: 'Module system fragmentation (CJS vs ESM) still causes friction',
              detail: 'CommonJS (require / module.exports) and ES Modules (import / export) are incompatible without a transpilation step. Many packages publish only one format. In 2025, dual-package builds exist but add complexity, and some older toolchains still refuse clean ESM.' },
        ],
    },
    go: {
        tagline: 'Lean, precise, and never wastes a word.',
        desc: 'A single static binary. No runtime dependency, no installation, no surprise. Goroutines cost 2 KB each — spawn a hundred thousand of them and the scheduler multiplexes them across CPU cores without complaint. Go\'s discipline is its seduction: everything unnecessary has been removed.',
        strengths: [
            { text: '100k+ goroutines with trivial syntax: go func()',
              detail: 'Goroutines are scheduled by the Go runtime, not the OS. Each starts at 2 KB of stack space and grows on demand. 100,000 goroutines consume roughly 200 MB — far less than 100,000 OS threads would.' },
            { text: 'Single static binary — deploy to any Linux/Mac/Windows without a runtime',
              detail: 'GOOS=linux GOARCH=amd64 go build produces a self-contained binary. No interpreter, no VM, no dependency manager. Copy the binary to a server and it runs. This is why Go dominates infrastructure tooling.' },
            { text: 'Sub-second full recompilation on large codebases',
              detail: 'Go\'s compiler was designed for speed from day one. A full rebuild of a large service takes under a second. This is 10–50x faster than Kotlin/Gradle or a TypeScript tsc --build, and meaningfully faster than dotnet build.' },
            { text: 'Minimal memory footprint per service',
              detail: 'A Go HTTP server idles at 5–15 MB. The same service in a JVM language (Kotlin/Java) idles at 100–300 MB before serving a single request. At scale, this difference determines cluster cost.' },
            { text: 'Channels make concurrent communication explicit, not accidental',
              detail: 'chan T enforces that data flows between goroutines through typed, buffered or unbuffered queues. There is no shared mutable state by default — you hand off ownership through the channel. Race conditions require deliberate effort to introduce.' },
        ],
        limits: [
            { text: 'No first-class GUI or mobile framework',
              detail: 'Fyne provides a basic cross-platform GUI, but it is not competitive with WPF, MAUI, or Jetpack Compose in terms of polish or ecosystem. Go is not a language for building rich user interfaces.' },
            { text: 'if err != nil repeated at every call site — verbose by design',
              detail: 'Every function that can fail returns (T, error). Every call site must check if err != nil and handle it. This is explicit and traceable, but adds 3–5 lines for every fallible operation. Proposals for error handling syntax sugar have all been rejected.' },
            { text: 'Generics arrived in 1.18; ecosystem adoption is still catching up',
              detail: 'Before Go 1.18 (2022), generic data structures required code generation or interface{} with type assertions. The standard library still lacks generic collections (sorted sets, priority queues). Third-party packages are filling the gap gradually.' },
            { text: 'No dependency injection; wiring is entirely manual',
              detail: 'There is no Spring Boot or ASP.NET Core DI container. Dependencies are passed explicitly through constructors or function parameters. This is transparent and testable, but large applications require careful manual wiring.' },
            { text: 'Less expressive than Kotlin or C# for data transformation',
              detail: 'Go has no LINQ equivalent and no built-in map/filter/reduce until the experimental slices package in 1.21. Transforming a slice of structs into a different shape requires a for loop. Functional pipelines that take 1 line in Kotlin take 8 in Go.' },
        ],
    },
    kt: {
        tagline: 'Modern. Uncompromising. Null-safe.',
        desc: 'Built on the JVM but unwilling to inherit its sins. Null safety is not a lint warning — it is enforced at compile time. A variable is either non-null or explicitly declared nullable; there is no other option. Android\'s officially preferred language, and the only one with first-class iOS code sharing via Kotlin Multiplatform.',
        strengths: [
            { text: 'Null safety enforced at compile time — String vs String?',
              detail: 'String cannot hold null. String? can, and the compiler refuses to compile code that dereferences it without an explicit null check or safe-call operator (?.value). This single feature eliminates the #1 cause of Android app crashes: NullPointerException.' },
            { text: 'KMP compiles shared logic to Android, iOS, JVM, and JS',
              detail: 'Kotlin Multiplatform compiles a single shared module to JVM bytecode for Android, LLVM native for iOS, and JS for browser targets. Business logic (chess engine, data models, validation) is written once and consumed everywhere.' },
            { text: 'Coroutines with structured concurrency prevent resource leaks',
              detail: 'Every coroutine belongs to a CoroutineScope. When the scope is cancelled (e.g., an Activity is destroyed), all child coroutines are cancelled automatically. This prevents the common Android pattern of leaked background tasks after screen rotation.' },
            { text: 'Jetpack Compose: declarative, testable, concise Android UI',
              detail: 'Compose replaces XML layouts with composable functions. State flows down, events flow up. UI is a pure function of state — no manual view binding, no findViewById, no notifyDataSetChanged. Testing is structural, not screenshot-based.' },
            { text: 'Full interoperability with every Java library ever written',
              detail: 'Kotlin compiles to the same JVM bytecode as Java. Calling a Java library from Kotlin is syntactically identical to calling a Kotlin library. Migrating a Java file to Kotlin is incremental — both coexist in the same module.' },
        ],
        limits: [
            { text: 'JVM startup time and memory overhead vs native languages',
              detail: 'The JVM needs 200–500 ms to initialize and warms up JIT compilation over the first several seconds. A Kotlin REST API idles at 150–300 MB. GraalVM Native Image addresses this but requires ahead-of-time compilation and has reflection limitations.' },
            { text: 'Gradle build times are significantly longer than Go or .NET',
              detail: 'A fresh Kotlin/Android build can take 3–10 minutes on a typical CI machine. Incremental builds are faster but still slower than Go (seconds) or dotnet build (30–60s). The Gradle daemon helps, but Gradle itself is a substantial overhead.' },
            { text: 'KMP iOS target requires macOS and Xcode to compile',
              detail: 'Kotlin/Native for iOS compiles via LLVM and requires a macOS host with Xcode installed. Cross-compiling for iOS from Linux or Windows is not supported. CI/CD for KMP iOS targets must run on macOS agents, which are more expensive.' },
            { text: 'Coroutine stack traces are difficult to read in production',
              detail: 'When a coroutine throws across multiple suspension points, the stack trace shows internal coroutine machinery rather than your code. Debugging production coroutine failures often requires log correlation across suspension boundaries.' },
            { text: 'Smaller community than Java or Python for non-Android work',
              detail: 'For server-side Kotlin (Ktor), desktop (Compose Multiplatform), or data work, community resources, StackOverflow answers, and library quality are significantly thinner than Java equivalents. Most Kotlin expertise is Android-specific.' },
        ],
    },
    cs: {
        tagline: 'The architect who owns every room.',
        desc: 'One language. Four runtimes. A C# codebase can target a REST API on ASP.NET, a desktop and mobile app via MAUI, a browser application via Blazor WASM, and a real-time hub via SignalR — sharing the same models, the same chess engine, the same validation logic. No other language in this stack covers that surface alone.',
        strengths: [
            { text: 'Genuine full-stack: API, mobile, real-time, and browser from one language',
              detail: 'ZyxxyzShared contains the chess engine and DTOs. MAUI, Blazor, ASP.NET, and SignalR all reference it. One bug fix propagates to every surface. This is only possible because .NET runs on every target — JIT, WASM, and native.' },
            { text: 'LINQ provides the most expressive data pipeline syntax in the stack',
              detail: 'scores.Where(s => s.Game == game).OrderByDescending(s => s.Value).Take(20) is evaluated lazily and can be translated to SQL by EF Core without changing the application code. No other language in this stack has this at the language level.' },
            { text: 'async/await with CancellationToken threaded through every layer',
              detail: 'CancellationToken flows from the HTTP request down through every service and repository call. When a client disconnects, every pending I/O operation is cancelled automatically. This prevents resource leaks without manual cleanup code.' },
            { text: 'SignalR: best real-time abstraction in this stack',
              detail: 'SignalR negotiates WebSocket, Server-Sent Events, or long-polling automatically based on client capability. It can scale horizontally to Azure SignalR Service with a one-line configuration change — no code changes in the hub logic.' },
            { text: 'NativeAOT compiles to a Go-comparable single binary',
              detail: '.NET 8+ NativeAOT produces a self-contained native binary with sub-50 ms startup and ~20 MB memory footprint — comparable to Go. The trade-off is no runtime reflection and longer build times, which makes it best suited for CLI tools and high-throughput APIs.' },
        ],
        limits: [
            { text: 'MAUI has rough edges on macOS and iOS Catalyst targets',
              detail: 'MAUI on Windows is polished. On macOS Catalyst and iOS, renderer inconsistencies, missing platform controls, and slower release cycle compared to native SwiftUI mean that production iOS apps often need platform-specific workarounds.' },
            { text: 'Blazor WASM carries ~10 MB cold-load overhead for the mono runtime',
              detail: 'The first load downloads the mono WASM runtime plus all referenced assemblies. On a fast connection this is 3–5 seconds; on mobile or slow connections it is noticeable. Subsequent loads are cached. Server-side Blazor avoids this but requires a persistent SignalR connection.' },
            { text: 'More ceremony than Go for simple services',
              detail: 'A minimal ASP.NET Core API requires DI registration, middleware pipeline configuration, and controller scaffolding. A Go equivalent is 15 lines of net/http. For simple services, the .NET setup overhead is real — though it pays off at scale.' },
            { text: 'Historically fragmented (.NET Framework vs .NET Core legacy)',
              detail: 'Projects targeting .NET Framework 4.x cannot use modern .NET 8+ APIs. Libraries may maintain two code paths. The migration story is well-documented but the split created years of ecosystem confusion that legacy projects still carry.' },
            { text: 'DI and interface ceremony can feel heavy for small utilities',
              detail: 'Every service requires an interface, a registration in the DI container, and constructor injection. For a 50-line utility, this doubles the file count. Minimal API style (introduced in .NET 6) reduces this, but traditional project templates still default to the heavier pattern.' },
        ],
    },
    py: {
        tagline: 'The one who taught the machines.',
        desc: 'PyTorch. TensorFlow. Hugging Face Transformers. The entire machine learning field speaks Python first — not as a preference but as a structural fact. Python trades execution speed for expressive power, and that trade built the foundation of modern AI. Where ideas go before they become production.',
        strengths: [
            { text: 'ML training ecosystem: PyTorch, TensorFlow, scikit-learn, Hugging Face',
              detail: 'The dominant deep learning frameworks — PyTorch (Meta), TensorFlow (Google), JAX (Google) — are all Python-first. Hugging Face hosts 500,000+ pre-trained models, all with Python APIs. Training a neural network in any other language means giving up this ecosystem entirely.' },
            { text: 'Data toolchain: NumPy, pandas, Polars — vectorized over millions of rows',
              detail: 'NumPy operations execute in C under the hood. df.groupby("game").mean() in pandas processes millions of rows in milliseconds. Polars rewrites this with Rust internals for even faster performance. No other language in this stack has data manipulation this concise.' },
            { text: 'Fastest path from idea to working prototype in the stack',
              detail: 'No type annotations required, no compilation, no scaffolding. A working REST API with Flask is 12 lines. A chess engine that reads from stdin is 30. Python\'s interactive REPL (and Jupyter notebooks) lets you test ideas mid-execution.' },
            { text: 'Glue language: calls C, Rust, Java, and everything in between',
              detail: 'ctypes and cffi call any C/C++ library directly. PyO3 exposes Rust functions to Python with zero overhead. JPype bridges the JVM. This interoperability is why Python orchestrates systems written in every other language.' },
            { text: 'asyncio + FastAPI handle moderate API loads cleanly',
              detail: 'FastAPI uses Python type hints to auto-generate OpenAPI docs and validate request bodies. asyncio handles concurrent I/O without threads. Under uvicorn with multiple workers, a FastAPI service handles thousands of req/s — sufficient for most production APIs.' },
        ],
        limits: [
            { text: 'The GIL prevents true CPU-parallel execution in CPython',
              detail: 'The Global Interpreter Lock allows only one thread to execute Python bytecode at a time. For CPU-bound work, threading is effectively single-core. The workaround — multiprocessing — spawns separate processes with separate memory, adding serialization overhead.' },
            { text: 'No single-binary deployment — packaging remains friction',
              detail: 'PyInstaller, Nuitka, and Poetry produce distributable artifacts, but they are larger and more fragile than a Go or NativeAOT binary. Virtual environments, version conflicts, and platform-specific wheels make Python deployment more complex than any other language in this stack.' },
            { text: 'Type hints exist but are not enforced at runtime by default',
              detail: 'def add(a: int, b: int) -> int accepts strings at runtime unless you add a manual check. mypy and pyright provide static analysis, but they are opt-in tools, not the compiler. Production Python bugs often involve type mismatches that a statically typed language catches at build.' },
            { text: 'Raw speed is 10–100x slower than Go or C# for CPU-bound work',
              detail: 'CPython executes bytecode in a loop with no JIT. A tight algorithmic loop that takes 1 ms in Go may take 50–200 ms in Python. The chess AI in this project runs at depth 4 — the same depth would run 2–3 levels deeper in Go in the same wall-clock time.' },
            { text: 'Tkinter desktop is functional but visually dated',
              detail: 'Tkinter ships with CPython and requires no installation, but its default widget appearance is early-2000s. Custom styling is possible but labour-intensive. Modern Python desktop alternatives (PyQt6, wx, Dear PyGui) are more capable but add heavy dependencies.' },
        ],
    },
    jv: {
        tagline: 'The foundation everything else was built against.',
        desc: 'The JVM is one of the most optimized runtimes ever engineered — thirty years of profile-guided JIT refinement, adaptive deoptimization, and escape analysis. Java\'s verbosity enforces discipline. Enterprise systems run on it because it refuses to surprise you in production. Its successor language, Kotlin, stands on its shoulders.',
        strengths: [
            { text: 'JVM performance at sustained load — profile-guided JIT is formidable',
              detail: 'The JVM is slow at startup and fast at sustained throughput. After 30–60 seconds of warm-up, the JIT has profiled hot paths and compiled them to native code with inlining and escape analysis. Long-running Java services often outperform equivalent Go services at steady state.' },
            { text: 'Widest enterprise library coverage of any platform',
              detail: 'Apache Kafka clients, Elasticsearch, Hibernate ORM, gRPC, Apache Spark, Lucene, Flink — all are primary JVM citizens. The financial and telecom industries have decades of Java libraries that have no equivalent in any other ecosystem.' },
            { text: 'Virtual threads (Java 21) close the goroutine gap significantly',
              detail: 'Project Loom\'s virtual threads are scheduled by the JVM, not the OS. Blocking I/O on a virtual thread unmounts it from its carrier thread — exactly like Go goroutines. A Java 21 service can handle 100k concurrent connections without goroutine-style syntax.' },
            { text: 'Spring Boot: the dominant enterprise web framework on earth',
              detail: 'Spring Boot runs more production workloads than any other web framework. Auto-configuration, production-ready health endpoints, Spring Data JPA, Spring Security, Spring Cloud — a complete enterprise platform in a single dependency set.' },
            { text: 'GraalVM Native Image compiles Java to a sub-50 ms startup binary',
              detail: 'GraalVM AOT compilation produces a native binary that starts in under 50 ms and uses 50–100 MB of memory — suitable for serverless (AWS Lambda cold starts). The trade-off: no dynamic class loading, limited reflection, and longer build times.' },
        ],
        limits: [
            { text: 'Most verbose syntax in the stack — records help, but only partially',
              detail: 'A simple data class with 5 fields in Kotlin is 1 line (data class). In Java it is 30+ lines without records, or 5 lines with Java 16+ records. But records only cover the data-class case — service classes, builders, and callbacks remain verbose.' },
            { text: 'No compile-time null safety without switching to Kotlin',
              detail: 'Any object reference in Java can be null. There is no compiler enforcement. Optional<T> was added in Java 8 as a partial solution, but it is not used consistently and does not prevent NullPointerException — it merely makes null handling more explicit in method signatures.' },
            { text: 'JVM startup overhead without GraalVM Native Image',
              detail: 'A standard Spring Boot application starts in 3–8 seconds. A simple Kotlin/Java utility jar starts in 500 ms. Neither is suitable for CLI tools or Lambda functions without GraalVM Native Image, which adds significant build complexity.' },
            { text: 'Kotlin is strictly better for new JVM code — Java is a maintenance choice',
              detail: 'Null safety, coroutines, extension functions, data classes, sealed classes, and type inference all make Kotlin more productive than Java on the JVM with no performance penalty. Choosing Java for a new project means opting out of these gains without compensation.' },
            { text: 'ML and data science ecosystem dwarfed by Python',
              detail: 'Deeplearning4j and ND4J exist as Java ML frameworks, but they are 5–10 years behind PyTorch in capability, community, and documentation. Java is used for ML inference at scale (serving trained models) inside companies like Google, but training happens in Python.' },
        ],
    },
};

const USECASES = {
    js: ['Static site SPA — no framework', 'Event-driven EventBus architecture', 'sessionStorage identity (privacy)', 'ESLint + Stylelint CI linting', 'Firebase community client'],
    go: ['Collaborative text editing (OT)', 'Concurrent WebSocket sessions', 'Edge-deployed single binary', 'golangci-lint + bodyclose', 'HTTP middleware chain'],
    kt: ['Jetpack Compose Android UI', 'KMP shared chess engine', 'ViewModel + StateFlow MVVM', 'Coroutine AI dispatch', 'ktlint style enforcement'],
    cs: ['MAUI cross-platform chess app', 'ASP.NET Core REST API + JWT', 'SignalR real-time chat hub', 'Blazor WASM chess board', 'ZyxxyzShared library (engine + DTOs)'],
    py: ['Pure Python chess engine (shared)', 'Tkinter desktop chess app', 'Flask REST API (register / scores)', 'Adjacent: ML model prototyping', 'Adjacent: data analysis scripts'],
    jv: ['JavaFX desktop chess app', 'Android chess (custom Canvas View)', 'Shared engine JAR (Maven)', 'Adjacent: Spring Boot services', 'Adjacent: enterprise backends'],
};

/* ════════════════════════════════════════════════════════════
   TABS
════════════════════════════════════════════════════════════ */
function buildTabs() {
    const bar = document.getElementById('lcTabBar');

    Object.entries(LANGS).forEach(([key, lang]) => {
        const btn = document.createElement('button');
        btn.className = 'lc-tab lang-tab';
        btn.dataset.tab = key;
        btn.textContent = lang.label;
        btn.style.setProperty('--c', lang.color);
        bar.appendChild(btn);
    });

    bar.querySelectorAll('.lc-tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tabKey) {
    document.querySelectorAll('.lc-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabKey));
    document.querySelectorAll('.lc-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tabKey}`));
}

/* ════════════════════════════════════════════════════════════
   SULTRY SELECTOR (Overview)
════════════════════════════════════════════════════════════ */
function buildSelector(activeKeys, onToggle) {
    const list    = document.getElementById('selectorList');
    const clearBtn = document.getElementById('selClear');
    list.innerHTML = '';

    Object.entries(LANGS).forEach(([key, lang], i) => {
        if (i > 0) {
            const div = document.createElement('div');
            div.className = 'sel-divider';
            list.appendChild(div);
        }
        const item = document.createElement('div');
        item.className = 'sel-item';
        item.dataset.lang = key;
        item.style.setProperty('--c', lang.color);
        item.innerHTML = `
            <span class="sel-key">${key.toUpperCase()}</span>
            <span class="sel-name">${lang.label}</span>
            <span class="sel-role">${lang.role}</span>`;
        item.addEventListener('click', () => onToggle(key));
        list.appendChild(item);
    });

    clearBtn.addEventListener('click', () => {
        activeKeys.length = 0;
        syncSelector(activeKeys);
        onToggle(null);
    });
    syncSelector(activeKeys);
}

function syncSelector(activeKeys) {
    const clearBtn  = document.getElementById('selClear');
    const hasActive = activeKeys.length > 0;
    clearBtn.classList.toggle('visible', hasActive);
    document.querySelectorAll('.sel-item').forEach(item => {
        const key = item.dataset.lang;
        item.classList.toggle('active', activeKeys.includes(key));
        item.classList.toggle('dimmed', hasActive && !activeKeys.includes(key));
    });
}

/* ════════════════════════════════════════════════════════════
   RADAR
════════════════════════════════════════════════════════════ */
function drawRadar(canvas, activeKeys) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R  = Math.min(W, H) / 2 - 40;
    const n  = METRICS.length;
    ctx.clearRect(0, 0, W, H);

    const angle = i => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt    = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });

    [0.25, 0.5, 0.75, 1].forEach(t => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = pt(i, R * t);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${t === 1 ? 0.1 : 0.04})`;
        ctx.lineWidth = 1; ctx.stroke();
    });

    for (let i = 0; i < n; i++) {
        const end = pt(i, R);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();
        const lp = pt(i, R + 22);
        ctx.fillStyle = '#666680';
        ctx.font = '9px Courier New';
        ctx.textAlign    = lp.x > cx + 5 ? 'left' : lp.x < cx - 5 ? 'right' : 'center';
        ctx.textBaseline = lp.y < cy ? 'bottom' : 'top';
        ctx.fillText(METRICS[i].label, lp.x, lp.y);
    }

    const keys = activeKeys.length ? activeKeys : Object.keys(LANGS);
    keys.forEach(key => {
        const c = LANGS[key].color;
        ctx.beginPath();
        METRICS.forEach((m, i) => {
            const p = pt(i, (m.scores[key] / 10) * R);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle   = c + '1a'; ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth   = activeKeys.length === 1 ? 2.5 : 1.5;
        ctx.shadowColor = c;
        ctx.shadowBlur  = activeKeys.length ? 8 : 0;
        ctx.stroke();
        ctx.shadowBlur  = 0;
    });
}

function drawSoloRadar(canvas, key) {
    drawRadar(canvas, [key]);
}

/* ════════════════════════════════════════════════════════════
   METRIC BARS (Overview)
════════════════════════════════════════════════════════════ */
function renderBars(container) {
    container.innerHTML = METRICS.map(m => `
        <div class="metric-row">
            <div class="metric-label">${m.label}</div>
            <div class="metric-bars">
                ${Object.keys(LANGS).map(k => `
                    <div class="metric-bar-row" data-lang="${k}">
                        <span class="metric-lang-label">${k.toUpperCase()}</span>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill ${k}" data-score="${m.scores[k]}" style="width:0%"></div>
                        </div>
                        <span class="metric-score">${m.scores[k]}/10</span>
                    </div>`).join('')}
            </div>
        </div>`).join('');

    requestAnimationFrame(() => {
        document.querySelectorAll('.metric-bar-fill').forEach(el => {
            el.style.width = (el.dataset.score * 10) + '%';
        });
    });
}

function syncBars(activeKeys) {
    document.querySelectorAll('.metric-bar-row').forEach(row => {
        const dimmed = activeKeys.length > 0 && !activeKeys.includes(row.dataset.lang);
        row.style.opacity = dimmed ? '0.14' : '1';
    });
}

/* ════════════════════════════════════════════════════════════
   COMPARISON TABLE
════════════════════════════════════════════════════════════ */
function renderTable(activeCategory, activeKeys) {
    const tbody = document.getElementById('compareBody');
    const rows  = activeCategory === 'all'
        ? ROWS.flatMap(g => g.items)
        : (ROWS.find(g => g.category === activeCategory)?.items ?? []);
    const keys  = ['js','go','kt','cs','py','jv'];
    tbody.innerHTML = rows.map(row => `
        <tr>
            <td class="row-label">${row.label}</td>
            ${keys.map(k => `
                <td class="lh" style="opacity:${activeKeys.length && !activeKeys.includes(k) ? '0.18' : '1'}; transition:opacity .3s">
                    ${row[k] ?? '—'}
                </td>`).join('')}
        </tr>`).join('');
}

function renderFilterBar(active, activeKeys) {
    const bar  = document.getElementById('filterBar');
    const cats = ['all', ...ROWS.map(g => g.category)];
    bar.innerHTML = cats.map(c => `
        <button class="filter-btn${c === active ? ' active' : ''}" data-cat="${c}">
            ${c === 'all' ? 'All' : c}
        </button>`).join('');
    bar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.cat;
            renderTable(currentCategory, activeKeys);
            renderFilterBar(currentCategory, activeKeys);
        });
    });
}

/* ════════════════════════════════════════════════════════════
   LEGEND
════════════════════════════════════════════════════════════ */
function renderLegend(activeKeys) {
    const legend = document.getElementById('radarLegend');
    const keys   = activeKeys.length ? activeKeys : Object.keys(LANGS);
    legend.innerHTML = keys.map(k => `
        <div class="radar-legend-item active">
            <span class="radar-legend-dot" style="background:${LANGS[k].color}"></span>
            ${LANGS[k].label}
        </div>`).join('');
}

/* ════════════════════════════════════════════════════════════
   USE-CASE GRID
════════════════════════════════════════════════════════════ */
function renderUsecases(activeKeys) {
    const grid = document.getElementById('usecaseGrid');
    grid.innerHTML = Object.entries(USECASES).map(([k, items]) => {
        const dimmed = activeKeys.length > 0 && !activeKeys.includes(k);
        return `
            <div class="usecase-card${dimmed ? ' dimmed' : ''}" data-lang="${k}">
                <h4>
                    <span class="usecase-dot" style="background:${LANGS[k].color}"></span>
                    ${LANGS[k].label}
                </h4>
                <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>`;
    }).join('');
}

/* ════════════════════════════════════════════════════════════
   DECISION MATRIX
════════════════════════════════════════════════════════════ */
function matrixBadge(key, type) {
    if (!key) return '<span style="color:#383848">—</span>';
    const lang = LANGS[key];
    const bg   = type === 'best'   ? lang.color + '22'
               : type === 'runner' ? lang.color + '14'
               : 'rgba(244,67,54,0.12)';
    const fg   = type === 'avoid'  ? '#f06260' : lang.color;
    return `<span class="matrix-badge" style="background:${bg};color:${fg}">${lang.label}</span>`;
}

function renderMatrix() {
    const tbody = document.getElementById('matrixBody');
    tbody.innerHTML = MATRIX.map(row => `
        <tr>
            <td class="row-label">${row.problem}</td>
            <td class="lh">${matrixBadge(row.best, 'best')}</td>
            <td class="lh">${row.runner ? matrixBadge(row.runner, 'runner') : '<span style="color:#383848">—</span>'}</td>
            <td class="lh">${(row.avoid || []).map(k => matrixBadge(k, 'avoid')).join(' ') || '<span style="color:#383848">—</span>'}</td>
        </tr>`).join('');
}

/* ════════════════════════════════════════════════════════════
   SUMMARY STRIP
════════════════════════════════════════════════════════════ */
function renderSummary() {
    document.getElementById('summaryGrid').innerHTML = SUMMARY.map(s => {
        const lang = LANGS[s.key];
        return `
            <div class="summary-item" style="--c:${lang.color}">
                <span class="summary-lang">${lang.label}</span>
                <span class="summary-dash">—</span>
                <span class="summary-text">${s.text}</span>
            </div>`;
    }).join('');
}

/* ════════════════════════════════════════════════════════════
   TOOLTIP
════════════════════════════════════════════════════════════ */
let _tooltip = null;

function initTooltip() {
    _tooltip = document.createElement('div');
    _tooltip.className = 'lc-tooltip';
    _tooltip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(_tooltip);

    document.addEventListener('mousemove', e => {
        if (!_tooltip.classList.contains('tt-visible')) return;
        const x = Math.min(e.clientX + 18, window.innerWidth  - _tooltip.offsetWidth  - 12);
        const y = Math.min(e.clientY + 18, window.innerHeight - _tooltip.offsetHeight - 12);
        _tooltip.style.left = x + 'px';
        _tooltip.style.top  = y + 'px';
    });
}

function attachTooltips(root) {
    root.querySelectorAll('[data-tip]').forEach(el => {
        el.classList.add('has-tip');
        el.addEventListener('mouseenter', e => {
            _tooltip.innerHTML = `<div class="tt-label">${el.dataset.tipLabel || 'Detail'}</div>${el.dataset.tip}`;
            _tooltip.classList.add('tt-visible');
            const x = Math.min(e.clientX + 18, window.innerWidth  - 340);
            const y = Math.min(e.clientY + 18, window.innerHeight - 200);
            _tooltip.style.left = x + 'px';
            _tooltip.style.top  = y + 'px';
        });
        el.addEventListener('mouseleave', () => _tooltip.classList.remove('tt-visible'));
    });
}

/* ════════════════════════════════════════════════════════════
   LANGUAGE PROFILE PANELS
════════════════════════════════════════════════════════════ */
function slItem(item, type) {
    const text   = typeof item === 'string' ? item : item.text;
    const detail = typeof item === 'string' ? null : item.detail;
    const tipAttr = detail
        ? `data-tip="${detail.replace(/"/g, '&quot;')}" data-tip-label="${type === 'str' ? 'Strength' : 'Limit'}"`
        : '';
    return `<li ${tipAttr}>${text}</li>`;
}

function buildLangPanels() {
    const container = document.getElementById('langPanels');
    container.innerHTML = Object.entries(PROFILES).map(([key, p]) => {
        const lang = LANGS[key];

        const metricCards = METRICS.map(m => {
            const score = m.scores[key];
            return `
                <div class="lang-metric-card"
                     data-tip="Score: ${score}/10 — ${m.label}"
                     data-tip-label="${m.label}">
                    <div class="lang-metric-name">${m.label}</div>
                    <div class="lang-metric-bar-bg">
                        <div class="lang-metric-bar-fill lmf-${key}" data-score="${score}"
                             style="width:0%; background:linear-gradient(90deg,${lang.color}44,${lang.color})">
                        </div>
                    </div>
                    <div class="lang-metric-score" style="color:${lang.color}">${score}<span>&nbsp;/ 10</span></div>
                </div>`;
        }).join('');

        const relRows = MATRIX.filter(r =>
            r.best === key || r.runner === key || (r.avoid && r.avoid.includes(key))
        );
        const matRows = relRows.map(r => {
            const role = r.best === key   ? '<td class="mat-best lh">Best fit</td>'
                       : r.runner === key ? '<td class="mat-run lh">Runner-up</td>'
                       :                   '<td class="mat-avoid lh">Avoid</td>';
            const why  = r.best === key   ? 'Strongest match — no other language in this stack covers this domain as well.'
                       : r.runner === key ? 'A solid alternative when the best-fit language is already in use or unavailable.'
                       :                   'Better options exist — using this language here adds unnecessary trade-offs.';
            return `
                <tr>
                    <td class="row-label">${r.problem}</td>
                    ${role}
                    <td class="mat-none"
                        data-tip="${why}"
                        data-tip-label="${r.problem}">${why.split('—')[0].trim()}</td>
                </tr>`;
        }).join('');

        return `
            <div class="lc-panel" id="panel-${key}">
                <div class="lang-profile">

                    <div class="lang-profile-hero">
                        <div class="lang-profile-title-block">
                            <div class="lang-profile-role">${lang.role}</div>
                            <div class="lang-profile-name" style="--c:${lang.color}">${lang.label}</div>
                            <div class="lang-profile-tagline">"${p.tagline}"</div>
                            <p class="lang-profile-desc">${p.desc}</p>
                        </div>
                        <div class="lang-profile-radar">
                            <canvas class="solo-radar" data-lang="${key}" width="240" height="240"></canvas>
                        </div>
                    </div>

                    <h2 class="section-heading">Strengths &amp; Limits</h2>
                    <p class="section-sub">Hover any item for detail.</p>
                    <div class="lang-sl-grid">
                        <div class="lang-sl-col str-col">
                            <div class="lang-sl-title str">Strengths</div>
                            <ul>${p.strengths.map(s => slItem(s, 'str')).join('')}</ul>
                        </div>
                        <div class="lang-sl-col lim-col">
                            <div class="lang-sl-title lim">Limits</div>
                            <ul>${p.limits.map(l => slItem(l, 'lim')).join('')}</ul>
                        </div>
                    </div>

                    <div class="lang-metrics-section">
                        <h2 class="section-heading">Metric Scores</h2>
                        <p class="section-sub">Where ${lang.label} sits on each axis relative to 10. Hover for context.</p>
                        <div class="lang-metrics-grid">${metricCards}</div>
                    </div>

                    <div class="lang-matrix-section">
                        <h2 class="section-heading">Decision Relevance</h2>
                        <p class="section-sub">Every matrix row where ${lang.label} appears. Hover the why column for full rationale.</p>
                        <div class="table-wrap">
                            <table class="compare-table">
                                <thead><tr>
                                    <th>Problem</th>
                                    <th class="lh">Role</th>
                                    <th>Why</th>
                                </tr></thead>
                                <tbody>${matRows}</tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>`;
    }).join('');

    attachTooltips(container);
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
let activeKeys      = [];
let currentCategory = 'all';

(function init() {
    initTooltip();
    buildTabs();
    buildLangPanels();
    renderMatrix();
    renderSummary();

    const canvas = document.getElementById('radarChart');
    renderBars(document.getElementById('metricBars'));
    renderFilterBar('all', activeKeys);
    renderTable('all', activeKeys);
    renderUsecases(activeKeys);
    drawRadar(canvas, activeKeys);
    renderLegend(activeKeys);

    buildSelector(activeKeys, key => {
        if (key === null) {
            activeKeys = [];
        } else if (activeKeys.includes(key)) {
            activeKeys = activeKeys.filter(k => k !== key);
        } else {
            activeKeys = [...activeKeys, key];
        }
        syncSelector(activeKeys);
        syncBars(activeKeys);
        drawRadar(canvas, activeKeys);
        renderLegend(activeKeys);
        renderTable(currentCategory, activeKeys);
        renderUsecases(activeKeys);
    });

    const ro = new ResizeObserver(() => drawRadar(canvas, activeKeys));
    ro.observe(canvas.parentElement);

    // Animate solo radar + metric bars when a lang panel becomes active
    document.querySelectorAll('.lc-tab.lang-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const key    = tab.dataset.tab;
            const panel  = document.getElementById(`panel-${key}`);
            const soloC  = panel?.querySelector('.solo-radar');
            if (soloC) {
                requestAnimationFrame(() => drawSoloRadar(soloC, key));
            }
            panel?.querySelectorAll('[data-score]').forEach(el => {
                if (el.classList.contains('lang-metric-bar-fill') || el.className.includes('lmf-')) {
                    el.style.width = (el.dataset.score * 10) + '%';
                }
            });
        });
    });
})();
