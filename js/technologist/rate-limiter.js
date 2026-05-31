// ── State ────────────────────────────────────────────────────────────────────
    let tokens = 10, lastRefill = Date.now();
    let windowLog = [];
    let fixedWindowStart = Date.now(), fixedCount = 0;
    let leakyQueue = 0, lastLeak = Date.now();
    let passed = 0, denied = 0;
    let history = []; // {t, result} for canvas
    let autoTimer = null;
    let autoRunning = false;
    const MAX_HISTORY = 120;

    function cfg() {
        return {
            rate:     parseFloat(document.getElementById('rate').value),
            burst:    parseFloat(document.getElementById('burst').value),
            autoRate: parseFloat(document.getElementById('autoRate').value),
            algo:     document.getElementById('algo').value,
        };
    }

    function updateLabels() {
        const c = cfg();
        document.getElementById('rate-val').textContent     = c.rate + ' req/s';
        document.getElementById('burst-val').textContent    = c.burst + ' tokens';
        document.getElementById('autoRate-val').textContent = c.autoRate + ' req/s';
    }

    function resetSim() {
        const c = cfg();
        tokens = c.burst; lastRefill = Date.now();
        windowLog = []; fixedWindowStart = Date.now(); fixedCount = 0;
        leakyQueue = 0; lastLeak = Date.now();
        passed = 0; denied = 0; history = [];
        document.getElementById('log').innerHTML = '';
        updateStats(); drawViz();
    }

    function fireRequest() {
        const c   = cfg();
        const now = Date.now();
        let allow = false;

        if (c.algo === 'token') {
            const elapsed = (now - lastRefill) / 1000;
            tokens = Math.min(c.burst, tokens + elapsed * c.rate);
            lastRefill = now;
            if (tokens >= 1) { tokens -= 1; allow = true; }
        } else if (c.algo === 'sliding') {
            const window = 1000;
            windowLog = windowLog.filter(t => now - t < window);
            if (windowLog.length < c.rate) { windowLog.push(now); allow = true; }
        } else if (c.algo === 'fixed') {
            if (now - fixedWindowStart >= 1000) { fixedWindowStart = now; fixedCount = 0; }
            if (fixedCount < c.rate) { fixedCount++; allow = true; }
        } else if (c.algo === 'leaky') {
            const elapsed = (now - lastLeak) / 1000;
            leakyQueue = Math.max(0, leakyQueue - elapsed * c.rate);
            lastLeak = now;
            if (leakyQueue < c.burst) { leakyQueue++; allow = true; }
        }

        if (allow) passed++; else denied++;
        history.push({ t: now, result: allow });
        if (history.length > MAX_HISTORY) history.shift();

        addLog(allow, now);
        updateStats();
        drawViz();
    }

    function fireBurst(n) { for (let i = 0; i < n; i++) fireRequest(); }

    function toggleAuto() {
        autoRunning = !autoRunning;
        const btn = document.getElementById('auto-btn');
        if (autoRunning) {
            btn.textContent = '⏹ Stop Auto';
            scheduleAuto();
        } else {
            btn.textContent = '▶ Auto Fire';
            if (autoTimer) clearTimeout(autoTimer);
        }
    }

    function scheduleAuto() {
        if (!autoRunning) return;
        fireRequest();
        const delay = 1000 / cfg().autoRate;
        autoTimer = setTimeout(scheduleAuto, delay);
    }

    function addLog(allow, now) {
        const log = document.getElementById('log');
        const d = new Date(now);
        const ts = d.toLocaleTimeString([], { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3,'0');
        const algo = cfg().algo;
        const stateDesc = algo === 'token'   ? ` [tokens: ${tokens.toFixed(2)}]`
                        : algo === 'sliding' ? ` [window: ${windowLog.length}]`
                        : algo === 'fixed'   ? ` [count: ${fixedCount}]`
                        : ` [queue: ${leakyQueue.toFixed(2)}]`;
        const el = document.createElement('div');
        el.className = allow ? 'log-pass' : 'log-deny';
        el.textContent = `${ts}  ${allow ? '✓ ALLOW' : '✗ DENY '}${stateDesc}`;
        log.appendChild(el);
        log.scrollTop = log.scrollHeight;
    }

    function updateStats() {
        const c    = cfg();
        const total = passed + denied;
        document.getElementById('stat-pass').textContent  = passed;
        document.getElementById('stat-deny').textContent  = denied;
        document.getElementById('stat-rate').textContent  = total ? Math.round(passed / total * 100) + '%' : '—';
        const state = c.algo === 'token'   ? tokens.toFixed(1)
                    : c.algo === 'sliding' ? windowLog.length
                    : c.algo === 'fixed'   ? fixedCount
                    : leakyQueue.toFixed(1);
        document.getElementById('stat-tokens').textContent = state;
    }

    function drawViz() {
        const canvas = document.getElementById('viz');
        const W = canvas.offsetWidth || 600;
        canvas.width  = W * window.devicePixelRatio;
        canvas.height = 160 * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.clearRect(0, 0, W, 160);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.roundRect(0, 0, W, 160, 6);
        ctx.fill();

        if (!history.length) return;

        const now    = Date.now();
        const span   = 10000; // 10 second window
        const xFor   = t => ((t - (now - span)) / span) * (W - 32) + 16;
        const barW   = Math.max(3, (W - 32) / MAX_HISTORY * 0.8);

        // Grid lines
        ctx.strokeStyle = 'rgba(100,180,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const x = 16 + i * ((W - 32) / 10);
            ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, 140); ctx.stroke();
        }

        // Axis label
        ctx.fillStyle = '#333';
        ctx.font = '10px Courier New';
        ctx.fillText('−10s', 16, 155);
        ctx.fillText('now', W - 30, 155);

        // Bars
        history.forEach(h => {
            const x = xFor(h.t);
            if (x < 0 || x > W) return;
            ctx.fillStyle = h.result ? 'rgba(76,175,80,0.7)' : 'rgba(239,83,80,0.7)';
            ctx.fillRect(x - barW / 2, 30, barW, 100);
        });

        // Token level line (token bucket only)
        if (cfg().algo === 'token') {
            const pct = tokens / cfg().burst;
            const y   = 130 - pct * 90;
            ctx.strokeStyle = 'rgba(100,180,255,0.6)';
            ctx.lineWidth   = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(W - 16, y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#64b4ff';
            ctx.font = '10px Courier New';
            ctx.fillText(`tokens: ${tokens.toFixed(1)}`, 20, y - 4);
        }
    }

    // ── Compare table ────────────────────────────────────────────────────────────
    const COMPARE = [
        { name:'Token Bucket',      burst:'Yes (up to burst)', mem:'O(1) per key', prec:'High',   complexity:'Low',    usedBy:'AWS, Stripe, Nginx' },
        { name:'Sliding Window Log',burst:'No',                mem:'O(N) per key', prec:'Exact',  complexity:'Medium', usedBy:'Redis pattern, Cloudflare' },
        { name:'Fixed Window',      burst:'Boundary spike ×2', mem:'O(1) per key', prec:'Low',    complexity:'Lowest', usedBy:'Simple APIs, legacy systems' },
        { name:'Leaky Bucket',      burst:'Smoothed output',   mem:'O(1) per key', prec:'High',   complexity:'Low',    usedBy:'Network QoS, VOIP' },
    ];

    function buildCompare() {
        const tbody = document.getElementById('compare-body');
        COMPARE.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:7px 12px;color:#c8e0ff;font-weight:bold;border-bottom:1px solid rgba(255,255,255,0.04);">${r.name}</td>
                <td style="padding:7px 12px;color:#888;border-bottom:1px solid rgba(255,255,255,0.04);">${r.burst}</td>
                <td style="padding:7px 12px;color:#888;border-bottom:1px solid rgba(255,255,255,0.04);">${r.mem}</td>
                <td style="padding:7px 12px;color:#888;border-bottom:1px solid rgba(255,255,255,0.04);">${r.prec}</td>
                <td style="padding:7px 12px;color:#888;border-bottom:1px solid rgba(255,255,255,0.04);">${r.complexity}</td>
                <td style="padding:7px 12px;color:#888;border-bottom:1px solid rgba(255,255,255,0.04);">${r.usedBy}</td>`;
            tbody.appendChild(tr);
        });
    }

    // ── Token Bucket animation ───────────────────────────────────────────────────
    function tokenDemo() {
        const canvas = document.getElementById('token-anim');
        const W = canvas.offsetWidth || 500;
        canvas.width = W * devicePixelRatio;
        canvas.height = 120 * devicePixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);

        let t = 0, tok = 8, max = 10, rate = 2, requests = [0.5,1.0,1.2,2.0,2.1,2.2,2.3,4.0,4.5,5.0,5.1,5.2,5.3,5.4,5.5,5.6,7.0,8.0,9.0];
        let reqIdx = 0, results = [];

        function frame() {
            t += 0.05;
            tok = Math.min(max, tok + rate * 0.05);
            while (reqIdx < requests.length && requests[reqIdx] <= t) {
                if (tok >= 1) { tok -= 1; results.push({x: requests[reqIdx]/10*W, ok:true}); }
                else           { results.push({x: requests[reqIdx]/10*W, ok:false}); }
                reqIdx++;
            }

            ctx.clearRect(0,0,W,120);
            ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,W,120);

            // bucket
            const bx=20, by=20, bw=60, bh=80, fill=tok/max*bh;
            ctx.strokeStyle='rgba(100,180,255,0.4)'; ctx.lineWidth=2;
            ctx.strokeRect(bx,by,bw,bh);
            ctx.fillStyle='rgba(100,180,255,0.25)';
            ctx.fillRect(bx, by+bh-fill, bw, fill);
            ctx.fillStyle='#64b4ff'; ctx.font='10px Courier New';
            ctx.fillText(`${tok.toFixed(1)}/${max}`,bx+4,by+bh+14);
            ctx.fillText('bucket',bx+8,by-4);

            // timeline
            const tx=100, ty=60, tlen=W-120;
            ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+tlen,ty); ctx.stroke();
            ctx.fillStyle='#333'; ctx.font='10px Courier New';
            ctx.fillText('0s',tx,ty+20); ctx.fillText('10s',tx+tlen-20,ty+20);

            const cx = tx + (t/10)*tlen;
            ctx.strokeStyle='rgba(100,180,255,0.5)'; ctx.lineWidth=1.5;
            ctx.setLineDash([3,3]);
            ctx.beginPath(); ctx.moveTo(cx,ty-20); ctx.lineTo(cx,ty+20); ctx.stroke();
            ctx.setLineDash([]);

            results.forEach(r => {
                ctx.fillStyle = r.ok ? '#4caf50' : '#ef5350';
                ctx.beginPath(); ctx.arc(r.x+tx, ty, 5, 0, Math.PI*2); ctx.fill();
            });

            if (t < 10) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    // ── Sliding Window animation ─────────────────────────────────────────────────
    function slidingDemo() {
        const canvas = document.getElementById('sliding-anim');
        const W = canvas.offsetWidth || 500;
        canvas.width = W * devicePixelRatio;
        canvas.height = 120 * devicePixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);

        let t=0, limit=5, window=2, log=[], requests=[0.2,0.5,0.8,1.0,1.5,1.6,1.7,2.2,2.3,2.4,2.5,4.0,4.2,4.4,4.6,4.8,5.0,7.0,8.5,9.0];
        let reqIdx=0, results=[];

        function frame() {
            t += 0.04;
            log = log.filter(x => t - x < window);
            while (reqIdx < requests.length && requests[reqIdx] <= t) {
                const allow = log.length < limit;
                if (allow) log.push(requests[reqIdx]);
                results.push({x: requests[reqIdx]/10*W, ok:allow});
                reqIdx++;
            }

            ctx.clearRect(0,0,W,120);
            ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(0,0,W,120);

            const tx=20, ty=60, tlen=W-40;
            ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+tlen,ty); ctx.stroke();

            // sliding window rect
            const wx1 = tx + Math.max(0, (t-window)/10) * tlen;
            const wx2 = tx + (t/10) * tlen;
            ctx.fillStyle='rgba(100,180,255,0.08)';
            ctx.fillRect(wx1, ty-30, wx2-wx1, 60);
            ctx.strokeStyle='rgba(100,180,255,0.25)';
            ctx.lineWidth=1; ctx.setLineDash([4,4]);
            ctx.strokeRect(wx1, ty-30, wx2-wx1, 60);
            ctx.setLineDash([]);

            ctx.fillStyle='#444'; ctx.font='10px Courier New';
            ctx.fillText(`window (${window}s)`, wx1+4, ty-34);
            ctx.fillText(`count: ${log.length}/${limit}`, wx1+4, ty+44);

            results.forEach(r => {
                ctx.fillStyle = r.ok ? '#4caf50' : '#ef5350';
                ctx.beginPath(); ctx.arc(tx + r.x + 0, ty, 5, 0, Math.PI*2); ctx.fill();
            });

            ctx.fillStyle='#333'; ctx.font='10px Courier New';
            ctx.fillText('0s',tx,ty+20); ctx.fillText('10s',tx+tlen-20,ty+20);

            if (t < 10) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    function showTab(id) {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        const labels = ['sim','token','sliding','compare'];
        document.querySelectorAll('.tab')[labels.indexOf(id)].classList.add('active');
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateLabels(); resetSim(); buildCompare();
        setInterval(() => { if (document.getElementById('tab-sim').classList.contains('active')) drawViz(); }, 200);
    });
