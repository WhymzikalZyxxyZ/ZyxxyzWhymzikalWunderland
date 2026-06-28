'use strict';

export { AnalyticsDO } from './analyticsDO.js';

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

function withCors(res) {
    const r = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
    return r;
}

function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
    });
}

// ── Demo route handlers ───────────────────────────────────────────────────────

function handleHello() {
    return json({ message: 'Hello from the gateway!', ts: Date.now() });
}

function handleTime() {
    const now = new Date();
    return json({ iso: now.toISOString(), unix: Math.floor(now / 1000), tz: 'UTC' });
}

const SENSITIVE_HEADERS = new Set(['x-api-key', 'authorization', 'cookie', 'set-cookie']);
const MAX_BODY_BYTES = 65_536;

async function handleEcho(request) {
    const url    = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const safeHeaders = Object.fromEntries(
        [...request.headers].filter(([k]) => !SENSITIVE_HEADERS.has(k.toLowerCase()))
    );
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const cl = parseInt(request.headers.get('content-length') || '0', 10);
        if (cl > MAX_BODY_BYTES) {
            return json({ error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' }, 413);
        }
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
            return json({ error: 'Request body too large', code: 'PAYLOAD_TOO_LARGE' }, 413);
        }
        try { body = JSON.parse(raw); } catch { body = raw; }
    }
    return json({ method: request.method, path: url.pathname, params, body, headers: safeHeaders });
}

async function handleSlow() {
    const delay = 200 + Math.floor(Math.random() * 600);
    await new Promise(r => setTimeout(r, delay));
    return json({ message: 'Slow response', simulated_delay_ms: delay });
}

function handleFail() {
    return json({ error: 'Internal Server Error', code: 'SIMULATED_FAILURE' }, 500);
}

function handleNotFound(path) {
    return json({ error: 'Route not found', path }, 404);
}

// ── Route table ───────────────────────────────────────────────────────────────
const ROUTES = [
    { method: 'GET',  pattern: /^\/api\/hello$/,  handler: handleHello },
    { method: 'GET',  pattern: /^\/api\/time$/,   handler: handleTime },
    { method: '*',    pattern: /^\/api\/echo/,    handler: handleEcho },
    { method: 'GET',  pattern: /^\/api\/slow$/,   handler: handleSlow },
    { method: 'GET',  pattern: /^\/api\/fail$/,   handler: handleFail },
];

function matchRoute(method, path) {
    return ROUTES.find(r => (r.method === '*' || r.method === method) && r.pattern.test(path));
}

// ── Main worker ───────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        const url    = new URL(request.url);
        const path   = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

        const stub = env.ANALYTICS.get(env.ANALYTICS.idFromName('singleton'));

        // Analytics passthrough — no auth, no logging
        if (path.startsWith('/analytics/')) {
            const doPath = path.replace('/analytics', '');
            const doUrl  = `https://do${doPath}${url.search}`;
            const res    = await stub.fetch(new Request(doUrl));
            return withCors(res);
        }

        // ── Auth ──────────────────────────────────────────────────────────────
        const keyHeader  = request.headers.get('X-API-Key') ?? '';
        const validKeys  = (env.API_KEYS ?? '').split(',').map(k => k.trim()).filter(Boolean);
        const keyValid   = validKeys.includes(keyHeader);
        const keyId      = keyValid ? keyHeader : '';
        const anonLimit  = parseInt(env.ANON_LIMIT ?? '20', 10);
        const keyLimit   = parseInt(env.KEY_LIMIT  ?? '120', 10);

        if (keyHeader && !keyValid) {
            return json({ error: 'Invalid API key', code: 'UNAUTHORIZED' }, 401);
        }

        // ── Rate limit ────────────────────────────────────────────────────────
        const identity = keyValid ? `key:${keyId}` : `ip:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`;
        const limit    = keyValid ? keyLimit : anonLimit;
        const rl       = await stub.fetch(new Request('https://do/rate-check', {
            method: 'POST',
            body: JSON.stringify({ identity, limit }),
            headers: { 'Content-Type': 'application/json' },
        })).then(r => r.json());

        const rlHeaders = {
            'X-RateLimit-Limit':     String(rl.limit),
            'X-RateLimit-Remaining': String(Math.max(0, rl.limit - rl.count)),
        };

        if (!rl.allowed) {
            return json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED', limit: rl.limit }, 429, rlHeaders);
        }

        // ── Route ─────────────────────────────────────────────────────────────
        const route = matchRoute(method, path);
        const start = Date.now();
        let response;

        if (route) {
            try {
                response = await route.handler(request);
            } catch (e) {
                console.error('route_handler_failed', { path, message: String(e) });
                response = json({ error: 'Handler error', code: 'INTERNAL_ERROR' }, 500);
            }
        } else {
            response = handleNotFound(path);
        }

        const latency = Date.now() - start;

        // Add rate limit headers to API response
        for (const [k, v] of Object.entries({ ...CORS, ...rlHeaders })) response.headers.set(k, v);

        // ── Log ───────────────────────────────────────────────────────────────
        const retention  = parseInt(env.RETENTION_DAYS ?? '7', 10);
        const safeKeyId  = keyId ? `${keyId.slice(0, 8)}…` : '';
        const safePath   = path.slice(0, 256);
        stub.fetch(new Request(`https://do/record?retention=${retention}`, {
            method: 'POST',
            body: JSON.stringify({ method, path: safePath, status: response.status, latency_ms: latency, key_id: safeKeyId, ts: Date.now() }),
            headers: { 'Content-Type': 'application/json' },
        })).catch(e => console.error('analytics_record_failed', String(e)));

        return response;
    },
};
