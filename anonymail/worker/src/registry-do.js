'use strict';

// RegistryDO — singleton Durable Object that maps bearer token → address.
// Lives at env.REGISTRY.idFromName('registry').
// Persists token→{address,expiresAt} to durable storage so sessions survive
// isolate eviction (previously in-memory only, causing unexpected 401s).
// Also enforces the global mailbox capacity limit (MAX_MAILBOXES).

const DEFAULT_MAX = 500;

export class RegistryDO {
    constructor(state, env) {
        this.state   = state;
        // token → { address, expiresAt }
        this._tokens = new Map();
        this._max    = parseInt((env || {}).MAX_MAILBOXES) || DEFAULT_MAX;

        // Restore all persisted tokens before handling any request.
        // blockConcurrencyWhile queues incoming fetches until init finishes.
        this.state.blockConcurrencyWhile(async () => {
            const now     = Date.now();
            const entries = await this.state.storage.list();
            const expired = [];
            for (const [token, entry] of entries) {
                if (now <= entry.expiresAt) {
                    this._tokens.set(token, entry);
                } else {
                    expired.push(token);
                }
            }
            if (expired.length) await this.state.storage.delete(expired);
        });
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
        if (request.method === 'GET' && url.pathname === '/stats') {
            return this._stats();
        }
        return new Response('Not Found', { status: 404 });
    }

    async _register(request) {
        const { token, address, expiresAt } = await request.json();
        await this._purge();

        // Hard capacity check — enforced atomically in this singleton DO
        if (this._max > 0 && this._tokens.size >= this._max) {
            return _json({ error: 'Mailbox capacity reached — try again later' }, 503);
        }

        const entry = { address, expiresAt };
        this._tokens.set(token, entry);
        await this.state.storage.put(token, entry);
        return _json({ ok: true, active: this._tokens.size });
    }

    async _stats() {
        await this._purge();
        return _json({ active: this._tokens.size, max: this._max });
    }

    async _lookup(token) {
        const entry = this._tokens.get(token);
        if (!entry || Date.now() > entry.expiresAt) {
            this._tokens.delete(token);
            await this.state.storage.delete(token);
            return _json({ address: null });
        }
        return _json({ address: entry.address });
    }

    async _revoke(token) {
        this._tokens.delete(token);
        await this.state.storage.delete(token);
        return _json({ ok: true });
    }

    async _purge() {
        const now     = Date.now();
        const expired = [];
        for (const [t, v] of this._tokens) {
            if (now > v.expiresAt) {
                this._tokens.delete(t);
                expired.push(t);
            }
        }
        if (expired.length) await this.state.storage.delete(expired);
    }
}

function _json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
