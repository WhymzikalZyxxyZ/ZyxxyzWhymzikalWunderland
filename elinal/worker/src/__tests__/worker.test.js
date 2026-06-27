'use strict';

import { describe, it, expect, vi, beforeAll } from 'vitest';
import worker from '../index.js';

// Stub Cloudflare Cache API — not available in Node/vitest
beforeAll(() => {
    global.caches = {
        default: {
            match: vi.fn(async () => null),
            put:   vi.fn(async () => undefined),
        },
    };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEnv(overrides = {}) {
    return {
        AI: { run: vi.fn().mockResolvedValue({ response: '{}' }) },
        ASSETS: {
            fetch: vi.fn().mockResolvedValue(
                new Response('<!DOCTYPE html><html><body>ELINAL</body></html>', {
                    status:  200,
                    headers: { 'Content-Type': 'text/html' },
                }),
            ),
        },
        ELINAL_MODEL:   '@cf/meta/llama-3.3-70b-instruct',
        PROMPT_VERSION: 'v1',
        SITE_ORIGIN:    'https://zyxwonderland.xyz',
        ...overrides,
    };
}

// Each test gets a unique IP so in-memory rate-limit state never bleeds
let _seq = 50;
function uniqueIp() { return `10.1.0.${_seq++}`; }

function req(path, { origin = 'https://zyxwonderland.xyz', method = 'GET', ip } = {}) {
    return new Request(`https://elinal.zyxwonderland.xyz${path}`, {
        method,
        headers: {
            'CF-Connecting-IP': ip ?? uniqueIp(),
            ...(origin ? { Origin: origin } : {}),
        },
    });
}

function mockFetch({ ok = true, status = 200 } = {}) {
    return vi.fn().mockResolvedValue(new Response('', { status: ok ? status : 500 }));
}

// ── /api/health ───────────────────────────────────────────────────────────────

describe('/api/health', () => {
    it('returns 200 with status and checks fields', async () => {
        global.fetch = mockFetch();
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('checks');
    });

    it('returns ok when upstream checks pass', async () => {
        global.fetch = mockFetch({ ok: true });
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.checks.ai).toBe(true);
        expect(body.checks.scotus).toBe(true);
        expect(body.checks.courtlistener).toBe(true);
    });

    it('returns degraded when upstream fetch fails', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        const body = await res.json();
        expect(body.status).toBe('degraded');
        expect(body.checks.scotus).toBe(false);
        expect(body.checks.courtlistener).toBe(false);
    });

    it('returns degraded when AI binding is absent', async () => {
        global.fetch = mockFetch({ ok: true });
        const res  = await worker.fetch(req('/api/health'), makeEnv({ AI: null }));
        const body = await res.json();
        expect(body.status).toBe('degraded');
        expect(body.checks.ai).toBe(false);
    });

    it('marks scotus ok on non-500 status codes (e.g. redirect)', async () => {
        global.fetch = vi.fn().mockResolvedValue(new Response('', { status: 301 }));
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        const body = await res.json();
        expect(body.checks.scotus).toBe(true);
    });
});

// ── Routing ───────────────────────────────────────────────────────────────────

describe('routing', () => {
    it('returns 404 JSON for unknown API routes', async () => {
        const res  = await worker.fetch(req('/api/unknown'), makeEnv());
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toHaveProperty('error');
    });

    it('serves SPA via ASSETS binding for root', async () => {
        const env = makeEnv();
        const res = await worker.fetch(req('/'), env);
        expect(env.ASSETS.fetch).toHaveBeenCalled();
        expect(res.status).toBe(200);
    });

    it('serves SPA for unknown non-API paths', async () => {
        const env = makeEnv();
        await worker.fetch(req('/24-123'), env);
        expect(env.ASSETS.fetch).toHaveBeenCalled();
    });

    it('returns 204 for /favicon.ico', async () => {
        const res = await worker.fetch(req('/favicon.ico'), makeEnv());
        expect(res.status).toBe(204);
    });

    it('returns 405 for non-GET API requests', async () => {
        const res = await worker.fetch(req('/api/health', { method: 'POST' }), makeEnv());
        expect(res.status).toBe(405);
    });
});

// ── CORS ──────────────────────────────────────────────────────────────────────

describe('CORS', () => {
    it('returns 204 for OPTIONS preflight', async () => {
        const res = await worker.fetch(req('/api/health', { method: 'OPTIONS' }), makeEnv());
        expect(res.status).toBe(204);
    });

    it('sets ACAO header for allowed origin', async () => {
        global.fetch = mockFetch();
        const res = await worker.fetch(
            req('/api/health', { origin: 'https://zyxwonderland.xyz' }),
            makeEnv(),
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zyxwonderland.xyz');
    });

    it('sets ACAO for subdomain origins', async () => {
        global.fetch = mockFetch();
        const res = await worker.fetch(
            req('/api/health', { origin: 'https://elinal.zyxwonderland.xyz' }),
            makeEnv(),
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://elinal.zyxwonderland.xyz');
    });

    it('does not set ACAO for disallowed origin', async () => {
        global.fetch = mockFetch();
        const res = await worker.fetch(
            req('/api/health', { origin: 'https://evil.example.com' }),
            makeEnv(),
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
});

// ── Security headers ──────────────────────────────────────────────────────────

describe('security headers', () => {
    it('sets X-Content-Type-Options on API responses', async () => {
        global.fetch = mockFetch();
        const res = await worker.fetch(req('/api/health'), makeEnv());
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('sets X-Frame-Options DENY on API responses', async () => {
        global.fetch = mockFetch();
        const res = await worker.fetch(req('/api/health'), makeEnv());
        expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('removes X-Frame-Options on SPA responses for embedding', async () => {
        const res = await worker.fetch(req('/'), makeEnv());
        expect(res.headers.get('X-Frame-Options')).toBeNull();
    });

    it('sets CSP frame-ancestors on SPA responses', async () => {
        const res = await worker.fetch(req('/'), makeEnv());
        expect(res.headers.get('Content-Security-Policy')).toMatch(/frame-ancestors/);
        expect(res.headers.get('Content-Security-Policy')).toMatch(/zyxwonderland\.xyz/);
    });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe('rate limiting', () => {
    it('allows requests under the limit', async () => {
        global.fetch = mockFetch();
        const env = makeEnv();
        const ip  = uniqueIp();
        for (let i = 0; i < 30; i++) {
            const r = await worker.fetch(req('/api/health', { ip }), env);
            expect(r.status).toBe(200);
        }
    });

    it('returns 429 after exceeding the per-IP limit', async () => {
        global.fetch = mockFetch();
        const env = makeEnv();
        const ip  = uniqueIp();
        for (let i = 0; i < 60; i++) {
            await worker.fetch(req('/api/health', { ip }), env);
        }
        const r = await worker.fetch(req('/api/health', { ip }), env);
        expect(r.status).toBe(429);
    });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
    it('returns 500 JSON when ASSETS binding throws', async () => {
        const env = makeEnv({
            ASSETS: { fetch: vi.fn().mockRejectedValue(new Error('asset failure')) },
        });
        const res = await worker.fetch(req('/'), env);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toHaveProperty('error');
    });

    it('does not propagate unhandled exceptions to the caller', async () => {
        const env = makeEnv({
            ASSETS: { fetch: vi.fn().mockRejectedValue(new Error('unexpected')) },
        });
        await expect(worker.fetch(req('/'), env)).resolves.toBeDefined();
    });
});
