'use strict';

// ── Structured logger ─────────────────────────────────────────────────────────
function log(level, event, kv = {}) {
    const entry = JSON.stringify({ level, event, ts: new Date().toISOString(), ...kv });
    if (level === 'error') console.error(entry);
    else if (level === 'warn')  console.warn(entry);
    else                        console.log(entry);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?zyxwonderland\.xyz$/;

function corsHeaders(origin) {
    if (!ALLOWED_ORIGIN_RE.test(origin)) return {};
    return {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age':       '86400',
        'Vary':                         'Origin',
    };
}

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to all API responses. SPA responses use a relaxed frame policy so
// the app can be embedded on zyxwonderland.xyz (see handleRequest SPA branch).
const SEC_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options':        'DENY',
    'Referrer-Policy':        'no-referrer',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...SEC_HEADERS, ...extraHeaders },
    });
}

function err(msg, status = 400, extraHeaders = {}) {
    return json({ error: msg }, status, extraHeaders);
}

// ── Timeout-aware fetch ───────────────────────────────────────────────────────
function fetchWithTimeout(url, opts = {}, ms = 10_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// ── Per-IP rate limiter (in-memory per isolate) ───────────────────────────────
// NOTE: Cloudflare runs multiple isolates per PoP and routes requests across them
// non-deterministically. This limiter is not globally consistent — the effective
// ceiling is max × (active isolates). Acceptable at this traffic level; replace
// with a Durable Object if global enforcement is ever needed.
const _ipLimits = new Map();

function ipAllow(ip, max, windowMs = 60_000) {
    const now = Date.now();
    const e   = _ipLimits.get(ip);
    if (!e || now > e.reset) {
        for (const [k, v] of _ipLimits) { if (now > v.reset) _ipLimits.delete(k); }
        _ipLimits.set(ip, { count: 1, reset: now + windowMs });
        return true;
    }
    if (e.count >= max) return false;
    e.count++;
    return true;
}

// ── Health ────────────────────────────────────────────────────────────────────
async function handleHealth(env) {
    const [scotusResult, courtlistenerResult] = await Promise.allSettled([
        fetchWithTimeout(
            'https://www.supremecourt.gov/opinions/slipopinion/25',
            { method: 'HEAD' },
            8_000,
        ),
        fetchWithTimeout(
            'https://www.courtlistener.com/api/rest/v4/?format=json',
            { headers: { 'Accept': 'application/json', 'User-Agent': 'ELINAL/1.0 (elinal.zyxwonderland.xyz)' } },
            8_000,
        ),
    ]);

    const checks = {
        ai:            typeof env.AI?.run === 'function',
        scotus:        scotusResult.status === 'fulfilled'
                           && (scotusResult.value.ok || scotusResult.value.status < 500),
        courtlistener: courtlistenerResult.status === 'fulfilled'
                           && courtlistenerResult.value.ok,
    };

    const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
    log('info', 'health_check', { status, ...checks });
    return json({ status, checks });
}

// ── Request router ────────────────────────────────────────────────────────────
async function handleRequest(request, env) {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const ip     = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
    const origin = request.headers.get('Origin') || '';
    const cors   = corsHeaders(origin);

    if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
    }

    if (method !== 'GET') return err('Method not allowed', 405, cors);

    // ── Edge cache (Cloudflare Cache API) — bypasses KV for repeat requests ──
    // Health is excluded; it must always reflect live upstream state.
    const edgeCache = caches.default;
    if (path.startsWith('/api/') && path !== '/api/health') {
        const hit = await edgeCache.match(request).catch(() => null);
        if (hit) {
            const fresh = new Response(hit.body, hit);
            for (const [k, v] of Object.entries(cors)) fresh.headers.set(k, v);
            return fresh;
        }
    }

    let response;

    if (path === '/api/health') {
        response = await handleHealth(env);
    } else if (path.startsWith('/api/')) {
        // Reserved for Phases 3–4. Return a structured 404 so clients get JSON,
        // not the SPA HTML, when they probe unimplemented endpoints.
        response = err('Not found', 404, cors);
    } else if (path === '/favicon.ico') {
        return new Response(null, { status: 204 });
    } else {
        // Serve the SPA for all other routes (/, /24-123, etc.).
        // Strips X-Frame-Options so the app can be embedded on zyxwonderland.xyz;
        // replaces it with a CSP frame-ancestors directive that limits to our domain.
        // env.ASSETS.fetch can throw on transient binding failures — the outer
        // try/catch in the exported fetch() will catch that and return 500.
        response = await env.ASSETS.fetch(request);
        const r = new Response(response.body, response);
        r.headers.delete('X-Frame-Options');
        r.headers.set(
            'Content-Security-Policy',
            "frame-ancestors 'self' https://zyxwonderland.xyz https://*.zyxwonderland.xyz",
        );
        return r;
    }

    // Attach CORS to API responses and store non-health responses in edge cache
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);

    if (r.status === 200 && path.startsWith('/api/') && path !== '/api/health') {
        r.headers.set('Cache-Control', 'public, s-maxage=300, max-age=60');
        const toCache = r.clone();
        for (const h of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods',
                          'Access-Control-Allow-Headers', 'Access-Control-Max-Age', 'Vary']) {
            toCache.headers.delete(h);
        }
        edgeCache.put(request, toCache).catch(() => {});
    }

    return r;
}

// ── Exported worker ───────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        if (!ipAllow(request.headers.get('CF-Connecting-IP') || '0.0.0.0', 60)) {
            return err('Too many requests — slow down', 429);
        }
        try {
            return await handleRequest(request, env);
        } catch (e) {
            log('error', 'unhandled_exception', { message: String(e), stack: e?.stack?.slice(0, 500) });
            const cors = corsHeaders(request.headers.get('Origin') || '');
            return err('Internal server error', 500, cors);
        }
    },

    // Scheduled handler — wired in Phase 3 when the pipeline is ready
    async scheduled(_event, _env, _ctx) {
        log('info', 'cron_fired', { note: 'pipeline not yet implemented — Phase 3' });
    },
};
