'use strict';

const PEER_COLORS    = ['#f43f5e','#fb923c','#facc15','#4ade80','#22d3ee','#a78bfa','#f472b6'];
const MAX_PEERS      = 20;
const MAX_MSG_BYTES  = 512_000;   // 512 KB — hard cap on incoming message size
const MAX_NODES      = 500;
const MAX_EDGES      = 1000;
const STATE_THROTTLE = 100;       // ms between accepted state updates per peer

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

export class SessionDO {
    constructor(state) {
        this.state    = state;
        this.sessions = new Map(); // ws → { peerId, color }
        this.diagram  = { nodes: [], edges: [], nextId: 1 };
        this.colorIdx = 0;
        this.state.blockConcurrencyWhile(() => this.#load());
    }

    async #load() {
        const saved = await this.state.storage.get('diagram');
        if (saved) this.diagram = saved;
    }

    #send(ws, msg) {
        try { ws.send(JSON.stringify(msg)); } catch {}
    }

    #broadcast(msg, exclude = null) {
        for (const [ws] of this.sessions) {
            if (ws !== exclude && ws.readyState === 1) this.#send(ws, msg);
        }
    }

    #broadcastAll(msg) {
        for (const [ws] of this.sessions) {
            if (ws.readyState === 1) this.#send(ws, msg);
        }
    }

    async fetch(request) {
        if (request.headers.get('Upgrade') !== 'websocket') {
            return new Response('expected websocket', { status: 426 });
        }

        if (this.sessions.size >= MAX_PEERS) {
            return new Response('session full', { status: 503 });
        }

        const pair   = new WebSocketPair();
        const [client, server] = Object.values(pair);
        server.accept();

        const peerId       = uid();
        const color        = PEER_COLORS[this.colorIdx++ % PEER_COLORS.length];
        let   lastStateTs  = 0;
        this.sessions.set(server, { peerId, color });

        this.#send(server, { type: 'init', peerId, color, ...this.diagram });
        this.#broadcastAll({ type: 'peers', count: this.sessions.size });

        server.addEventListener('message', async e => {
            // Reject oversized messages before parsing
            if (typeof e.data === 'string' && e.data.length > MAX_MSG_BYTES) return;

            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            if (msg.type === 'state') {
                // Throttle: ignore state updates faster than STATE_THROTTLE ms
                const now = Date.now();
                if (now - lastStateTs < STATE_THROTTLE) return;
                lastStateTs = now;

                const nodes  = (Array.isArray(msg.nodes)  ? msg.nodes  : []).slice(0, MAX_NODES);
                const edges  = (Array.isArray(msg.edges)  ? msg.edges  : []).slice(0, MAX_EDGES);
                const nextId = typeof msg.nextId === 'number' ? msg.nextId : 1;
                this.diagram = { nodes, edges, nextId };
                await this.state.storage.put('diagram', this.diagram);
                this.#broadcast({ type: 'state', ...this.diagram }, server);
            } else if (msg.type === 'cursor') {
                const sess = this.sessions.get(server);
                const x    = typeof msg.x === 'number' ? msg.x : 0;
                const y    = typeof msg.y === 'number' ? msg.y : 0;
                this.#broadcast({ type: 'cursor', peerId: sess.peerId, color: sess.color, x, y }, server);
            }
        });

        const leave = () => {
            this.sessions.delete(server);
            this.#broadcastAll({ type: 'peers', count: this.sessions.size });
        };
        server.addEventListener('close', leave);
        server.addEventListener('error', leave);

        return new Response(null, { status: 101, webSocket: client });
    }
}
