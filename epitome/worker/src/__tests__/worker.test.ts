/**
 * Integration tests for the Epitome Hono worker.
 *
 * Strategy: mock `../db/client` so `getDb()` returns a controllable Drizzle-
 * like object.  This bypasses the raw D1 statement API entirely and lets us
 * control exactly what each query returns without replicating Drizzle internals.
 *
 * Each test composes a fresh mock DB via `makeDb()` and passes it to `makeEnv()`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bindings } from '../types';

// ── Mock the DB module before importing the worker ────────────────────────────
//
// Vitest hoists vi.mock() calls, so this runs before `import worker` below.

vi.mock('../db/client', () => {
    // Simple stub — return value is replaced per-test via mockGetDb().
    // The default returns a no-op object; beforeEach ensures a fresh stub each test.
    return {
        getDb: vi.fn(),
    };
});

// Import after mock is registered
import worker from '../index';
import { getDb } from '../db/client';

// ── Drizzle-query builder stub types ─────────────────────────────────────────

type AnyFn = ReturnType<typeof vi.fn>;

/**
 * Creates a chainable query builder stub.
 * Every method returns `this` so callers can chain as many methods as they
 * like.  The terminal methods (.get(), .all(), .returning()) resolve to the
 * supplied values.
 */
function makeQuery(opts: {
    all?:       unknown[];
    single?:    unknown;
    returning?: unknown[];
} = {}) {
    const all       = opts.all       ?? [];
    const single    = opts.single    !== undefined ? opts.single : (all[0] ?? null);
    const returning = opts.returning ?? all;

    const q: Record<string, AnyFn> = {};

    // Chainable methods
    for (const method of [
        'select', 'from', 'where', 'orderBy', 'insert', 'values',
        'update', 'set', 'delete', 'limit', 'offset',
    ]) {
        q[method] = vi.fn().mockReturnValue(q);
    }

    // Terminal methods
    q['all']       = vi.fn().mockResolvedValue(all);
    q['get']       = vi.fn().mockResolvedValue(single);
    q['returning'] = vi.fn().mockResolvedValue(returning);
    q['run']       = vi.fn().mockResolvedValue({ rowsAffected: 1 });

    return q;
}

/**
 * Creates a mock Drizzle DB where every operation (select, insert, update,
 * delete) chains to the supplied query builder.
 */
function makeDb(opts: Parameters<typeof makeQuery>[0] = {}) {
    const q = makeQuery(opts);
    return {
        select:  vi.fn().mockReturnValue(q),
        insert:  vi.fn().mockReturnValue(q),
        update:  vi.fn().mockReturnValue(q),
        delete:  vi.fn().mockReturnValue(q),
        _query:  q,
    };
}

/** Override the mock returned by getDb() for the duration of one test. */
function mockGetDb(db: ReturnType<typeof makeDb>) {
    (getDb as AnyFn).mockReturnValue(db);
}

// ── Env factory ───────────────────────────────────────────────────────────────

function makeEnv(overrides: Record<string, unknown> = {}) {
    return {
        DB: {},   // raw D1 binding — not used; getDb() is mocked
        STORAGE: {
            get:    vi.fn().mockResolvedValue(null),
            put:    vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
        },
        AI: { run: vi.fn().mockResolvedValue({ response: '' }) },
        ASSETS: {
            fetch: vi.fn().mockResolvedValue(
                new Response('<html><body>Epitome</body></html>', {
                    status:  200,
                    headers: { 'Content-Type': 'text/html' },
                }),
            ),
        },
        ENVIRONMENT: 'test',
        SITE_ORIGIN: 'https://zyxwonderland.xyz',
        ...overrides,
    };
}

// ── Request helper ────────────────────────────────────────────────────────────

function req(
    path: string,
    {
        method  = 'GET',
        body,
        cookie,
        origin  = 'https://epitome.zyxwonderland.xyz',
    }: { method?: string; body?: unknown; cookie?: string; origin?: string } = {},
) {
    const headers: Record<string, string> = {};
    if (body)   headers['Content-Type'] = 'application/json';
    if (cookie) headers['Cookie']       = cookie;
    if (origin) headers['Origin']       = origin;

    return new Request(`https://epitome.zyxwonderland.xyz${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
}

const CTX = {} as ExecutionContext;

// ── Valid session helper ───────────────────────────────────────────────────────

function validSession(userId: string, sessionId: string) {
    return {
        sessionId,
        userId,
        expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
    };
}

// ── Reset mock between tests ──────────────────────────────────────────────────

beforeEach(() => {
    // Default: .get() returns null (no session) → most routes return 401
    // Override per-test with mockGetDb() for authenticated scenarios.
    (getDb as AnyFn).mockReturnValue(makeDb({ single: null }));
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/health
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
    it('returns 200 with ok:true and a timestamp', async () => {
        const res = await worker.fetch(req('/api/health'), makeEnv() as unknown as Bindings, CTX);
        expect(res.status).toBe(200);
        const body = await res.json() as { ok: boolean; ts: string };
        expect(body.ok).toBe(true);
        expect(typeof body.ts).toBe('string');
    });

    it('returns JSON content-type', async () => {
        const res = await worker.fetch(req('/api/health'), makeEnv() as unknown as Bindings, CTX);
        expect(res.headers.get('Content-Type')).toMatch(/application\/json/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

describe('CORS', () => {
    it('reflects the canonical Epitome origin in ACAO header', async () => {
        const res = await worker.fetch(
            req('/api/health', { origin: 'https://epitome.zyxwonderland.xyz' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://epitome.zyxwonderland.xyz');
    });

    it('reflects localhost:5173 in ACAO header (dev)', async () => {
        const res = await worker.fetch(
            req('/api/health', { origin: 'http://localhost:5173' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('returns empty or null ACAO for disallowed origins', async () => {
        const res = await worker.fetch(
            req('/api/health', { origin: 'https://evil.example.com' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        const acao = res.headers.get('Access-Control-Allow-Origin');
        expect(acao === null || acao === '').toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/auth — signup validation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup — input validation', () => {
    it('returns 400 when body is missing entirely', async () => {
        const res = await worker.fetch(
            new Request('https://epitome.zyxwonderland.xyz/api/auth/signup', { method: 'POST' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 400 when username is too short (< 2 chars)', async () => {
        mockGetDb(makeDb());
        const res = await worker.fetch(
            req('/api/auth/signup', { method: 'POST', body: { username: 'x', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short (< 8 chars)', async () => {
        const res = await worker.fetch(
            req('/api/auth/signup', { method: 'POST', body: { username: 'validuser', password: 'short' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 400 when username contains disallowed characters (space, !)', async () => {
        const res = await worker.fetch(
            req('/api/auth/signup', { method: 'POST', body: { username: 'bad user!', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/auth/signup — DB-level behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/signup — DB paths', () => {
    it('returns 409 when a user with that username already exists', async () => {
        // SELECT users → existing user found
        const existingUser = { userId: 'uid-1', username: 'takenname', passwordHash: 'x:y', isActive: true, createdAt: '' };
        mockGetDb(makeDb({ single: existingUser }));

        const res = await worker.fetch(
            req('/api/auth/signup', { method: 'POST', body: { username: 'takenname', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(409);
        const body = await res.json() as { error: string };
        expect(body.error).toMatch(/taken/i);
    });

    it('returns 201 and sets a session cookie on successful registration', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();

        // Need independent query stubs for: SELECT user (null), INSERT user, INSERT session
        // We accomplish this by returning a "sequenced" db where each .get()/.returning() call
        // returns the next item in a sequence.
        const newUser    = { userId, username: 'newwriter', passwordHash: 'hash', isActive: true, createdAt: '' };
        const newSession = { sessionId, userId, expiresAt: new Date(Date.now() + 3600000).toISOString(), createdAt: '' };

        let callIdx = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete','limit','offset']) {
            q[m] = vi.fn().mockReturnValue(q);
        }
        q['all']       = vi.fn().mockResolvedValue([]);
        q['run']       = vi.fn().mockResolvedValue({ rowsAffected: 1 });
        q['get']       = vi.fn().mockImplementation(() => Promise.resolve(null)); // no existing user
        q['returning'] = vi.fn().mockImplementation(() => {
            callIdx++;
            if (callIdx === 1) return Promise.resolve([newUser]);    // INSERT user
            return Promise.resolve([newSession]);                     // INSERT session
        });

        const db = { select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) };
        mockGetDb(db as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req('/api/auth/signup', { method: 'POST', body: { username: 'newwriter', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(201);
        expect(res.headers.get('Set-Cookie')).toMatch(/ep_session/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/auth/login — 401 paths
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login — 401 paths', () => {
    it('returns 400 when body is missing', async () => {
        const res = await worker.fetch(
            new Request('https://epitome.zyxwonderland.xyz/api/auth/login', { method: 'POST' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 401 when user does not exist', async () => {
        mockGetDb(makeDb({ single: null }));
        const res = await worker.fetch(
            req('/api/auth/login', { method: 'POST', body: { username: 'nobody', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(401);
    });

    it('returns 401 when user account is inactive', async () => {
        const inactiveUser = { userId: 'uid-2', username: 'frozen', passwordHash: 'x:y', isActive: false, createdAt: '' };
        mockGetDb(makeDb({ single: inactiveUser }));
        const res = await worker.fetch(
            req('/api/auth/login', { method: 'POST', body: { username: 'frozen', password: 'password123' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware — unauthenticated access
// ─────────────────────────────────────────────────────────────────────────────

describe('auth-protected routes — no session cookie', () => {
    const CASES = [
        ['GET',  '/api/projects'],
        ['POST', '/api/projects'],
        ['GET',  '/api/projects/stats'],
        ['GET',  '/api/chapters'],
        ['GET',  '/api/series'],
    ] as const;

    for (const [method, path] of CASES) {
        it(`${method} ${path} returns 401`, async () => {
            // Session query returns null — no valid session
            mockGetDb(makeDb({ single: null }));
            const res = await worker.fetch(req(path, { method }), makeEnv() as unknown as Bindings, CTX);
            expect(res.status).toBe(401);
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth middleware — expired session
// ─────────────────────────────────────────────────────────────────────────────

describe('auth-protected routes — expired session', () => {
    it('returns 401 when session is past its expiresAt', async () => {
        const expiredSession = {
            sessionId: 'expired-sid',
            userId:    'uid-x',
            expiresAt: new Date(Date.now() - 5000).toISOString(), // 5 sec in past
            createdAt: new Date().toISOString(),
        };
        mockGetDb(makeDb({ single: expiredSession }));

        const res = await worker.fetch(
            req('/api/projects', { cookie: 'ep_session=expired-sid' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
    it('returns 401 without a session cookie', async () => {
        mockGetDb(makeDb({ single: null }));
        const res = await worker.fetch(req('/api/auth/me'), makeEnv() as unknown as Bindings, CTX);
        expect(res.status).toBe(401);
    });

    it('returns 200 with user data when session is valid', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        const user      = { userId, username: 'thewriter', createdAt: new Date().toISOString() };

        // First .get() → session; second .get() → user
        let callCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) {
            q[m] = vi.fn().mockReturnValue(q);
        }
        q['all']       = vi.fn().mockResolvedValue([]);
        q['returning'] = vi.fn().mockResolvedValue([]);
        q['run']       = vi.fn().mockResolvedValue({});
        q['get']       = vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve(callCount === 1 ? session : user);
        });

        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req('/api/auth/me', { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(200);
        const body = await res.json() as { username: string };
        expect(body.username).toBe('thewriter');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
    it('returns 401 without a session cookie', async () => {
        mockGetDb(makeDb({ single: null }));
        const res = await worker.fetch(
            req('/api/auth/logout', { method: 'POST' }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(401);
    });

    it('returns 200 and clears the cookie when authenticated', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);

        mockGetDb(makeDb({ single: session }));

        const res = await worker.fetch(
            req('/api/auth/logout', { method: 'POST', cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(200);
        const body = await res.json() as { ok: boolean };
        expect(body.ok).toBe(true);
        const setCookie = res.headers.get('Set-Cookie') ?? '';
        expect(setCookie.toLowerCase()).toMatch(/ep_session/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/projects — authenticated', () => {
    it('returns 200 with an empty array when user has no projects', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) {
            q[m] = vi.fn().mockReturnValue(q);
        }
        q['returning'] = vi.fn().mockResolvedValue([]);
        q['run']       = vi.fn().mockResolvedValue({});
        q['all']       = vi.fn().mockResolvedValue([]);
        q['get']       = vi.fn().mockImplementation(() => {
            getCount++;
            return Promise.resolve(getCount === 1 ? session : null);
        });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req('/api/projects', { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/projects — validation
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/projects — validation', () => {
    it('returns 400 when title is absent', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        mockGetDb(makeDb({ single: session }));

        const res = await worker.fetch(
            req('/api/projects', { method: 'POST', cookie: `ep_session=${sessionId}`, body: { type: 'novel' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 400 when project type is not in the allowed enum', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        mockGetDb(makeDb({ single: session }));

        const res = await worker.fetch(
            req('/api/projects', { method: 'POST', cookie: `ep_session=${sessionId}`, body: { title: 'A Book', type: 'screenplay' } }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });

    it('returns 201 with project data when request is fully valid', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const projectId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);

        const newProject = {
            id: projectId, userId,
            title: 'The Velvet Manuscript', type: 'novel', status: 'drafting',
            totalWords: 0, targetWordCount: 50000,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            seriesId: null, seriesNumber: null, genreId: null,
            blurb: null, summary: null, coverKey: null, mainCoverKey: null,
            altCoverKeys: '[]', pubType: null,
        };

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) {
            q[m] = vi.fn().mockReturnValue(q);
        }
        q['all']       = vi.fn().mockResolvedValue([]);
        q['run']       = vi.fn().mockResolvedValue({});
        q['get']       = vi.fn().mockImplementation(() => {
            getCount++;
            return Promise.resolve(getCount === 1 ? session : null);
        });
        q['returning'] = vi.fn().mockResolvedValue([newProject]);

        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req('/api/projects', {
                method: 'POST',
                cookie: `ep_session=${sessionId}`,
                body:   { title: 'The Velvet Manuscript', type: 'novel' },
            }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(201);
        const body = await res.json() as { project: { title: string } };
        expect(body.project.title).toBe('The Velvet Manuscript');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/projects/:id — authenticated', () => {
    it('returns 404 when project does not exist', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);

        // First .get() → session; second .get() → null (project not found)
        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(() => { getCount++; return Promise.resolve(getCount === 1 ? session : null); });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${crypto.randomUUID()}`, { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(404);
    });

    it('returns 404 when project belongs to a different user', async () => {
        const userId      = crypto.randomUUID();
        const otherUserId = crypto.randomUUID();
        const sessionId   = crypto.randomUUID();
        const projectId   = crypto.randomUUID();
        const session     = validSession(userId, sessionId);
        const otherProject = { id: projectId, userId: otherUserId, title: 'Not yours' };

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(() => { getCount++; return Promise.resolve(getCount === 1 ? session : otherProject); });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${projectId}`, { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/projects/:id — validation
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH /api/projects/:id — validation', () => {
    it('returns 400 when status value is not in the allowed enum', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        mockGetDb(makeDb({ single: session }));

        const res = await worker.fetch(
            req(`/api/projects/${crypto.randomUUID()}`, {
                method: 'PATCH',
                cookie: `ep_session=${sessionId}`,
                body:   { status: 'NOT_A_REAL_STATUS' },
            }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/projects/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/projects/:id', () => {
    it('returns 204 when project is owned by user and deleted', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const projectId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        const project   = { id: projectId, userId, title: 'To Delete', type: 'essay', status: 'concept' };

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(() => { getCount++; return Promise.resolve(getCount === 1 ? session : project); });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${projectId}`, { method: 'DELETE', cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(204);
    });

    it('returns 404 when project belongs to another user', async () => {
        const userId      = crypto.randomUUID();
        const otherUserId = crypto.randomUUID();
        const sessionId   = crypto.randomUUID();
        const projectId   = crypto.randomUUID();
        const session     = validSession(userId, sessionId);
        const otherProject = { id: projectId, userId: otherUserId };

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(() => { getCount++; return Promise.resolve(getCount === 1 ? session : otherProject); });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${projectId}`, { method: 'DELETE', cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chapters (global feed)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/chapters — authenticated', () => {
    it('returns 200 with an array', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);

        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(() => { getCount++; return Promise.resolve(getCount === 1 ? session : null); });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req('/api/chapters', { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects/:pid/chapters
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/projects/:pid/chapters', () => {
    it('returns 404 when project ownership check fails (project not found)', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        const projectId = crypto.randomUUID();

        // Auth middleware is called twice for sub-router routes (once for parent
        // app middleware resolution, once for the sub-router's own use('*',...)).
        // Calls 1 & 2 → session (both auth checks pass); call 3 → null (project not found).
        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(async () => {
            const count = ++getCount;
            return count <= 2 ? session : null;
        });
        const db = { select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) };
        (getDb as AnyFn).mockReturnValue(db);

        const res = await worker.fetch(
            req(`/api/projects/${projectId}/chapters`, { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(404);
    });

    it('returns 200 with empty array when project has no chapters', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const projectId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        const project   = { id: projectId, userId };

        // Calls 1 & 2 → session (double auth), call 3 → project (ownership check)
        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(async () => {
            const count = ++getCount;
            return count <= 2 ? session : project;
        });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${projectId}/chapters`, { cookie: `ep_session=${sessionId}` }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/projects/:pid/chapters/:id — validation
// ─────────────────────────────────────────────────────────────────────────────

describe('PATCH chapter — validation', () => {
    it('returns 400 when title is an integer (wrong type)', async () => {
        const userId    = crypto.randomUUID();
        const sessionId = crypto.randomUUID();
        const session   = validSession(userId, sessionId);
        // Validation happens BEFORE auth lookup completes — zValidator runs first
        // For the PATCH endpoint on chapters, zValidator is applied after auth.
        // With double-auth, need session for calls 1 & 2.
        let getCount = 0;
        const q: Record<string, AnyFn> = {};
        for (const m of ['select','from','where','orderBy','insert','values','update','set','delete']) q[m] = vi.fn().mockReturnValue(q);
        q['all'] = vi.fn().mockResolvedValue([]); q['returning'] = vi.fn().mockResolvedValue([]); q['run'] = vi.fn().mockResolvedValue({});
        q['get'] = vi.fn().mockImplementation(async () => { const c = ++getCount; return c <= 2 ? session : null; });
        mockGetDb({ select: vi.fn().mockReturnValue(q), insert: vi.fn().mockReturnValue(q), update: vi.fn().mockReturnValue(q), delete: vi.fn().mockReturnValue(q) } as unknown as ReturnType<typeof makeDb>);

        const res = await worker.fetch(
            req(`/api/projects/${crypto.randomUUID()}/chapters/${crypto.randomUUID()}`, {
                method: 'PATCH',
                cookie: `ep_session=${sessionId}`,
                body:   { title: 42 },
            }),
            makeEnv() as unknown as Bindings, CTX,
        );
        expect(res.status).toBe(400);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

describe('Error handling', () => {
    it('returns 404 JSON for unknown API routes', async () => {
        const res = await worker.fetch(req('/api/does-not-exist'), makeEnv() as unknown as Bindings, CTX);
        expect(res.status).toBe(404);
        const body = await res.json() as { error: string };
        expect(body).toHaveProperty('error');
    });

    it('falls through to ASSETS binding for non-API paths', async () => {
        const env = makeEnv();
        await worker.fetch(req('/some-spa-page'), env as unknown as Bindings, CTX);
        expect((env.ASSETS as { fetch: ReturnType<typeof vi.fn> }).fetch).toHaveBeenCalled();
    });

    it('returns 500 JSON when ASSETS binding throws', async () => {
        const env = makeEnv({
            ASSETS: { fetch: vi.fn().mockRejectedValue(new Error('asset failure')) },
        });
        const res = await worker.fetch(req('/some-page'), env as unknown as Bindings, CTX);
        expect(res.status).toBe(500);
        const body = await res.json() as { error: string };
        expect(body).toHaveProperty('error');
    });
});
