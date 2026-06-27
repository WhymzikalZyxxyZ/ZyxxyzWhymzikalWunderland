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

function makeDB() {
    const stmt = {
        bind:  vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ '1': 1 }),
        all:   vi.fn().mockResolvedValue({ results: [] }),
        run:   vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    };
    return { prepare: vi.fn().mockReturnValue(stmt) };
}

function makeCache() {
    return {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
    };
}

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
        ELINAL_DB:      makeDB(),
        ELINAL_CACHE:   makeCache(),
        ADMIN_TOKEN:    'test-admin-token',
        CL_API_TOKEN:   'test-cl-token',
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
        expect(body.checks.db).toBe(true);
        expect(body.checks.cache).toBe(true);
        expect(body.checks.scotus).toBe(true);
        expect(body.checks.courtlistener).toBe(true);
        expect(body.checks.cl_auth).toBe(true);
    });

    it('returns degraded when CL_API_TOKEN is absent', async () => {
        global.fetch = mockFetch({ ok: true });
        const res  = await worker.fetch(req('/api/health'), makeEnv({ CL_API_TOKEN: undefined }));
        const body = await res.json();
        expect(body.status).toBe('degraded');
        expect(body.checks.cl_auth).toBe(false);
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

    it('reports db and cache as null when bindings are unprovisioned', async () => {
        global.fetch = mockFetch({ ok: true });
        const res  = await worker.fetch(
            req('/api/health'),
            makeEnv({ ELINAL_DB: undefined, ELINAL_CACHE: undefined }),
        );
        const body = await res.json();
        expect(body.checks.db).toBeNull();
        expect(body.checks.cache).toBeNull();
        // Status is still ok because unprovisioned checks are excluded
        expect(body.status).toBe('ok');
    });

    it('returns degraded when D1 probe fails', async () => {
        global.fetch = mockFetch({ ok: true });
        const brokenDB = {
            prepare: vi.fn().mockReturnValue({
                first: vi.fn().mockRejectedValue(new Error('D1 error')),
            }),
        };
        const res  = await worker.fetch(req('/api/health'), makeEnv({ ELINAL_DB: brokenDB }));
        const body = await res.json();
        expect(body.status).toBe('degraded');
        expect(body.checks.db).toBe(false);
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

// ── Admin ingest ──────────────────────────────────────────────────────────────

// Mock scraper so the integration test doesn't call real CourtListener
vi.mock('../scraper.js', () => ({
    runScraper: vi.fn().mockResolvedValue({ fetched: 0, inserted: 0, processed: 0, errors: 0 }),
}));

describe('POST /api/admin/ingest', () => {
    function postReq(token) {
        return new Request('https://elinal.zyxwonderland.xyz/api/admin/ingest', {
            method: 'POST',
            headers: {
                'CF-Connecting-IP': uniqueIp(),
                'Authorization':    token ? `Bearer ${token}` : '',
            },
        });
    }

    it('returns 401 with no token', async () => {
        const res = await worker.fetch(postReq(''), makeEnv());
        expect(res.status).toBe(401);
    });

    it('returns 401 with wrong token', async () => {
        const res = await worker.fetch(postReq('wrong-token'), makeEnv());
        expect(res.status).toBe(401);
    });

    it('returns 200 with correct token', async () => {
        const res = await worker.fetch(postReq('test-admin-token'), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.ok).toBe(true);
    });

    it('returns 503 when ELINAL_DB is unprovisioned', async () => {
        const res = await worker.fetch(
            postReq('test-admin-token'),
            makeEnv({ ELINAL_DB: undefined }),
        );
        expect(res.status).toBe(503);
    });
});

// ── Opinions API ──────────────────────────────────────────────────────────────

const OPINION_ROW = {
    docket: '24-1234', term: '24', title: 'Test v. State',
    decided_date: '2025-04-15', status: 'ready', error_msg: null,
    created_at: '2025-04-15T12:00:00Z', updated_at: '2025-04-15T12:00:00Z',
};

const RM_ROW = {
    docket:         '24-1234',
    sections:       JSON.stringify([{ heading: 'H', body: 'B', key_terms: [], pull_quote: 'Q' }]),
    glossary:       JSON.stringify([]),
    discussion:     JSON.stringify([]),
    further_reading: JSON.stringify([]),
};

describe('GET /api/opinions', () => {
    it('returns 503 when DB is unprovisioned', async () => {
        const res = await worker.fetch(req('/api/opinions'), makeEnv({ ELINAL_DB: undefined }));
        expect(res.status).toBe(503);
    });

    it('returns opinion list when DB is provisioned', async () => {
        const env = makeEnv();
        // listOpinions → all() returns one row; countOpinions → first() returns total
        env.ELINAL_DB.prepare.mockImplementation(() => ({
            bind: vi.fn().mockReturnThis(),
            all:  vi.fn().mockResolvedValue({ results: [OPINION_ROW] }),
            first: vi.fn().mockResolvedValue({ total: 1 }),
        }));
        const res  = await worker.fetch(req('/api/opinions'), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body.opinions)).toBe(true);
    });
});

describe('GET /api/opinions/:docket', () => {
    it('returns 404 when opinion not found', async () => {
        const env = makeEnv();
        env.ELINAL_DB.prepare.mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
        });
        const res = await worker.fetch(req('/api/opinions/99-9999'), env);
        expect(res.status).toBe(404);
    });

    it('returns 200 with opinion data when found', async () => {
        const env = makeEnv();
        env.ELINAL_DB.prepare.mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(OPINION_ROW),
        });
        const res  = await worker.fetch(req('/api/opinions/24-1234'), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.docket).toBe('24-1234');
    });
});

describe('GET /api/opinions/:docket/reading', () => {
    it('returns 200 from KV cache when cached', async () => {
        const env = makeEnv();
        const cached = JSON.stringify({ docket: '24-1234', title: 'T', sections: [], glossary: [], discussion_questions: [], further_reading: [] });
        env.ELINAL_CACHE.get.mockResolvedValue(cached);
        const res = await worker.fetch(req('/api/opinions/24-1234/reading'), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('hit');
    });

    it('falls back to D1 when KV misses', async () => {
        const env = makeEnv();
        env.ELINAL_CACHE.get.mockResolvedValue(null);
        // First prepare call is getOpinion, second is getReadingMaterials
        let callCount = 0;
        env.ELINAL_DB.prepare.mockImplementation(() => ({
            bind: vi.fn().mockReturnThis(),
            first: vi.fn().mockImplementation(() =>
                callCount++ === 0 ? Promise.resolve(OPINION_ROW) : Promise.resolve(RM_ROW),
            ),
        }));
        const res = await worker.fetch(req('/api/opinions/24-1234/reading'), env);
        expect(res.status).toBe(200);
    });

    it('returns 202 when opinion is still processing', async () => {
        const env = makeEnv();
        env.ELINAL_CACHE.get.mockResolvedValue(null);
        env.ELINAL_DB.prepare.mockReturnValue({
            bind:  vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue({ ...OPINION_ROW, status: 'processing' }),
        });
        const res = await worker.fetch(req('/api/opinions/24-1234/reading'), env);
        expect(res.status).toBe(202);
    });

    it('returns 404 when opinion not found', async () => {
        const env = makeEnv();
        env.ELINAL_CACHE.get.mockResolvedValue(null);
        env.ELINAL_DB.prepare.mockReturnValue({
            bind:  vi.fn().mockReturnThis(),
            first: vi.fn().mockResolvedValue(null),
        });
        const res = await worker.fetch(req('/api/opinions/99-9999/reading'), env);
        expect(res.status).toBe(404);
    });
});
