import { jest } from '@jest/globals';

// ── CF Response mock (supports status 101 for WebSocket upgrades) ──────────────

const _NodeResponse = globalThis.Response;

class CFResponse extends _NodeResponse {
    constructor(body, init = {}) {
        const { status = 200, webSocket, ...rest } = init ?? {};
        if (status === 101) {
            super(body, { ...rest, status: 200 });
            Object.defineProperty(this, 'status',    { get: () => 101 });
            Object.defineProperty(this, 'webSocket', { get: () => webSocket ?? null });
        } else {
            super(body, { ...rest, status });
            const _ws = webSocket ?? null;
            Object.defineProperty(this, 'webSocket', { get: () => _ws });
        }
    }
}
// Static methods pass-through
Object.assign(CFResponse, _NodeResponse);
CFResponse.json  = _NodeResponse.json?.bind(_NodeResponse);
CFResponse.error = _NodeResponse.error?.bind(_NodeResponse);
globalThis.Response = CFResponse;

// ── WebSocket mock ─────────────────────────────────────────────────────────────

class MockWebSocket {
    constructor() {
        this.readyState = 0;
        this.sent       = [];
        this._listeners = {};
    }
    accept()                        { this.readyState = 1; }
    send(data)                      { this.sent.push(data); }
    close()                         { this.readyState = 3; }
    addEventListener(type, fn) {
        (this._listeners[type] = this._listeners[type] || []).push(fn);
    }
    _fire(type, event = {}) {
        for (const fn of this._listeners[type] || []) fn(event);
    }
    _messages() { return this.sent.map(s => JSON.parse(s)); }
}

let _lastPair = null;

class WebSocketPair {
    constructor() {
        this[0]   = new MockWebSocket();
        this[1]   = new MockWebSocket();
        _lastPair = this;
    }
}

globalThis.WebSocketPair = WebSocketPair;

function getLastPair() { return _lastPair; }

// ── DO state factory ───────────────────────────────────────────────────────────

function makeDOState(savedDiagram = null) {
    const kv = new Map(savedDiagram ? [['diagram', savedDiagram]] : []);
    return {
        storage: {
            get:    jest.fn(async k => kv.get(k)),
            put:    jest.fn(async (k, v) => kv.set(k, v)),
            delete: jest.fn(async k => kv.delete(k)),
        },
        blockConcurrencyWhile: jest.fn(async fn => fn()),
    };
}

const { SessionDO }             = await import('../collab/worker/src/sessionDO.js');
const { default: collabWorker } = await import('../collab/worker/src/index.js');

// ── Collab worker tests ────────────────────────────────────────────────────────

describe('collab worker', () => {

    test('OPTIONS returns 204 with CORS headers', async () => {
        const req = new Request('https://collab.zyxwonderland.xyz/api/session', { method: 'OPTIONS' });
        const res = await collabWorker.fetch(req, {});
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('POST /api/session returns an id', async () => {
        const req = new Request('https://collab.zyxwonderland.xyz/api/session', { method: 'POST' });
        const res = await collabWorker.fetch(req, {});
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(typeof body.id).toBe('string');
        expect(body.id.length).toBeGreaterThan(0);
    });

    test('GET /ws without session param returns 400', async () => {
        const req = new Request('https://collab.zyxwonderland.xyz/ws');
        const res = await collabWorker.fetch(req, {});
        expect(res.status).toBe(400);
    });

    test('GET /ws without Upgrade header returns 426', async () => {
        const req = new Request('https://collab.zyxwonderland.xyz/ws?session=abc123');
        const res = await collabWorker.fetch(req, {});
        expect(res.status).toBe(426);
    });

    test('GET /ws with valid session delegates to DO stub', async () => {
        const mockStub = { fetch: jest.fn(async () => new _NodeResponse('ok', { status: 200 })) };
        const env = {
            SESSION_DO: {
                idFromName: jest.fn(() => 'id'),
                get:        jest.fn(() => mockStub),
            },
        };
        const req = new Request('https://collab.zyxwonderland.xyz/ws?session=abc123', {
            headers: { Upgrade: 'websocket' },
        });
        await collabWorker.fetch(req, env);
        expect(mockStub.fetch).toHaveBeenCalledTimes(1);
        expect(env.SESSION_DO.idFromName).toHaveBeenCalledWith('abc123');
    });

    test('unknown path returns 404', async () => {
        const req = new Request('https://collab.zyxwonderland.xyz/unknown');
        const res = await collabWorker.fetch(req, {});
        expect(res.status).toBe(404);
    });
});

// ── SessionDO tests ────────────────────────────────────────────────────────────

describe('SessionDO', () => {

    async function openConnection(do_) {
        const req = new Request('https://collab.zyxwonderland.xyz/ws?session=test', {
            headers: { Upgrade: 'websocket' },
        });
        const res = await do_.fetch(req);
        return res;
    }

    test('non-websocket request returns 426', async () => {
        const state = makeDOState();
        const do_   = new SessionDO(state);
        const req   = new Request('https://collab.zyxwonderland.xyz/ws');
        const res   = await do_.fetch(req);
        expect(res.status).toBe(426);
    });

    test('loads saved diagram from storage on construction', async () => {
        const saved = { nodes: [{ id: 1 }], edges: [], nextId: 2 };
        const state = makeDOState(saved);
        const do_   = new SessionDO(state);
        // blockConcurrencyWhile is async in mock; flush microtasks
        await new Promise(r => setTimeout(r, 0));
        expect(state.blockConcurrencyWhile).toHaveBeenCalledTimes(1);
        expect(state.storage.get).toHaveBeenCalledWith('diagram');
        expect(do_.diagram).toEqual(saved);
    });

    test('uses default diagram when storage is empty', async () => {
        const state = makeDOState();
        const do_   = new SessionDO(state);
        await new Promise(r => setTimeout(r, 0));
        expect(do_.diagram).toEqual({ nodes: [], edges: [], nextId: 1 });
    });

    test('new connection returns 101 with webSocket', async () => {
        const state = makeDOState();
        const do_   = new SessionDO(state);
        const res   = await openConnection(do_);
        expect(res.status).toBe(101);
        expect(res.webSocket).toBeDefined();
    });

    test('server sends init message on connect', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        expect(server.sent.length).toBeGreaterThanOrEqual(1);
        const init = JSON.parse(server.sent[0]);
        expect(init.type).toBe('init');
        expect(typeof init.peerId).toBe('string');
        expect(typeof init.color).toBe('string');
        expect(Array.isArray(init.nodes)).toBe(true);
    });

    test('peers count broadcast is sent on connect', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        const peersMsg = server._messages().find(m => m.type === 'peers');
        expect(peersMsg).toBeDefined();
        expect(peersMsg.count).toBe(1);
    });

    test('returns 503 when session is at max peers', async () => {
        const state = makeDOState();
        const do_   = new SessionDO(state);
        const opens = Array.from({ length: 20 }, () => openConnection(do_));
        await Promise.all(opens);
        const res = await openConnection(do_);
        expect(res.status).toBe(503);
    });

    test('state message updates diagram and broadcasts to others', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        server._fire('message', { data: JSON.stringify({ type: 'state', nodes: [{ id: 1 }], edges: [{ id: 'e1' }], nextId: 2 }) });
        await new Promise(r => setTimeout(r, 10));
        expect(state.storage.put).toHaveBeenCalledWith('diagram', {
            nodes: [{ id: 1 }], edges: [{ id: 'e1' }], nextId: 2,
        });
    });

    test('state message clamps nodes and edges to max', async () => {
        const state     = makeDOState();
        const do_       = new SessionDO(state);
        await openConnection(do_);
        const server    = getLastPair()[1];
        const hugeNodes = Array.from({ length: 600 }, (_, i) => ({ id: i }));
        const hugeEdges = Array.from({ length: 1100 }, (_, i) => ({ id: `e${i}` }));
        server._fire('message', { data: JSON.stringify({ type: 'state', nodes: hugeNodes, edges: hugeEdges, nextId: 601 }) });
        await new Promise(r => setTimeout(r, 10));
        expect(do_.diagram.nodes).toHaveLength(500);
        expect(do_.diagram.edges).toHaveLength(1000);
    });

    test('state message defaults non-array nodes/edges to empty arrays', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        server._fire('message', { data: JSON.stringify({ type: 'state', nodes: 'invalid', edges: null, nextId: 'bad' }) });
        await new Promise(r => setTimeout(r, 10));
        expect(do_.diagram.nodes).toEqual([]);
        expect(do_.diagram.edges).toEqual([]);
        expect(do_.diagram.nextId).toBe(1);
    });

    test('state message throttle ignores rapid updates', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        const msg    = JSON.stringify({ type: 'state', nodes: [], edges: [], nextId: 1 });
        server._fire('message', { data: msg });
        server._fire('message', { data: JSON.stringify({ type: 'state', nodes: [{ id: 99 }], edges: [], nextId: 2 }) });
        await new Promise(r => setTimeout(r, 10));
        expect(state.storage.put).toHaveBeenCalledTimes(1);
    });

    test('cursor message broadcasts to other peers', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server1 = getLastPair()[1];
        await openConnection(do_);
        const server2 = getLastPair()[1];
        const before  = server1.sent.length;
        server2._fire('message', { data: JSON.stringify({ type: 'cursor', x: 100, y: 200 }) });
        await new Promise(r => setTimeout(r, 10));
        const newMsgs = server1.sent.slice(before).map(s => JSON.parse(s));
        const cursor  = newMsgs.find(m => m.type === 'cursor');
        expect(cursor).toBeDefined();
        expect(cursor.x).toBe(100);
        expect(cursor.y).toBe(200);
        expect(typeof cursor.peerId).toBe('string');
    });

    test('cursor message defaults x/y to 0 for non-numbers', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server1 = getLastPair()[1];
        await openConnection(do_);
        const server2 = getLastPair()[1];
        const before  = server1.sent.length;
        server2._fire('message', { data: JSON.stringify({ type: 'cursor', x: 'bad', y: null }) });
        await new Promise(r => setTimeout(r, 10));
        const cursor = server1.sent.slice(before).map(s => JSON.parse(s)).find(m => m.type === 'cursor');
        expect(cursor.x).toBe(0);
        expect(cursor.y).toBe(0);
    });

    test('oversized message is rejected without parsing', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        server._fire('message', { data: 'x'.repeat(512_001) });
        await new Promise(r => setTimeout(r, 10));
        expect(state.storage.put).not.toHaveBeenCalled();
    });

    test('invalid JSON message is silently ignored', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        server._fire('message', { data: 'not json{{{{' });
        await new Promise(r => setTimeout(r, 10));
        expect(state.storage.put).not.toHaveBeenCalled();
    });

    test('close event removes peer and updates count', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        expect(do_.sessions.size).toBe(1);
        server._fire('close');
        expect(do_.sessions.size).toBe(0);
    });

    test('error event removes peer', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        await openConnection(do_);
        const server = getLastPair()[1];
        server._fire('error');
        expect(do_.sessions.size).toBe(0);
    });

    test('second peer receives init and peers broadcast', async () => {
        const state = makeDOState();
        const do_   = new SessionDO(state);
        await openConnection(do_);
        await openConnection(do_);
        const server2 = getLastPair()[1];
        const msgs    = server2._messages();
        expect(msgs.find(m => m.type === 'init')).toBeDefined();
        expect(msgs.filter(m => m.type === 'peers').some(m => m.count === 2)).toBe(true);
    });

    test('cycles through peer colors', async () => {
        const state  = makeDOState();
        const do_    = new SessionDO(state);
        const colors = new Set();
        for (let i = 0; i < 7; i++) {
            await openConnection(do_);
            const init = getLastPair()[1]._messages().find(m => m.type === 'init');
            colors.add(init.color);
        }
        expect(colors.size).toBe(7);
    });

    test('state message is not broadcast back to sender', async () => {
        const state   = makeDOState();
        const do_     = new SessionDO(state);
        await openConnection(do_);
        const server1 = getLastPair()[1];
        await openConnection(do_);
        const server2 = getLastPair()[1];

        const before = server1.sent.length;
        const msg    = JSON.stringify({ type: 'state', nodes: [{ id: 5 }], edges: [], nextId: 6 });
        server1._fire('message', { data: msg });
        await new Promise(r => setTimeout(r, 10));

        // server2 should receive the broadcast
        const server2Msgs = server2.sent.map(s => JSON.parse(s)).filter(m => m.type === 'state');
        expect(server2Msgs.length).toBeGreaterThan(0);

        // server1 should NOT receive its own state back
        const server1NewMsgs = server1.sent.slice(before).map(s => JSON.parse(s));
        const stateMsgs      = server1NewMsgs.filter(m => m.type === 'state');
        expect(stateMsgs).toHaveLength(0);
    });
});
