'use strict';

// RegistryDO — singleton Durable Object that maps bearer token → address.
// Lives at env.REGISTRY.idFromName('registry').
// State is in-memory only; tokens expire naturally with their mailbox.

export class RegistryDO {
    constructor(_state, _env) {
        // token → { address, expiresAt }
        this._tokens = new Map();
    }

    fetch(request) {
        const url = new URL(request.url);

        if (request.method === 'POST' && url.pathname === '/register') {
            return this._register(request);
        }
        if (request.method === 'GET' && url.pathname.startsWith('/lookup/')) {
            const token = decodeURIComponent(url.pathname.slice(8));
            return this._lookup(token);
        }
        if (request.method === 'DELETE' && url.pathname.startsWith('/revoke/')) {
            const token = decodeURIComponent(url.pathname.slice(8));
            return this._revoke(token);
        }
        return new Response('Not Found', { status: 404 });
    }

    async _register(request) {
        const { token, address, expiresAt } = await request.json();
        this._purge();
        this._tokens.set(token, { address, expiresAt });
        return _json({ ok: true });
    }

    _lookup(token) {
        this._purge();
        const entry = this._tokens.get(token);
        if (!entry || Date.now() > entry.expiresAt) {
            this._tokens.delete(token);
            return _json({ address: null });
        }
        return _json({ address: entry.address });
    }

    _revoke(token) {
        this._tokens.delete(token);
        return _json({ ok: true });
    }

    _purge() {
        const now = Date.now();
        for (const [t, v] of this._tokens) {
            if (now > v.expiresAt) this._tokens.delete(t);
        }
    }
}

function _json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
