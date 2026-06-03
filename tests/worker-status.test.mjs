import { jest } from '@jest/globals';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSqlMock() {
    const _calls = [];
    const _preparedRuns = [];
    const mock = {
        exec:    jest.fn((...args) => { _calls.push(args); return []; }),
        prepare: jest.fn(() => ({ run: jest.fn((...a) => _preparedRuns.push(a)) })),
        _calls,
        _preparedRuns,
    };
    return mock;
}

function makeDOState() {
    const sql = makeSqlMock();
    return {
        storage: {
            sql,
            get:    jest.fn(),
            put:    jest.fn(),
            delete: jest.fn(),
        },
        blockConcurrencyWhile: jest.fn(async fn => fn()),
        _sql: sql,
    };
}

const SERVICES = [
    { id: 'gateway', label: 'Gateway', url: 'https://api.zyxwonderland.xyz/api/hello' },
    { id: 'collab',  label: 'Collab',  url: 'https://collab.zyxwonderland.xyz/api/session' },
];

function makeStatusEnv(doStubFetch) {
    const stub = { fetch: doStubFetch ?? jest.fn(async () => new Response('ok')) };
    return {
        STATUS_DO: {
            idFromName: jest.fn(() => 'id'),
            get:        jest.fn(() => stub),
        },
        SERVICES:       JSON.stringify(SERVICES),
        RETENTION_DAYS: '90',
        _stub:          stub,
    };
}

const { default: statusWorker } = await import('../status/worker/src/index.js');
const { StatusDO }              = await import('../status/worker/src/index.js');

// ── Status worker fetch tests ─────────────────────────────────────────────────

describe('status worker', () => {

    test('OPTIONS returns 204 with CORS headers', async () => {
        const req = new Request('https://status.zyxwonderland.xyz/api/status', { method: 'OPTIONS' });
        const res = await statusWorker.fetch(req, makeStatusEnv());
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('GET /api/status proxies to DO /current', async () => {
        const mockData = [{ id: 'gateway', ok: true, latency: 45, ts: Date.now(), uptime: 100 }];
        const stubFetch = jest.fn(async req => {
            const url = new URL(req.url);
            if (url.pathname === '/current') {
                return Response.json(mockData);
            }
            return new Response('not found', { status: 404 });
        });
        const env = makeStatusEnv(stubFetch);
        const req = new Request('https://status.zyxwonderland.xyz/api/status');
        const res = await statusWorker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].id).toBe('gateway');
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('/api/status passes services list in query param', async () => {
        const captured = [];
        const stubFetch = jest.fn(async req => {
            captured.push(new URL(req.url));
            return Response.json([]);
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.fetch(new Request('https://status.zyxwonderland.xyz/api/status'), env);
        const url = captured[0];
        expect(url.pathname).toBe('/current');
        const services = JSON.parse(decodeURIComponent(url.searchParams.get('services')));
        expect(services).toHaveLength(2);
        expect(services[0].id).toBe('gateway');
    });

    test('/api/sparkline with unknown svc returns 400', async () => {
        const env = makeStatusEnv();
        const req = new Request('https://status.zyxwonderland.xyz/api/sparkline?svc=unknown&n=10');
        const res = await statusWorker.fetch(req, env);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Unknown service id');
    });

    test('/api/sparkline with valid svc proxies to DO', async () => {
        const mockSparkline = [{ ok: true, ts: Date.now() }];
        const stubFetch = jest.fn(async req => {
            const url = new URL(req.url);
            if (url.pathname === '/sparkline') return Response.json(mockSparkline);
            return new Response('not found', { status: 404 });
        });
        const env = makeStatusEnv(stubFetch);
        const req = new Request('https://status.zyxwonderland.xyz/api/sparkline?svc=gateway&n=30');
        const res = await statusWorker.fetch(req, env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('/api/sparkline n is clamped to [1, 360]', async () => {
        const captured = [];
        const stubFetch = jest.fn(async req => {
            captured.push(new URL(req.url));
            return Response.json([]);
        });
        const env = makeStatusEnv(stubFetch);
        // n too large
        await statusWorker.fetch(
            new Request('https://status.zyxwonderland.xyz/api/sparkline?svc=gateway&n=9999'), env
        );
        expect(Number(captured[0].searchParams.get('n'))).toBe(360);
        // n too small
        await statusWorker.fetch(
            new Request('https://status.zyxwonderland.xyz/api/sparkline?svc=gateway&n=0'), env
        );
        expect(Number(captured[1].searchParams.get('n'))).toBe(1);
    });

    test('/api/sparkline defaults n to 90 when not provided', async () => {
        const captured = [];
        const stubFetch = jest.fn(async req => {
            captured.push(new URL(req.url));
            return Response.json([]);
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.fetch(
            new Request('https://status.zyxwonderland.xyz/api/sparkline?svc=gateway'), env
        );
        expect(Number(captured[0].searchParams.get('n'))).toBe(90);
    });

    test('unknown path returns 404', async () => {
        const env = makeStatusEnv();
        const req = new Request('https://status.zyxwonderland.xyz/unknown');
        const res = await statusWorker.fetch(req, env);
        expect(res.status).toBe(404);
    });
});

// ── Status worker scheduled tests ────────────────────────────────────────────

describe('status worker scheduled', () => {

    test('scheduled probes all services and records results to DO', async () => {
        const fetched    = [];
        const doRequests = [];
        global.fetch = jest.fn(async url => {
            fetched.push(url);
            return new Response(null, { status: 200 });
        });
        const stubFetch = jest.fn(async req => {
            doRequests.push(req);
            return new Response('ok');
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.scheduled({}, env);
        expect(fetched.length).toBe(2);
        expect(fetched).toContain(SERVICES[0].url);
        expect(fetched).toContain(SERVICES[1].url);
        expect(doRequests.length).toBe(1);
        const doUrl  = new URL(doRequests[0].url);
        expect(doUrl.pathname).toBe('/record');
        const body = await doRequests[0].json();
        expect(body).toHaveLength(2);
        expect(body[0].id).toBe('gateway');
        expect(typeof body[0].ok).toBe('boolean');
        expect(typeof body[0].latency_ms).toBe('number');
    });

    test('scheduled marks service ok=false when probe throws', async () => {
        const doRequests = [];
        global.fetch = jest.fn(async () => { throw new Error('network error'); });
        const stubFetch = jest.fn(async req => {
            doRequests.push(req);
            return new Response('ok');
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.scheduled({}, env);
        const body = await doRequests[0].json();
        expect(body.every(r => r.ok === false)).toBe(true);
    });

    test('scheduled marks service ok=false when probe returns non-ok status', async () => {
        const doRequests = [];
        global.fetch = jest.fn(async () => new Response(null, { status: 503 }));
        const stubFetch = jest.fn(async req => {
            doRequests.push(req);
            return new Response('ok');
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.scheduled({}, env);
        const body = await doRequests[0].json();
        expect(body.every(r => r.ok === false)).toBe(true);
    });

    test('scheduled passes retention param to DO record endpoint', async () => {
        const doRequests = [];
        global.fetch = jest.fn(async () => new Response(null, { status: 200 }));
        const stubFetch = jest.fn(async req => {
            doRequests.push(req);
            return new Response('ok');
        });
        const env = makeStatusEnv(stubFetch);
        await statusWorker.scheduled({}, env);
        const doUrl = new URL(doRequests[0].url);
        expect(doUrl.searchParams.get('retention')).toBe('90');
    });
});

// ── StatusDO tests ─────────────────────────────────────────────────────────────

describe('StatusDO', () => {

    test('constructor creates table via blockConcurrencyWhile', () => {
        const state = makeDOState();
        new StatusDO(state);
        expect(state.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
        expect(state._sql.exec).toHaveBeenCalledTimes(1);
        expect(state._sql.exec.mock.calls[0][0]).toMatch(/CREATE TABLE IF NOT EXISTS checks/);
    });

    test('/record inserts rows and purges old data', async () => {
        const state  = makeDOState();
        const do_    = new StatusDO(state);
        const now    = Date.now();
        const rows   = [
            { id: 'gateway', ok: true,  latency_ms: 42, ts: now },
            { id: 'collab',  ok: false, latency_ms: 0,  ts: now },
        ];
        const req = new Request('https://do/record?retention=90', {
            method: 'POST',
            body:   JSON.stringify(rows),
            headers: { 'Content-Type': 'application/json' },
        });
        const res = await do_.fetch(req);
        expect(res.status).toBe(200);
        expect(state._sql.prepare).toHaveBeenCalledTimes(1);
        const runMock = state._sql.prepare.mock.results[0].value.run;
        expect(runMock).toHaveBeenCalledTimes(2);
        expect(runMock).toHaveBeenCalledWith('gateway', 1, 42, now);
        expect(runMock).toHaveBeenCalledWith('collab',  0, 0,  now);
        const deleteCall = state._sql.exec.mock.calls.find(c => c[0].includes('DELETE FROM checks'));
        expect(deleteCall).toBeDefined();
    });

    test('/current returns service status with uptime', async () => {
        const state = makeDOState();
        const now   = Date.now();
        const latestRow = [{ ok: 1, latency_ms: 55, ts: now }];
        const totalRow  = [{ n: 10 }];
        const upRow     = [{ n: 9 }];
        state._sql.exec
            .mockReturnValueOnce([])          // init
            // gateway: latest, total, up
            .mockReturnValueOnce(latestRow)
            .mockReturnValueOnce(totalRow)
            .mockReturnValueOnce(upRow)
            // collab: latest, total, up
            .mockReturnValueOnce([])          // no rows = null
            .mockReturnValueOnce([{ n: 0 }])
            .mockReturnValueOnce([{ n: 0 }]);
        const do_ = new StatusDO(state);
        const services = JSON.stringify(SERVICES);
        const req = new Request(`https://do/current?services=${encodeURIComponent(services)}`);
        const res = await do_.fetch(req);
        const body = await res.json();
        expect(body).toHaveLength(2);
        expect(body[0].id).toBe('gateway');
        expect(body[0].ok).toBe(true);
        expect(body[0].latency).toBe(55);
        expect(body[0].uptime).toBe(90);
        expect(body[1].id).toBe('collab');
        expect(body[1].ok).toBeNull();
        expect(body[1].uptime).toBeNull();
    });

    test('/current handles no checks yet (null latest)', async () => {
        const state = makeDOState();
        state._sql.exec
            .mockReturnValueOnce([])           // init
            .mockReturnValueOnce([])           // no latest
            .mockReturnValueOnce([{ n: 0 }])   // total = 0
            .mockReturnValueOnce([{ n: 0 }]);  // up = 0
        const do_ = new StatusDO(state);
        const req = new Request(`https://do/current?services=${encodeURIComponent(JSON.stringify([SERVICES[0]]))}`);
        const res = await do_.fetch(req);
        const body = await res.json();
        expect(body[0].ok).toBeNull();
        expect(body[0].latency).toBeNull();
        expect(body[0].ts).toBeNull();
        expect(body[0].uptime).toBeNull();
    });

    test('/sparkline returns reversed chronological data', async () => {
        const state = makeDOState();
        // SQL returns DESC: newest first; StatusDO reverses to ASC: oldest first
        const rows  = [
            { ok: 1, ts: 3000 },
            { ok: 0, ts: 2000 },
            { ok: 1, ts: 1000 },
        ];
        state._sql.exec
            .mockReturnValueOnce([])    // init
            .mockReturnValueOnce(rows);
        const do_ = new StatusDO(state);
        const res = await do_.fetch(new Request('https://do/sparkline?svc=gateway&n=90'));
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        // After reverse: ts=1000 first (ok=1→true), ts=2000 second (ok=0→false), ts=3000 third (ok=1→true)
        expect(body[0].ts).toBe(1000);
        expect(body[0].ok).toBe(true);
        expect(body[1].ok).toBe(false);
        expect(body[2].ok).toBe(true);
    });

    test('/sparkline clamps n to 360', async () => {
        const state = makeDOState();
        state._sql.exec
            .mockReturnValueOnce([])   // init
            .mockReturnValueOnce([]);  // sparkline
        const do_ = new StatusDO(state);
        await do_.fetch(new Request('https://do/sparkline?svc=gateway&n=9999'));
        const sparkCall = state._sql.exec.mock.calls.find(c => c[0].includes('ORDER BY ts DESC LIMIT'));
        expect(sparkCall[2]).toBe(360);
    });

    test('/sparkline maps ok integer to boolean', async () => {
        const state = makeDOState();
        // StatusDO receives rows DESC from SQL, then reverses to ASC
        state._sql.exec
            .mockReturnValueOnce([])
            .mockReturnValueOnce([{ ok: 0, ts: 2000 }, { ok: 1, ts: 1000 }]);
        const do_ = new StatusDO(state);
        const res = await do_.fetch(new Request('https://do/sparkline?svc=gateway&n=90'));
        const body = await res.json();
        expect(typeof body[0].ok).toBe('boolean');
        // After reverse: ts=1000 first (ok=1→true), ts=2000 second (ok=0→false)
        expect(body[0].ok).toBe(true);
        expect(body[1].ok).toBe(false);
    });

    test('unknown path returns 404', async () => {
        const state = makeDOState();
        const do_   = new StatusDO(state);
        const res   = await do_.fetch(new Request('https://do/unknown'));
        expect(res.status).toBe(404);
    });
});
