import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../index.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

// Valid 64-char hex token
const VALID_TOKEN  = 'a'.repeat(64);
const VALID_ADDR   = 'test@mail.example.com';
const FUTURE_EXPIRY = Date.now() + 3_600_000;

/**
 * Build a mock Cloudflare env with controllable registry and mailbox stubs.
 *
 * @param {object} opts
 * @param {string|null} opts.registryAddress  Address the registry returns for VALID_TOKEN
 * @param {object}      opts.mailboxBody       JSON the mailbox DO echoes back
 */
function makeEnv({ registryAddress = VALID_ADDR, mailboxBody = { ok: true } } = {}) {
    const registryStub = {
        fetch: vi.fn(async (req) => {
            const url = new URL(typeof req === 'string' ? req : req.url);

            if (url.pathname.startsWith('/lookup/')) {
                return new Response(JSON.stringify({ address: registryAddress }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url.pathname === '/register') {
                return new Response(JSON.stringify({ ok: true, active: 1 }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url.pathname === '/stats') {
                return new Response(JSON.stringify({ active: 1, max: 500 }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            if (url.pathname.startsWith('/revoke/')) {
                return new Response(JSON.stringify({ ok: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
            return new Response('Not Found', { status: 404 });
        }),
    };

    const mailboxStub = {
        fetch: vi.fn(async () =>
            new Response(JSON.stringify(mailboxBody), {
                headers: { 'Content-Type': 'application/json' },
            })
        ),
    };

    return {
        REGISTRY: {
            idFromName: vi.fn(() => 'registry-id'),
            get:        vi.fn(() => registryStub),
        },
        MAILBOX: {
            idFromName: vi.fn((name) => `mailbox-id-${name}`),
            get:        vi.fn(() => mailboxStub),
        },
        DOMAIN:          'mail.example.com',
        TTL_MS:          '3600000',
        MAX_MAILBOXES:   '500',
        DEV_RATE_BYPASS: 'true',
        _registry: registryStub,
        _mailbox:  mailboxStub,
    };
}

/** Build a Request to the Worker. */
function req(path, { method = 'GET', token = null, body = null, origin = 'https://zyxwonderland.xyz' } = {}) {
    const headers = { 'CF-Connecting-IP': '1.2.3.4' };
    if (origin)  headers['Origin']        = origin;
    if (token)   headers['Authorization'] = `Bearer ${token}`;
    if (body)    headers['Content-Type']  = 'application/json';
    return new Request(`https://mail.example.com${path}`, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Worker routing', () => {

    // ── CORS ──────────────────────────────────────────────────────────────────
    describe('CORS', () => {
        it('OPTIONS preflight returns 204 with CORS headers', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/mailbox', { method: 'OPTIONS' }), env);
            expect(res.status).toBe(204);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zyxwonderland.xyz');
        });

        it('known origin gets Access-Control-Allow-Origin on regular response', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health'), env);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zyxwonderland.xyz');
        });

        it('unknown origin gets no CORS header', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health', { origin: 'https://evil.com' }), env);
            expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
        });
    });

    // ── Security headers ──────────────────────────────────────────────────────
    describe('Security headers', () => {
        it('every response has X-Content-Type-Options: nosniff', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health'), env);
            expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
        });

        it('every response has X-Frame-Options: DENY', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health'), env);
            expect(res.headers.get('X-Frame-Options')).toBe('DENY');
        });

        it('every response has X-Request-Id', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health'), env);
            expect(res.headers.get('X-Request-Id')).toBeTruthy();
        });

        it('every response has X-Response-Time', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/health'), env);
            expect(res.headers.get('X-Response-Time')).toMatch(/^\d+ms$/);
        });
    });

    // ── Health check ──────────────────────────────────────────────────────────
    describe('GET /health', () => {
        it('returns 200 with status: ok', async () => {
            const env = makeEnv();
            const res  = await worker.fetch(req('/health'), env);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.status).toBe('ok');
            expect(body).toHaveProperty('version');
            expect(body).toHaveProperty('timestamp');
        });
    });

    // ── Unknown paths ─────────────────────────────────────────────────────────
    describe('Unknown paths', () => {
        it('non-/api path returns 404', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/nope'), env);
            expect(res.status).toBe(404);
        });

        it('/api/unknown authenticated route returns 404', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/unknown', { token: VALID_TOKEN }), env);
            expect(res.status).toBe(404);
        });
    });

    // ── Authentication ────────────────────────────────────────────────────────
    describe('Authentication', () => {
        it('missing token returns 401', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/mailbox'), env);
            expect(res.status).toBe(401);
        });

        it('malformed token (too short) returns 401', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/mailbox', { token: 'short' }), env);
            expect(res.status).toBe(401);
        });

        it('non-hex token returns 401', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/mailbox', { token: 'z'.repeat(64) }), env);
            expect(res.status).toBe(401);
        });

        it('valid-format token but registry miss returns 401 with error message', async () => {
            const env = makeEnv({ registryAddress: null });
            const res  = await worker.fetch(req('/api/mailbox', { token: VALID_TOKEN }), env);
            const body = await res.json();
            expect(res.status).toBe(401);
            expect(body.error).toBe('Invalid or expired session');
        });
    });

    // ── Mailbox creation ──────────────────────────────────────────────────────
    describe('POST /api/mailbox', () => {
        it('creates a mailbox and returns address, token, expiresAt', async () => {
            const env = makeEnv();
            // mailbox /init returns expiresAt; registry /register returns ok
            env._mailbox.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ expiresAt: FUTURE_EXPIRY }), {
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            const res  = await worker.fetch(req('/api/mailbox', { method: 'POST' }), env);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body).toHaveProperty('address');
            expect(body).toHaveProperty('token');
            expect(body).toHaveProperty('expiresAt');
        });

        it('returns 503 when registry reports capacity reached', async () => {
            const env = makeEnv();
            env._mailbox.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ expiresAt: FUTURE_EXPIRY }), {
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            env._registry.fetch.mockResolvedValueOnce(
                new Response(JSON.stringify({ error: 'Mailbox capacity reached — try again later' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            const res = await worker.fetch(req('/api/mailbox', { method: 'POST' }), env);
            expect(res.status).toBe(503);
        });
    });

    // ── Authenticated routes ──────────────────────────────────────────────────
    describe('Authenticated routes', () => {
        it('GET /api/mailbox forwards to mailbox /info', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/mailbox', { token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/info');
        });

        it('POST /api/mailbox/extend forwards to /extend', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/mailbox/extend', { method: 'POST', token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/extend');
        });

        it('DELETE /api/mailbox forwards to /burn', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/mailbox', { method: 'DELETE', token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/burn');
        });

        it('GET /api/qr forwards to /qr', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/qr', { token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/qr');
        });

        it('GET /api/box/inbox forwards to /box/inbox', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/box/inbox', { token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/box/inbox');
        });

        it('GET /api/box/sent forwards to /box/sent', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/box/sent', { token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/box/sent');
        });

        it('POST /api/draft forwards to /draft', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/draft', { method: 'POST', token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/draft');
        });

        it('PUT /api/draft/:id forwards to /draft/:id', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/draft/abc123', { method: 'PUT', token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/draft/abc123');
        });

        it('POST /api/send forwards to mailbox /send', async () => {
            const env = makeEnv();
            await worker.fetch(req('/api/send', { method: 'POST', token: VALID_TOKEN }), env);
            const paths = env._mailbox.fetch.mock.calls.map(([r]) => new URL(r.url).pathname);
            expect(paths).toContain('/send');
        });

        it('POST /api/send with expired session returns 401', async () => {
            const env = makeEnv({ registryAddress: null });
            const res = await worker.fetch(req('/api/send', { method: 'POST', token: VALID_TOKEN, body: {} }), env);
            expect(res.status).toBe(401);
        });
    });

    // ── Beacon burn ───────────────────────────────────────────────────────────
    describe('POST /api/beacon/burn', () => {
        it('valid token burns mailbox and returns ok', async () => {
            const env  = makeEnv();
            const res  = await worker.fetch(req('/api/beacon/burn', {
                method: 'POST',
                body:   { token: VALID_TOKEN },
            }), env);
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body.ok).toBe(true);
        });

        it('invalid token body still returns 200 (beacon is fire-and-forget)', async () => {
            const env = makeEnv({ registryAddress: null });
            const res = await worker.fetch(req('/api/beacon/burn', {
                method: 'POST',
                body:   { token: 'bad' },
            }), env);
            expect(res.status).toBe(200);
        });

        it('missing body still returns 200', async () => {
            const env = makeEnv();
            const res = await worker.fetch(req('/api/beacon/burn', { method: 'POST' }), env);
            expect(res.status).toBe(200);
        });
    });
});
