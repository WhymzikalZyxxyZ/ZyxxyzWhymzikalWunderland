'use strict';

import { log }              from './logger.js';
import { fetchWithTimeout } from './utils.js';
import { runScraper }       from './scraper.js';

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
    const dbProbe    = env.ELINAL_DB    ? env.ELINAL_DB.prepare('SELECT 1').first()   : null;
    const cacheProbe = env.ELINAL_CACHE ? env.ELINAL_CACHE.get('__health__')           : null;

    const [scotusResult, courtlistenerResult, dbResult, cacheResult] = await Promise.allSettled([
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
        dbProbe    ?? Promise.resolve(null),
        cacheProbe ?? Promise.resolve(null),
    ]);

    const checks = {
        ai:            typeof env.AI?.run === 'function',
        db:            env.ELINAL_DB    ? dbResult.status === 'fulfilled'    : null,
        cache:         env.ELINAL_CACHE ? cacheResult.status === 'fulfilled' : null,
        scotus:        scotusResult.status === 'fulfilled'
                           && (scotusResult.value.ok || scotusResult.value.status < 500),
        courtlistener: courtlistenerResult.status === 'fulfilled'
                           && courtlistenerResult.value.ok,
    };

    const provisioned = Object.values(checks).filter(v => v !== null);
    const status      = provisioned.every(Boolean) ? 'ok' : 'degraded';
    log('info', 'health_check', { status, ...checks });
    return json({ status, checks });
}

// ── Admin ingest ──────────────────────────────────────────────────────────────
// Triggers the scraper manually. Protected by a static Bearer token.
// Use for initial seeding or to force-process a backlog outside the cron window.
async function handleAdminIngest(request, env, cors) {
    const auth  = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return err('Unauthorized', 401, cors);
    }
    if (!env.ELINAL_DB) {
        return err('Storage not provisioned — complete Phase 2 setup', 503, cors);
    }
    const result = await runScraper(env);
    return json({ ok: true, ...result }, 200, cors);
}

// ── Opinions API ──────────────────────────────────────────────────────────────
async function handleOpinionsList(request, env, cors) {
    if (!env.ELINAL_DB) return err('Storage not provisioned', 503, cors);
    const { listOpinions, countOpinions } = await import('./db.js');
    const params = new URL(request.url).searchParams;
    const term   = params.get('term') ?? undefined;
    const limit  = Math.min(parseInt(params.get('limit') ?? '20', 10), 100);
    const offset = Math.max(parseInt(params.get('offset') ?? '0', 10), 0);

    const [opinions, total] = await Promise.all([
        listOpinions(env.ELINAL_DB, { term, limit, offset }),
        countOpinions(env.ELINAL_DB, { term }),
    ]);
    return json({ opinions, total, limit, offset }, 200, cors);
}

async function handleOpinionDetail(docket, env, cors) {
    if (!env.ELINAL_DB) return err('Storage not provisioned', 503, cors);
    const { getOpinion } = await import('./db.js');
    const row = await getOpinion(env.ELINAL_DB, docket);
    if (!row) return err('Opinion not found', 404, cors);
    return json(row, 200, cors);
}

async function handleReadingMaterials(docket, env, cors) {
    if (!env.ELINAL_DB) return err('Storage not provisioned', 503, cors);

    // Fast path: KV cache
    if (env.ELINAL_CACHE) {
        const cached = await env.ELINAL_CACHE.get(`rm:${docket}`).catch(() => null);
        if (cached) {
            return json(JSON.parse(cached), 200, { ...cors, 'X-Cache': 'hit' });
        }
    }

    // Slow path: D1
    const { getOpinion, getReadingMaterials } = await import('./db.js');
    const opinion = await getOpinion(env.ELINAL_DB, docket);
    if (!opinion) return err('Opinion not found', 404, cors);
    if (opinion.status === 'processing' || opinion.status === 'pending') {
        return json({ status: opinion.status, docket }, 202, cors);
    }
    if (opinion.status === 'error') {
        return err(`Opinion processing failed: ${opinion.error_msg}`, 502, cors);
    }

    const rm = await getReadingMaterials(env.ELINAL_DB, docket);
    if (!rm) return err('Reading materials not yet available', 404, cors);

    const payload = {
        docket:               rm.docket,
        title:                opinion.title,
        decided_date:         opinion.decided_date,
        sections:             JSON.parse(rm.sections),
        glossary:             JSON.parse(rm.glossary),
        discussion_questions: JSON.parse(rm.discussion),
        further_reading:      JSON.parse(rm.further_reading),
    };

    // Backfill KV cache for next request
    if (env.ELINAL_CACHE) {
        env.ELINAL_CACHE.put(`rm:${docket}`, JSON.stringify(payload)).catch(() => {});
    }

    return json(payload, 200, cors);
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

    if (method !== 'GET' && !(method === 'POST' && path === '/api/admin/ingest')) {
        return err('Method not allowed', 405, cors);
    }

    // ── Edge cache (Cloudflare Cache API) — bypasses KV for repeat requests ──
    const edgeCache = caches.default;
    if (path.startsWith('/api/opinions/') && method === 'GET') {
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
    } else if (path === '/api/admin/ingest' && method === 'POST') {
        if (!ipAllow(ip, 5)) return err('Too many requests', 429, cors);
        response = await handleAdminIngest(request, env, cors);
    } else if (path === '/api/opinions') {
        response = await handleOpinionsList(request, env, cors);
    } else if (/^\/api\/opinions\/[^/]+\/reading$/.test(path)) {
        const docket = decodeURIComponent(path.slice('/api/opinions/'.length, -'/reading'.length));
        response = await handleReadingMaterials(docket, env, cors);
    } else if (/^\/api\/opinions\/[^/]+$/.test(path)) {
        const docket = decodeURIComponent(path.slice('/api/opinions/'.length));
        response = await handleOpinionDetail(docket, env, cors);
    } else if (path.startsWith('/api/')) {
        response = err('Not found', 404, cors);
    } else if (path === '/favicon.ico') {
        return new Response(null, { status: 204 });
    } else {
        // Serve the SPA for all other routes.
        // Strips X-Frame-Options so the app can be embedded on zyxwonderland.xyz;
        // replaces it with a CSP frame-ancestors directive limited to our domain.
        response = await env.ASSETS.fetch(request);
        const r  = new Response(response.body, response);
        r.headers.delete('X-Frame-Options');
        r.headers.set(
            'Content-Security-Policy',
            "frame-ancestors 'self' https://zyxwonderland.xyz https://*.zyxwonderland.xyz",
        );
        return r;
    }

    // Attach CORS and edge-cache successful opinions responses
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);

    if (r.status === 200 && path.startsWith('/api/opinions/') && method === 'GET'
            && r.headers.get('X-Cache') !== 'hit') {
        r.headers.set('Cache-Control', 'public, s-maxage=600, max-age=60');
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

    async scheduled(_event, env, _ctx) {
        if (!env.ELINAL_DB) {
            log('warn', 'cron_skipped', { reason: 'ELINAL_DB not provisioned' });
            return;
        }
        try {
            await runScraper(env);
        } catch (e) {
            log('error', 'cron_failed', { message: String(e) });
        }
    },
};
