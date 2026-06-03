import { jest } from '@jest/globals';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(url, { method = 'GET', headers = {}, body } = {}) {
    return new Request(url, { method, headers, body });
}

function makeStub(responses = []) {
    let i = 0;
    return {
        fetch: jest.fn(async () => {
            const r = responses[i++];
            if (r === undefined) return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
            return r;
        }),
    };
}

function rlOk(count = 1, limit = 20) {
    return new Response(JSON.stringify({ allowed: true, count, limit }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

function rlDenied(limit = 5) {
    return new Response(JSON.stringify({ allowed: false, count: limit, limit }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

function makeEnv(overrides = {}) {
    const stub = overrides.stub ?? makeStub([rlOk()]);
    return {
        ANALYTICS: {
            idFromName: jest.fn(() => 'id'),
            get: jest.fn(() => stub),
        },
        API_KEYS: 'key-alpha,key-beta',
        ANON_LIMIT: '5',
        KEY_LIMIT:  '20',
        RETENTION_DAYS: '7',
        ...overrides,
        _stub: stub,
    };
}

const { default: worker } = await import('../gateway/worker/src/index.js');

// ── Worker fetch tests ─────────────────────────────────────────────────────────

describe('gateway worker', () => {

    test('OPTIONS returns 204 with CORS headers', async () => {
        const req = makeRequest('https://api.zyxwonderland.xyz/api/hello', { method: 'OPTIONS' });
        const res = await worker.fetch(req, makeEnv());
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('/analytics/* is proxied to the analytics DO', async () => {
        const stub = makeStub([
            new Response(JSON.stringify({ total: 50 }), { headers: { 'Content-Type': 'application/json' } }),
        ]);
        const env = makeEnv({ stub });
        const req = makeRequest('https://api.zyxwonderland.xyz/analytics/summary');
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.total).toBe(50);
        expect(stub.fetch).toHaveBeenCalledTimes(1);
    });

    test('invalid API key returns 401', async () => {
        const env = makeEnv();
        const req = makeRequest('https://api.zyxwonderland.xyz/api/hello', {
            headers: { 'X-API-Key': 'bad-key' },
        });
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.code).toBe('UNAUTHORIZED');
    });

    test('rate limit exceeded returns 429 with headers', async () => {
        const stub = makeStub([rlDenied(5)]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(429);
        expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
        const body = await res.json();
        expect(body.code).toBe('RATE_LIMITED');
    });

    test('valid API key uses key identity and higher limit', async () => {
        let capturedRLBody = null;
        const stub = {
            fetch: jest.fn(async req => {
                const url = new URL(req.url);
                if (url.pathname === '/rate-check') {
                    capturedRLBody = await req.json();
                    return new Response(JSON.stringify({ allowed: true, count: 1, limit: 20 }), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                // log record (fire-and-forget)
                return new Response('ok');
            }),
        };
        const env = makeEnv({ stub });
        const req = makeRequest('https://api.zyxwonderland.xyz/api/hello', {
            headers: { 'X-API-Key': 'key-alpha' },
        });
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        expect(capturedRLBody).not.toBeNull();
        expect(capturedRLBody.identity).toMatch(/^key:/);
        expect(capturedRLBody.limit).toBe(20);
    });

    test('GET /api/hello returns greeting', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.message).toBe('Hello from the gateway!');
        expect(typeof body.ts).toBe('number');
    });

    test('GET /api/time returns time fields', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/time');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(typeof body.unix).toBe('number');
        expect(body.tz).toBe('UTC');
    });

    test('GET /api/echo strips sensitive headers', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/echo?foo=bar', {
            headers: {
                'X-API-Key':    'key-alpha',
                'Content-Type': 'text/plain',
                'X-Custom':     'ok',
            },
        });
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.headers['x-api-key']).toBeUndefined();
        expect(body.headers['x-custom']).toBe('ok');
        expect(body.params.foo).toBe('bar');
        expect(body.method).toBe('GET');
        expect(body.path).toBe('/api/echo');
    });

    test('POST /api/echo returns body', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/echo', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ hello: 'world' }),
        });
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.method).toBe('POST');
        expect(body.body).toEqual({ hello: 'world' });
    });

    test('POST /api/echo with non-JSON body returns raw string', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/echo', {
            method:  'POST',
            headers: { 'Content-Type': 'text/plain' },
            body:    'not json',
        });
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.body).toBe('not json');
    });

    test('POST /api/echo with oversized content-length returns 413', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/echo', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': '99999' },
            body:    '{}',
        });
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(413);
        const body = await res.json();
        expect(body.code).toBe('PAYLOAD_TOO_LARGE');
    });

    test('POST /api/echo with oversized body returns 413', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const bigBody = 'x'.repeat(65_537);
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/echo', {
            method:  'POST',
            headers: { 'Content-Type': 'text/plain' },
            body:    bigBody,
        });
        const res = await worker.fetch(req, env);
        expect(res.status).toBe(413);
    });

    test('GET /api/fail returns 500', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/fail');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.code).toBe('SIMULATED_FAILURE');
    });

    test('GET /api/slow returns 200', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/slow');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.message).toBe('Slow response');
        expect(typeof body.simulated_delay_ms).toBe('number');
    }, 3000);

    test('unknown route returns 404', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/unknown-route');
        const res  = await worker.fetch(req, env);
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.error).toBe('Route not found');
        expect(body.path).toBe('/api/unknown-route');
    });

    test('rate limit headers are present on successful response', async () => {
        const stub = makeStub([rlOk(3, 5)]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello');
        const res  = await worker.fetch(req, env);
        expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
        expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
    });

    test('CORS headers are present on API response', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello');
        const res  = await worker.fetch(req, env);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('anon request uses CF-Connecting-IP as identity', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello', {
            headers: { 'CF-Connecting-IP': '1.2.3.4' },
        });
        await worker.fetch(req, env);
        const rlCall  = stub.fetch.mock.calls.find(c => c[0].url.includes('rate-check'));
        const rlBody  = JSON.parse(await new Response(rlCall[0].body).text());
        expect(rlBody.identity).toBe('ip:1.2.3.4');
    });

    test('missing CF-Connecting-IP falls back to unknown', async () => {
        const stub = makeStub([rlOk()]);
        const env  = makeEnv({ stub });
        const req  = makeRequest('https://api.zyxwonderland.xyz/api/hello');
        await worker.fetch(req, env);
        const rlCall = stub.fetch.mock.calls.find(c => c[0].url.includes('rate-check'));
        const rlBody = JSON.parse(await new Response(rlCall[0].body).text());
        expect(rlBody.identity).toBe('ip:unknown');
    });
});

// ── AnalyticsDO tests ─────────────────────────────────────────────────────────

const { AnalyticsDO } = await import('../gateway/worker/src/index.js');

function makeAnalyticsState() {
    const queries = [];
    const preparedRuns = [];
    const sql = {
        exec:    jest.fn((...args) => { queries.push(args[0]); return []; }),
        prepare: jest.fn(() => ({ run: jest.fn((...a) => preparedRuns.push(a)) })),
        _queries: queries,
        _runs:    preparedRuns,
    };
    const kv = new Map();
    return {
        storage: {
            sql,
            get:    jest.fn(async k => kv.get(k)),
            put:    jest.fn(async (k, v) => kv.set(k, v)),
            delete: jest.fn(async k => kv.delete(k)),
        },
        blockConcurrencyWhile: jest.fn(async fn => fn()),
        sql,
        kv,
    };
}

describe('AnalyticsDO', () => {

    test('constructor creates table via blockConcurrencyWhile', () => {
        const state = makeAnalyticsState();
        new AnalyticsDO(state);
        expect(state.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
        expect(state.sql.exec).toHaveBeenCalledTimes(1);
        expect(state.sql.exec.mock.calls[0][0]).toMatch(/CREATE TABLE IF NOT EXISTS requests/);
    });

    test('/rate-check allows when under limit', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/rate-check', {
            method: 'POST',
            body:   JSON.stringify({ identity: 'ip:1.2.3.4', limit: 10 }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res  = await do_.fetch(req);
        const body = await res.json();
        expect(body.allowed).toBe(true);
        expect(body.count).toBe(1);
    });

    test('/rate-check denies when at limit', async () => {
        const state = makeAnalyticsState();
        state.storage.get.mockResolvedValue(10);
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/rate-check', {
            method: 'POST',
            body:   JSON.stringify({ identity: 'ip:1.2.3.4', limit: 10 }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res  = await do_.fetch(req);
        const body = await res.json();
        expect(body.allowed).toBe(false);
        expect(body.count).toBe(10);
    });

    test('/rate-check cleans previous minute slot', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/rate-check', {
            method: 'POST',
            body:   JSON.stringify({ identity: 'test-user', limit: 5 }),
            headers: { 'Content-Type': 'application/json' },
        });
        await do_.fetch(req);
        expect(state.storage.delete).toHaveBeenCalledTimes(1);
        const deleteArg = state.storage.delete.mock.calls[0][0];
        expect(deleteArg).toMatch(/^rl:test-user:\d+$/);
    });

    test('/record inserts row and purges old data', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/record?retention=7', {
            method: 'POST',
            body:   JSON.stringify({
                method: 'GET', path: '/api/hello', status: 200,
                latency_ms: 45, key_id: 'abc', ts: Date.now(),
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await do_.fetch(req);
        expect(res.status).toBe(200);
        // INSERT + CREATE TABLE (init) + DELETE (purge)
        expect(state.sql.exec).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO requests'),
            'GET', '/api/hello', 200, 45, 'abc', expect.any(Number)
        );
        expect(state.sql.exec).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM requests'),
            expect.any(Number)
        );
    });

    test('/record caps method, path, status, latency, key_id', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/record?retention=7', {
            method: 'POST',
            body:   JSON.stringify({
                method:     'DELETEOVERLONG',
                path:       '/p'.repeat(200),
                status:     999,
                latency_ms: -1,
                key_id:     'k'.repeat(50),
                ts:         Date.now(),
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        await do_.fetch(req);
        const insertCall = state.sql.exec.mock.calls.find(c => c[0].includes('INSERT'));
        expect(insertCall[1]).toBe('DELETEOVER');  // sliced to 10
        expect(insertCall[3]).toBe(599);           // capped at 599
        expect(insertCall[4]).toBe(0);             // capped at 0
        expect(insertCall[5].length).toBe(32);     // sliced to 32
    });

    test('/record defaults ts to Date.now() when not provided', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/record?retention=7', {
            method: 'POST',
            body:   JSON.stringify({ method: 'GET', path: '/api/hello', status: 200, latency_ms: 10 }),
            headers: { 'Content-Type': 'application/json' },
        });
        const before = Date.now();
        await do_.fetch(req);
        const after = Date.now();
        const insertCall = state.sql.exec.mock.calls.find(c => c[0].includes('INSERT'));
        expect(insertCall[6]).toBeGreaterThanOrEqual(before);
        expect(insertCall[6]).toBeLessThanOrEqual(after);
    });

    test('/summary returns aggregated stats', async () => {
        const state = makeAnalyticsState();
        state.sql.exec
            .mockReturnValueOnce([])                        // init CREATE TABLE
            .mockReturnValueOnce([{ n: 100 }])              // total count
            .mockReturnValueOnce([{ n: 5 }])                // error count
            .mockReturnValueOnce([{ avg: 42.5, peak: 200 }]) // latency
            .mockReturnValueOnce([{ path: '/api/hello', hits: 80 }]) // top paths
            .mockReturnValueOnce([{ n: 3 }]);               // key count
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/summary');
        const res  = await do_.fetch(req);
        const body = await res.json();
        expect(body.total).toBe(100);
        expect(body.errors).toBe(5);
        expect(body.error_rate).toBe(5);
        expect(body.avg_latency).toBe(43);
        expect(body.peak_latency).toBe(200);
        expect(body.key_count).toBe(3);
        expect(body.top_paths).toHaveLength(1);
    });

    test('/summary handles zero total gracefully', async () => {
        const state = makeAnalyticsState();
        state.sql.exec
            .mockReturnValueOnce([])          // init
            .mockReturnValueOnce([{ n: 0 }])  // total
            .mockReturnValueOnce([{ n: 0 }])  // errors
            .mockReturnValueOnce([{}])         // latency (no avg/peak)
            .mockReturnValueOnce([])           // top paths
            .mockReturnValueOnce([{ n: 0 }]); // key count
        const do_  = new AnalyticsDO(state);
        const res  = await do_.fetch(new Request('https://do/summary'));
        const body = await res.json();
        expect(body.error_rate).toBe(0);
        expect(body.avg_latency).toBe(0);
    });

    test('/timeseries returns bucketed rows', async () => {
        const state = makeAnalyticsState();
        const mockRows = [{ bucket: 1748000, total: 10, errors: 1 }];
        state.sql.exec
            .mockReturnValueOnce([])        // init
            .mockReturnValueOnce(mockRows); // timeseries
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/timeseries?hours=24');
        const res  = await do_.fetch(req);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].total).toBe(10);
    });

    test('/timeseries clamps hours to 168', async () => {
        const state = makeAnalyticsState();
        state.sql.exec
            .mockReturnValueOnce([])   // init
            .mockReturnValueOnce([]);  // timeseries
        const do_  = new AnalyticsDO(state);
        await do_.fetch(new Request('https://do/timeseries?hours=9999'));
        const tsCall = state.sql.exec.mock.calls.find(c => c[0].includes('GROUP BY bucket'));
        expect(tsCall).toBeDefined();
    });

    test('/recent returns latest rows', async () => {
        const state = makeAnalyticsState();
        const mockRows = [{ method: 'GET', path: '/api/hello', status: 200, latency_ms: 30, key_id: '', ts: 1748000 }];
        state.sql.exec
            .mockReturnValueOnce([])        // init
            .mockReturnValueOnce(mockRows); // recent
        const do_  = new AnalyticsDO(state);
        const req  = new Request('https://do/recent?n=10');
        const res  = await do_.fetch(req);
        const body = await res.json();
        expect(body).toHaveLength(1);
        expect(body[0].path).toBe('/api/hello');
    });

    test('/recent clamps n to 100', async () => {
        const state = makeAnalyticsState();
        state.sql.exec
            .mockReturnValueOnce([])   // init
            .mockReturnValueOnce([]);  // recent
        const do_  = new AnalyticsDO(state);
        await do_.fetch(new Request('https://do/recent?n=9999'));
        const recentCall = state.sql.exec.mock.calls.find(c => c[0].includes('ORDER BY ts DESC LIMIT'));
        expect(recentCall[1]).toBe(100);
    });

    test('unknown path returns 404', async () => {
        const state = makeAnalyticsState();
        const do_  = new AnalyticsDO(state);
        const res  = await do_.fetch(new Request('https://do/unknown'));
        expect(res.status).toBe(404);
    });
});
