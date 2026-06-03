'use strict';

const LANGS = {
    js: { label: 'JavaScript', color: '#f7df1e', role: 'Frontend · CI scripts',          cssVar: '--js' },
    go: { label: 'Go',         color: '#00acd7', role: 'Editor-service backend',          cssVar: '--go' },
    kt: { label: 'Kotlin',     color: '#a07fff', role: 'Android · KMP shared engine',     cssVar: '--kt' },
    cs: { label: 'C#',         color: '#c07fe0', role: 'MAUI · API · SignalR · Blazor',   cssVar: '--cs' },
    py: { label: 'Python',     color: '#4b8bbe', role: 'Scripting · Data · ML adjacency', cssVar: '--py' },
    jv: { label: 'Java',       color: '#e76f00', role: 'JVM foundation · Android legacy', cssVar: '--jv' },
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
            cs: pill('static','green'),  py: pill('dynamic','orange'), jv: pill('static','green') },
        { label: 'Null safety',
            js: pill('none','red'), go: pill('zero values','blue'), kt: pill('enforced','green'),
            cs: pill('opt-in','yellow'), py: pill('none','red'), jv: pill('none','red') },
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
            cs: 'medium', py: 'medium', jv: pill('high (JVM)','orange') },
        { label: 'GC',
            js: 'V8 generational', go: 'tricolor concurrent', kt: 'JVM G1/ZGC',
            cs: '.NET generational', py: 'reference counting + cyclic', jv: 'G1/ZGC/Shenandoah' },
    ]},
    { category: 'Ecosystem', items: [
        { label: 'Package mgr',
            js: 'npm', go: 'go mod', kt: 'Gradle', cs: 'NuGet', py: 'pip / Poetry', jv: 'Maven / Gradle' },
        { label: 'Test framework',
            js: 'Jest', go: 'testing (stdlib)', kt: 'JUnit / Kotest', cs: 'xUnit', py: 'pytest', jv: 'JUnit 5' },
        { label: 'Linter',
            js: 'ESLint', go: 'golangci-lint', kt: 'ktlint', cs: 'Roslyn analyzers', py: 'Ruff / flake8', jv: 'Checkstyle / PMD' },
    ]},
];

/* ════════════════════════════════
   SULTRY SELECTOR
════════════════════════════════ */
function buildSelector(activeKeys, onToggle) {
    const list = document.getElementById('selectorList');
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
            <span class="sel-role">${lang.role}</span>
        `;

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
    const clearBtn = document.getElementById('selClear');
    const hasActive = activeKeys.length > 0;
    clearBtn.classList.toggle('visible', hasActive);

    document.querySelectorAll('.sel-item').forEach(item => {
        const key = item.dataset.lang;
        const isActive = activeKeys.includes(key);
        const isDimmed = hasActive && !isActive;
        item.classList.toggle('active', isActive);
        item.classList.toggle('dimmed', isDimmed);
    });
}

/* ════════════════════════════════
   RADAR CHART
════════════════════════════════ */
function drawRadar(canvas, activeKeys) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 40;
    const n = METRICS.length;
    ctx.clearRect(0, 0, W, H);

    const angle = i => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt = (i, r) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });

    // Grid rings
    [0.25, 0.5, 0.75, 1].forEach(t => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = pt(i, R * t);
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${t === 1 ? 0.1 : 0.04})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Spokes + labels
    for (let i = 0; i < n; i++) {
        const end = pt(i, R);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.stroke();

        const lp = pt(i, R + 22);
        ctx.fillStyle = '#4a4a5a';
        ctx.font = '9px Courier New';
        ctx.textAlign = lp.x > cx + 5 ? 'left' : lp.x < cx - 5 ? 'right' : 'center';
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
        ctx.fillStyle = c + '1a';
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = activeKeys.length === 1 ? 2.5 : 1.5;
        ctx.shadowColor = c;
        ctx.shadowBlur = activeKeys.length ? 8 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

/* ════════════════════════════════
   METRIC BARS
════════════════════════════════ */
function renderBars(container) {
    container.innerHTML = METRICS.map(m => `
        <div class="metric-row">
            <div class="metric-label">${m.label}</div>
            <div class="metric-bars">
                ${Object.keys(LANGS).map(k => `
                    <div class="metric-bar-row" data-lang="${k}">
                        <span class="metric-lang-label">${k.toUpperCase()}</span>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill ${k}" data-lang="${k}" data-score="${m.scores[k]}" style="width:0%"></div>
                        </div>
                        <span class="metric-score">${m.scores[k]}/10</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        document.querySelectorAll('.metric-bar-fill').forEach(el => {
            el.style.width = (el.dataset.score * 10) + '%';
        });
    });
}

function syncBars(activeKeys) {
    document.querySelectorAll('.metric-bar-row').forEach(row => {
        const key = row.dataset.lang;
        const dimmed = activeKeys.length > 0 && !activeKeys.includes(key);
        row.style.opacity = dimmed ? '0.15' : '1';
    });
}

/* ════════════════════════════════
   TABLE
════════════════════════════════ */
function renderTable(activeCategory, activeKeys) {
    const tbody = document.getElementById('compareBody');
    const rows = activeCategory === 'all'
        ? ROWS.flatMap(g => g.items)
        : (ROWS.find(g => g.category === activeCategory)?.items ?? []);

    const keys = ['js','go','kt','cs','py','jv'];
    tbody.innerHTML = rows.map(row => `
        <tr>
            <td class="row-label">${row.label}</td>
            ${keys.map(k => `
                <td class="lh" style="opacity:${activeKeys.length && !activeKeys.includes(k) ? '0.2' : '1'}; transition:opacity .3s">
                    ${row[k] ?? '—'}
                </td>
            `).join('')}
        </tr>
    `).join('');
}

function renderFilterBar(active, activeKeys) {
    const bar = document.getElementById('filterBar');
    const cats = ['all', ...ROWS.map(g => g.category)];
    bar.innerHTML = cats.map(c => `
        <button class="filter-btn${c === active ? ' active' : ''}" data-cat="${c}">
            ${c === 'all' ? 'All' : c}
        </button>
    `).join('');
    bar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = btn.dataset.cat;
            renderTable(currentCategory, activeKeys);
            renderFilterBar(currentCategory, activeKeys);
        });
    });
}

/* ════════════════════════════════
   LEGEND
════════════════════════════════ */
function renderLegend(activeKeys) {
    const legend = document.getElementById('radarLegend');
    const keys = activeKeys.length ? activeKeys : Object.keys(LANGS);
    legend.innerHTML = keys.map(k => `
        <div class="radar-legend-item active">
            <span class="radar-legend-dot" style="background:${LANGS[k].color}"></span>
            ${LANGS[k].label}
        </div>
    `).join('');
}

/* ════════════════════════════════
   USE CASES
════════════════════════════════ */
function renderUsecases(activeKeys) {
    const grid = document.getElementById('usecaseGrid');
    const cases = {
        js: ['Static site SPA — no framework', 'Event-driven EventBus architecture', 'sessionStorage identity (privacy)', 'ESLint + Stylelint CI linting', 'Firebase community client'],
        go: ['Collaborative text editing (OT)', 'Concurrent WebSocket sessions', 'Edge-deployed single binary', 'golangci-lint + bodyclose analysis', 'HTTP middleware chain'],
        kt: ['Jetpack Compose Android UI', 'KMP shared chess engine', 'ViewModel + StateFlow MVVM', 'Coroutine AI dispatch', 'ktlint style enforcement'],
        cs: ['MAUI cross-platform chess app', 'ASP.NET Core REST API + JWT', 'SignalR real-time chat hub', 'Blazor WASM chess board', 'ZyxxyzShared library (engine + DTOs)'],
        py: ['Not directly used in this project', 'Adjacent: data analysis scripts', 'Adjacent: ML model prototyping', 'Adjacent: automation tooling', 'Adjacent: Flask / FastAPI APIs'],
        jv: ['JVM foundation for Kotlin', 'Not directly used in this project', 'Adjacent: Spring Boot services', 'Adjacent: Android legacy compat', 'Adjacent: enterprise backends'],
    };
    grid.innerHTML = Object.entries(cases).map(([k, items]) => {
        const dimmed = activeKeys.length > 0 && !activeKeys.includes(k);
        return `
            <div class="usecase-card${dimmed ? ' dimmed' : ''}" data-lang="${k}">
                <h4>
                    <span class="usecase-dot" style="background:${LANGS[k].color}"></span>
                    ${LANGS[k].label}
                </h4>
                <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
            </div>
        `;
    }).join('');
}

/* ════════════════════════════════
   INIT
════════════════════════════════ */
let activeKeys = [];
let currentCategory = 'all';

(function init() {
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
})();
