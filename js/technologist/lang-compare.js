'use strict';

const LANGS = {
    js: { label: 'JavaScript', color: '#f7df1e', role: 'Frontend · CI scripts' },
    go: { label: 'Go',         color: '#00acd7', role: 'Editor-service backend' },
    kt: { label: 'Kotlin',     color: '#a07fff', role: 'Android · KMP engine' },
    cs: { label: 'C#',         color: '#c07fe0', role: 'MAUI · API · SignalR · Blazor' },
};

const METRICS = [
    { key: 'cpu',       label: 'CPU Performance',  scores: { js: 4, go: 9, kt: 7, cs: 8 } },
    { key: 'io',        label: 'I/O Concurrency',  scores: { js: 8, go: 10, kt: 8, cs: 9 } },
    { key: 'safety',    label: 'Type Safety',       scores: { js: 2, go: 7, kt: 10, cs: 8 } },
    { key: 'ecosystem', label: 'Ecosystem Size',    scores: { js: 10, go: 6, kt: 7, cs: 8 } },
    { key: 'xplat',     label: 'Cross-platform',   scores: { js: 9, go: 7, kt: 8, cs: 9 } },
    { key: 'learn',     label: 'Ease of Learning',  scores: { js: 8, go: 8, kt: 6, cs: 5 } },
];

const ROWS = [
    {
        category: 'Core',
        items: [
            { label: 'Paradigm',      js: 'multi-paradigm',   go: 'procedural',        kt: 'multi-paradigm',   cs: 'multi-paradigm'   },
            { label: 'Type system',   js: pill('dynamic','orange'), go: pill('static','green'), kt: pill('static','green'), cs: pill('static','green') },
            { label: 'Null safety',   js: pill('none','red'),  go: pill('zero values','blue'), kt: pill('enforced','green'), cs: pill('opt-in','yellow') },
            { label: 'Compilation',   js: 'JIT / interpreted', go: 'AOT native',        kt: 'JVM bytecode / KMP native', cs: 'JIT CLR / WASM' },
        ]
    },
    {
        category: 'Concurrency',
        items: [
            { label: 'Model',         js: 'Event loop',        go: 'Goroutines + channels', kt: 'Coroutines',     cs: 'async/await + TPL' },
            { label: 'Async syntax',  js: 'async/await',       go: 'go func()',         kt: 'suspend fun',      cs: 'async Task'       },
            { label: 'Backpressure',  js: 'manual',            go: 'channel buffer',    kt: 'Flow operators',   cs: 'Channel<T>'       },
            { label: 'CPU parallelism', js: pill('none','red'), go: pill('native','green'), kt: pill('JVM threads','blue'), cs: pill('ThreadPool','blue') },
        ]
    },
    {
        category: 'Performance',
        items: [
            { label: 'Startup time',  js: pill('fast','green'), go: pill('instant','green'), kt: pill('JVM slow','orange'), cs: pill('medium','yellow') },
            { label: 'Memory use',    js: 'medium',             go: pill('low','green'),  kt: pill('high (JVM)','orange'), cs: 'medium'            },
            { label: 'GC pauses',     js: 'V8 generational',    go: 'tricolor concurrent', kt: 'JVM G1/ZGC',    cs: '.NET generational' },
        ]
    },
    {
        category: 'Ecosystem',
        items: [
            { label: 'Package mgr',   js: 'npm / yarn',         go: 'go mod',            kt: 'Gradle / Maven',   cs: 'NuGet'            },
            { label: 'Test framework', js: 'Jest / Vitest',     go: 'testing (stdlib)',  kt: 'JUnit 5 / Kotest', cs: 'xUnit / NUnit'    },
            { label: 'Linter',        js: 'ESLint',             go: 'golangci-lint',     kt: 'ktlint / Detekt',  cs: 'Roslyn analyzers' },
        ]
    },
];

function pill(text, color) {
    return `<span class="pill pill-${color}">${text}</span>`;
}

/* ── Radar chart (SVG-style on Canvas) ── */
function drawRadar(canvas, activeKeys) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 36;
    const n = METRICS.length;
    ctx.clearRect(0, 0, W, H);

    const angle = i => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt = (i, r) => ({
        x: cx + r * Math.cos(angle(i)),
        y: cy + r * Math.sin(angle(i)),
    });

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(t => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = pt(i, R * t);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${t === 1 ? 0.12 : 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Spokes + labels
    for (let i = 0; i < n; i++) {
        const end = pt(i, R);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();

        const lp = pt(i, R + 20);
        ctx.fillStyle = '#666';
        ctx.font = '10px Courier New';
        ctx.textAlign = lp.x > cx + 4 ? 'left' : lp.x < cx - 4 ? 'right' : 'center';
        ctx.textBaseline = lp.y < cy ? 'bottom' : 'top';
        ctx.fillText(METRICS[i].label.split(' ')[0], lp.x, lp.y);
    }

    // Language polygons
    const keys = activeKeys.length ? activeKeys : Object.keys(LANGS);
    keys.forEach(key => {
        const lang = LANGS[key];
        ctx.beginPath();
        METRICS.forEach((m, i) => {
            const r = (m.scores[key] / 10) * R;
            const p = pt(i, r);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = lang.color + '22';
        ctx.fill();
        ctx.strokeStyle = lang.color;
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

/* ── Metric bars ── */
function renderBars(container) {
    container.innerHTML = METRICS.map(m => `
        <div class="metric-row" data-metric="${m.key}">
            <div class="metric-header">
                <span class="metric-label">${m.label}</span>
            </div>
            <div class="metric-bars">
                ${Object.keys(LANGS).map(k => `
                    <div class="metric-bar-row">
                        <span class="metric-lang-label">${k.toUpperCase()}</span>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill ${k}" data-lang="${k}" data-metric="${m.key}" style="width:0%"></div>
                        </div>
                        <span class="metric-value" style="width:28px;text-align:right;font-size:.7em;color:#666;font-family:monospace">${m.scores[k]}/10</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        document.querySelectorAll('.metric-bar-fill').forEach(el => {
            const lang = el.dataset.lang, metric = el.dataset.metric;
            const m = METRICS.find(x => x.key === metric);
            if (m) el.style.width = (m.scores[lang] * 10) + '%';
        });
    });
}

/* ── Comparison table ── */
function renderTable(activeCategory) {
    const tbody = document.getElementById('compareBody');
    const rows = activeCategory === 'all'
        ? ROWS.flatMap(g => g.items)
        : (ROWS.find(g => g.category === activeCategory)?.items ?? []);

    tbody.innerHTML = rows.map(row => `
        <tr>
            <td class="row-label">${row.label}</td>
            ${['js','go','kt','cs'].map(k => `<td class="lang-col">${row[k] ?? '—'}</td>`).join('')}
        </tr>
    `).join('');
}

function renderFilterBar(active) {
    const bar = document.getElementById('filterBar');
    const categories = ['all', ...ROWS.map(g => g.category)];
    bar.innerHTML = categories.map(c => `
        <button class="filter-btn${c === active ? ' active' : ''}" data-cat="${c}">
            ${c === 'all' ? 'All' : c}
        </button>
    `).join('');
    bar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            renderTable(btn.dataset.cat);
            renderFilterBar(btn.dataset.cat);
        });
    });
}

/* ── Use-case cards ── */
function renderUsecases() {
    const grid = document.getElementById('usecaseGrid');
    const cases = {
        js: ['Static site SPA (no framework)', 'Event-driven architecture', 'ESLint + Stylelint CI linting', 'sessionStorage identity model', 'Firebase community client'],
        go: ['Collaborative text editing (OT)', 'Concurrent WebSocket sessions', 'Edge-deployed binary', 'golangci-lint static analysis', 'HTTP handler middleware'],
        kt: ['Android Jetpack Compose UI', 'KMP shared chess engine', 'ViewModel + StateFlow MVVM', 'Coroutine-based AI dispatch', 'ktlint style enforcement'],
        cs: ['MAUI cross-platform chess app', 'ASP.NET Core Web API + JWT', 'SignalR real-time chat server', 'Blazor WASM chess board', 'ZyxxyzShared library (engine + models)'],
    };
    grid.innerHTML = Object.entries(cases).map(([k, items]) => `
        <div class="usecase-card">
            <h4>
                <span class="usecase-dot" style="background:${LANGS[k].color}"></span>
                ${LANGS[k].label}
            </h4>
            <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
    `).join('');
}

/* ── Radar legend ── */
function renderLegend(activeKeys) {
    const legend = document.getElementById('radarLegend');
    const keys = activeKeys.length ? activeKeys : Object.keys(LANGS);
    legend.innerHTML = keys.map(k => `
        <div class="radar-legend-item">
            <span class="radar-legend-dot" style="background:${LANGS[k].color}"></span>
            ${LANGS[k].label}
        </div>
    `).join('');
}

/* ── Init ── */
(function init() {
    const canvas = document.getElementById('radarChart');
    const barsEl = document.getElementById('metricBars');
    let activeKeys = [];

    renderBars(barsEl);
    renderFilterBar('all');
    renderTable('all');
    renderUsecases();
    drawRadar(canvas, activeKeys);
    renderLegend(activeKeys);

    // Lang card toggle
    document.getElementById('langCards').addEventListener('click', e => {
        const card = e.target.closest('.lang-card');
        if (!card) return;
        const key = card.dataset.lang;
        card.classList.toggle('active');
        activeKeys = activeKeys.includes(key)
            ? activeKeys.filter(k => k !== key)
            : [...activeKeys, key];
        drawRadar(canvas, activeKeys);
        renderLegend(activeKeys);

        // Dim/highlight metric bars
        document.querySelectorAll('.metric-bar-row').forEach(row => {
            const fill = row.querySelector('.metric-bar-fill');
            if (!fill) return;
            row.style.opacity = (!activeKeys.length || activeKeys.includes(fill.dataset.lang)) ? '1' : '0.25';
        });
    });

    // Redraw radar on resize
    const ro = new ResizeObserver(() => drawRadar(canvas, activeKeys));
    ro.observe(canvas.parentElement);
})();
