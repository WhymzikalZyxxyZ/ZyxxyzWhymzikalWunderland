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
            'Zero deployment friction — a script tag is enough',
            'Async I/O via the event loop handles thousands of idle connections',
            'npm: the largest package registry on earth',
            'Runs client-side and server-side from a single codebase',
            'Prototype, ship, and iterate faster than any compiled language',
        ],
        limits: [
            'Single-threaded — CPU-bound work blocks the event loop',
            'No compile-time type safety without TypeScript',
            'Runtime errors where other languages fail at build',
            'undefined and null coexist as separate concepts',
            'Module system fragmentation (CJS vs ESM) still causes friction',
        ],
    },
    go: {
        tagline: 'Lean, precise, and never wastes a word.',
        desc: 'A single static binary. No runtime dependency, no installation, no surprise. Goroutines cost 2 KB each — spawn a hundred thousand of them and the scheduler multiplexes them across CPU cores without complaint. Go\'s discipline is its seduction: everything unnecessary has been removed.',
        strengths: [
            '100k+ goroutines with trivial syntax: go func()',
            'Single static binary — deploy to any Linux/Mac/Windows without a runtime',
            'Sub-second full recompilation on large codebases',
            'Minimal memory footprint per service',
            'Channels make concurrent communication explicit, not accidental',
        ],
        limits: [
            'No first-class GUI or mobile framework',
            'if err != nil repeated at every call site — verbose by design',
            'Generics arrived in 1.18; ecosystem adoption is still catching up',
            'No dependency injection; wiring is entirely manual',
            'Less expressive than Kotlin or C# for data transformation',
        ],
    },
    kt: {
        tagline: 'Modern. Uncompromising. Null-safe.',
        desc: 'Built on the JVM but unwilling to inherit its sins. Null safety is not a lint warning — it is enforced at compile time. A variable is either non-null or explicitly declared nullable; there is no other option. Android\'s officially preferred language, and the only one with first-class iOS code sharing via Kotlin Multiplatform.',
        strengths: [
            'Null safety enforced at compile time — String vs String?',
            'KMP compiles shared logic to Android, iOS, JVM, and JS',
            'Coroutines with structured concurrency prevent resource leaks',
            'Jetpack Compose: declarative, testable, concise Android UI',
            'Full interoperability with every Java library ever written',
        ],
        limits: [
            'JVM startup time and memory overhead vs native languages',
            'Gradle build times are significantly longer than Go or .NET',
            'KMP iOS target requires macOS and Xcode to compile',
            'Coroutine stack traces are difficult to read in production',
            'Smaller community than Java or Python for non-Android work',
        ],
    },
    cs: {
        tagline: 'The architect who owns every room.',
        desc: 'One language. Four runtimes. A C# codebase can target a REST API on ASP.NET, a desktop and mobile app via MAUI, a browser application via Blazor WASM, and a real-time hub via SignalR — sharing the same models, the same chess engine, the same validation logic. No other language in this stack covers that surface alone.',
        strengths: [
            'Genuine full-stack: API, mobile, real-time, and browser from one language',
            'LINQ provides the most expressive data pipeline syntax in the stack',
            'async/await with CancellationToken threaded through every layer',
            'SignalR: best real-time abstraction in this stack',
            'NativeAOT compiles to a Go-comparable single binary',
        ],
        limits: [
            'MAUI has rough edges on macOS and iOS Catalyst targets',
            'Blazor WASM carries ~10 MB cold-load overhead for the mono runtime',
            'More ceremony than Go for simple services',
            'Historically fragmented (.NET Framework vs .NET Core legacy)',
            'DI and interface ceremony can feel heavy for small utilities',
        ],
    },
    py: {
        tagline: 'The one who taught the machines.',
        desc: 'PyTorch. TensorFlow. Hugging Face Transformers. The entire machine learning field speaks Python first — not as a preference but as a structural fact. Python trades execution speed for expressive power, and that trade built the foundation of modern AI. Where ideas go before they become production.',
        strengths: [
            'ML training ecosystem: PyTorch, TensorFlow, scikit-learn, Hugging Face',
            'Data toolchain: NumPy, pandas, Polars — vectorized over millions of rows',
            'Fastest path from idea to working prototype in the stack',
            'Glue language: calls C, Rust, Java, and everything in between',
            'asyncio + FastAPI handle moderate API loads cleanly',
        ],
        limits: [
            'The GIL prevents true CPU-parallel execution in CPython',
            'No single-binary deployment — packaging remains friction',
            'Type hints exist but are not enforced at runtime by default',
            'Raw speed is 10–100x slower than Go or C# for CPU-bound work',
            'Tkinter desktop is functional but visually dated',
        ],
    },
    jv: {
        tagline: 'The foundation everything else was built against.',
        desc: 'The JVM is one of the most optimized runtimes ever engineered — thirty years of profile-guided JIT refinement, adaptive deoptimization, and escape analysis. Java\'s verbosity enforces discipline. Enterprise systems run on it because it refuses to surprise you in production. Its successor language, Kotlin, stands on its shoulders.',
        strengths: [
            'JVM performance at sustained load — profile-guided JIT is formidable',
            'Widest enterprise library coverage of any platform',
            'Virtual threads (Java 21) close the goroutine gap significantly',
            'Spring Boot: the dominant enterprise web framework on earth',
            'GraalVM Native Image compiles Java to a sub-50 ms startup binary',
        ],
        limits: [
            'Most verbose syntax in the stack — records help, but only partially',
            'No compile-time null safety without switching to Kotlin',
            'JVM startup overhead without GraalVM Native Image',
            'Kotlin is strictly better for new JVM code — Java is a maintenance choice',
            'ML and data science ecosystem dwarfed by Python',
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
   LANGUAGE PROFILE PANELS
════════════════════════════════════════════════════════════ */
function buildLangPanels() {
    const container = document.getElementById('langPanels');
    container.innerHTML = Object.entries(PROFILES).map(([key, p]) => {
        const lang = LANGS[key];

        // Metric cards for this language
        const metricCards = METRICS.map(m => {
            const score = m.scores[key];
            return `
                <div class="lang-metric-card">
                    <div class="lang-metric-name">${m.label}</div>
                    <div class="lang-metric-bar-bg">
                        <div class="lang-metric-bar-fill lmf-${key}"
                             data-score="${score}"
                             style="width:0%; background: linear-gradient(90deg, ${lang.color}44, ${lang.color})">
                        </div>
                    </div>
                    <div class="lang-metric-score" style="color:${lang.color}">${score}<span>&nbsp;/ 10</span></div>
                </div>`;
        }).join('');

        // Decision matrix rows relevant to this language
        const relRows = MATRIX.filter(r =>
            r.best === key || r.runner === key || (r.avoid && r.avoid.includes(key))
        );
        const matRows = relRows.map(r => {
            const role = r.best === key   ? '<td class="mat-best lh">Best fit</td>'
                       : r.runner === key ? '<td class="mat-run lh">Runner-up</td>'
                       :                   '<td class="mat-avoid lh">Avoid</td>';
            const why  = r.best === key   ? 'Strongest match for this domain'
                       : r.runner === key ? 'Solid alternative'
                       :                   'Better options exist';
            return `
                <tr>
                    <td class="row-label">${r.problem}</td>
                    ${role}
                    <td class="mat-none">${why}</td>
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
                    <div class="lang-sl-grid">
                        <div class="lang-sl-col str-col">
                            <div class="lang-sl-title str">Strengths</div>
                            <ul>${p.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                        </div>
                        <div class="lang-sl-col lim-col">
                            <div class="lang-sl-title lim">Limits</div>
                            <ul>${p.limits.map(l => `<li>${l}</li>`).join('')}</ul>
                        </div>
                    </div>

                    <div class="lang-metrics-section">
                        <h2 class="section-heading">Metric Scores</h2>
                        <p class="section-sub">Where ${lang.label} sits on each axis relative to 10.</p>
                        <div class="lang-metrics-grid">${metricCards}</div>
                    </div>

                    <div class="lang-matrix-section">
                        <h2 class="section-heading">Decision Relevance</h2>
                        <p class="section-sub">Every matrix row where ${lang.label} appears.</p>
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
}

function animateSoloMetrics(panelEl) {
    panelEl.querySelectorAll('.lmf-' + panelEl.querySelector('[data-lang]')?.dataset?.lang).forEach(el => {
        el.style.width = (el.dataset.score * 10) + '%';
    });
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
let activeKeys      = [];
let currentCategory = 'all';

(function init() {
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
