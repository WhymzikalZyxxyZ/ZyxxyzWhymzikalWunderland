'use strict';

const API = 'https://status.zyxwonderland.xyz';
const REFRESH_MS = 60_000;

function drawSparkline(canvas, points) {
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth  || 420;
    const H   = canvas.offsetHeight || 28;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    if (!points.length) return;

    const barW  = Math.max(1, (W / points.length) - 1);
    const gap   = W / points.length;

    points.forEach((p, i) => {
        ctx.fillStyle = p.ok ? '#4caf50' : '#f44336';
        ctx.fillRect(i * gap, 0, barW, H);
    });
}

async function fetchSparkline(svcId) {
    try {
        const res = await fetch(`${API}/api/sparkline?svc=${encodeURIComponent(svcId)}&n=90`);
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

function renderCard(svc, spark) {
    const card = document.createElement('div');
    card.className = 'status-card';

    const dot = document.createElement('div');
    dot.className = `status-dot ${svc.ok === null ? '' : svc.ok ? 'up' : 'down'}`;

    const info = document.createElement('div');
    info.className = 'status-info';

    const label = document.createElement('div');
    label.className = 'status-label';
    label.textContent = svc.label;

    const sub = document.createElement('div');
    sub.className = 'status-sub';
    sub.textContent = svc.latency !== null ? `${svc.latency} ms` : 'No data';

    const sparkWrap = document.createElement('div');
    sparkWrap.className = 'sparkline-wrap';

    const cv = document.createElement('canvas');
    cv.style.width  = '100%';
    cv.style.height = '28px';
    sparkWrap.appendChild(cv);

    const legend = document.createElement('div');
    legend.className = 'sparkline-legend';
    legend.innerHTML = `<span>90 checks ago</span><span>now</span>`;
    sparkWrap.appendChild(legend);

    info.appendChild(label);
    info.appendChild(sub);
    info.appendChild(sparkWrap);

    const right = document.createElement('div');
    right.className = 'status-right';

    const badge = document.createElement('div');
    badge.className = `status-badge ${svc.ok === null ? '' : svc.ok ? 'up' : 'down'}`;
    badge.textContent = svc.ok === null ? 'No data' : svc.ok ? 'Operational' : 'Outage';

    const uptime = document.createElement('div');
    uptime.className = 'status-uptime';
    uptime.textContent = svc.uptime !== null ? `${svc.uptime}% uptime` : '';

    right.appendChild(badge);
    right.appendChild(uptime);

    card.appendChild(dot);
    card.appendChild(info);
    card.appendChild(right);

    requestAnimationFrame(() => drawSparkline(cv, spark));

    return card;
}

async function refresh() {
    const overall = document.getElementById('overall');
    const cards   = document.getElementById('cards');
    const lastUpd = document.getElementById('last-updated');

    let data;
    try {
        const res = await fetch(`${API}/api/status`);
        if (!res.ok) throw new Error(res.status);
        data = await res.json();
    } catch {
        overall.className = 'status-overall some-down';
        overall.textContent = 'Unable to reach status API.';
        return;
    }

    const sparks = await Promise.all(data.map(svc => fetchSparkline(svc.id)));

    cards.innerHTML = '';
    data.forEach((svc, i) => cards.appendChild(renderCard(svc, sparks[i])));

    const allUp   = data.every(s => s.ok === true);
    const anyDown = data.some(s => s.ok === false);

    overall.className = `status-overall ${allUp ? 'all-up' : anyDown ? 'some-down' : ''}`;
    overall.textContent = allUp
        ? 'All systems operational'
        : anyDown
        ? 'One or more services are down'
        : 'Status unknown';

    lastUpd.textContent = new Date().toLocaleTimeString();
}

refresh();
setInterval(refresh, REFRESH_MS);
