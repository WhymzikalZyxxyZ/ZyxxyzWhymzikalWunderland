'use strict';

const GW = 'https://api.zyxwonderland.xyz';

// ── Tabs ──────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
const chart = document.getElementById('chart');
const ctx   = chart?.getContext('2d');

function drawChart(timeseries) {
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = chart.offsetWidth || 900;
    const H   = 90;
    chart.width  = W * dpr;
    chart.height = H * dpr;
    ctx.scale(dpr, dpr);

    if (!timeseries.length) {
        ctx.fillStyle = '#333';
        ctx.font = '11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('No data yet — send some requests via the Test Console.', W / 2, H / 2);
        return;
    }

    const now    = Date.now();
    const slots  = 24;
    const slotMs = 3600_000;
    const nowBucket = Math.floor(now / slotMs);
    const buckets = Array.from({ length: slots }, (_, i) => nowBucket - (slots - 1 - i));

    const byBucket = {};
    for (const row of timeseries) byBucket[row.bucket] = { total: row.total, errors: row.errors };

    const maxTotal = Math.max(1, ...buckets.map(b => byBucket[b]?.total ?? 0));
    const barW = (W - 2) / slots;
    const pad  = 2;

    buckets.forEach((bucket, i) => {
        const d     = byBucket[bucket] ?? { total: 0, errors: 0 };
        const x     = i * barW;
        const hTotal = Math.max(1, Math.floor((d.total / maxTotal) * (H - 20)));
        const hErr  = d.total > 0 ? Math.floor((d.errors / d.total) * hTotal) : 0;

        if (d.total > 0) {
            ctx.fillStyle = 'rgba(100,180,255,0.35)';
            ctx.fillRect(x + pad, H - 16 - hTotal, barW - pad * 2, hTotal);
        }
        if (hErr > 0) {
            ctx.fillStyle = 'rgba(239,83,80,0.55)';
            ctx.fillRect(x + pad, H - 16 - hErr, barW - pad * 2, hErr);
        }
    });

    // Hour labels every 6h
    ctx.fillStyle = '#333';
    ctx.font      = '9px Courier New';
    ctx.textAlign = 'center';
    buckets.forEach((bucket, i) => {
        if (i % 6 === 0 || i === slots - 1) {
            const h = new Date(bucket * slotMs).getUTCHours();
            ctx.fillText(`${String(h).padStart(2, '0')}:00`, i * barW + barW / 2, H - 2);
        }
    });
}

function statusBadge(status) {
    if (status >= 500) return `<span class="badge badge-err">${status}</span>`;
    if (status >= 400) return `<span class="badge badge-4xx">${status}</span>`;
    return `<span class="badge badge-ok">${status}</span>`;
}

function keyBadge(keyId) {
    return keyId
        ? `<span class="badge badge-key">${keyId.slice(0, 14)}</span>`
        : `<span class="badge badge-anon">anon</span>`;
}

function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

async function loadDashboard() {
    const note = document.getElementById('refresh-note');
    if (note) note.textContent = 'Loading…';

    try {
        const [summary, timeseries, recent] = await Promise.all([
            fetch(`${GW}/analytics/summary`).then(r => r.json()),
            fetch(`${GW}/analytics/timeseries?hours=24`).then(r => r.json()),
            fetch(`${GW}/analytics/recent?n=20`).then(r => r.json()),
        ]);

        document.getElementById('s-total').textContent   = summary.total.toLocaleString();
        document.getElementById('s-errrate').textContent = summary.error_rate + '%';
        document.getElementById('s-latency').textContent = summary.avg_latency + 'ms';
        document.getElementById('s-keys').textContent    = summary.key_count;

        drawChart(timeseries);

        const pathTbody = document.getElementById('tbl-paths');
        pathTbody.innerHTML = (summary.top_paths ?? []).map(p =>
            `<tr><td>${p.path}</td><td>${p.hits}</td></tr>`
        ).join('') || '<tr><td colspan="2" style="color:#333">No data yet</td></tr>';

        const recentTbody = document.getElementById('tbl-recent');
        recentTbody.innerHTML = recent.map(r =>
            `<tr>
                <td class="method m-${r.method.toLowerCase()}">${r.method}</td>
                <td>${r.path}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${r.latency_ms}</td>
            </tr>`
        ).join('') || '<tr><td colspan="4" style="color:#333">No requests yet</td></tr>';

        if (note) note.textContent = `Last updated ${new Date().toLocaleTimeString()} · auto-refreshes every 30s`;
    } catch {
        if (note) note.textContent = 'Could not reach API — is the gateway deployed?';
    }
}

loadDashboard();
setInterval(loadDashboard, 30_000);

// ── Test Console ──────────────────────────────────────────────────────────────
const logEl    = document.getElementById('test-log');
const resMeta  = document.getElementById('res-meta');
const resBody  = document.getElementById('res-body');
let   logFirst = true;

function appendLog(cls, text) {
    if (logFirst) { logEl.innerHTML = ''; logFirst = false; }
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
}

async function fireRequest() {
    const method = document.getElementById('c-method').value;
    const path   = document.getElementById('c-path').value.trim() || '/api/hello';
    const key    = document.getElementById('c-key').value.trim();
    const body   = document.getElementById('c-body').value.trim();

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['X-API-Key'] = key;

    const opts = { method, headers };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = body;

    const url = `${GW}${path}`;
    appendLog('log-dim', `→ ${method} ${path}${key ? ' [keyed]' : ' [anon]'}`);

    const start = Date.now();
    let status, data, rl;
    try {
        const res  = await fetch(url, opts);
        const ms   = Date.now() - start;
        status     = res.status;
        rl         = { limit: res.headers.get('X-RateLimit-Limit'), remaining: res.headers.get('X-RateLimit-Remaining') };
        try { data = JSON.stringify(await res.json(), null, 2); } catch { data = await res.text(); }

        const cls = status >= 500 ? 'log-err' : status >= 400 ? 'log-warn' : 'log-ok';
        appendLog(cls, `← ${status}  ${ms}ms  RL: ${rl.remaining}/${rl.limit} remaining`);

        const scls = status >= 500 ? 'status-err' : status >= 400 ? 'status-4xx' : 'status-ok';
        resMeta.innerHTML = `
            <span class="${scls}">${status}</span>
            <span>${ms}ms</span>
            ${rl.limit ? `<span>Rate: ${rl.remaining}/${rl.limit}</span>` : ''}
        `;
        resBody.textContent = data;
    } catch (e) {
        appendLog('log-err', `✕ Network error: ${e.message}`);
        resMeta.innerHTML = '<span class="status-err">Network Error</span>';
        resBody.textContent = e.message;
    }
}

document.getElementById('btn-fire')?.addEventListener('click', fireRequest);
document.getElementById('c-path')?.addEventListener('keydown', e => { if (e.key === 'Enter') fireRequest(); });

document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('c-path').value = btn.dataset.preset;
        document.getElementById('c-method').value = 'GET';
        fireRequest();
    });
});
