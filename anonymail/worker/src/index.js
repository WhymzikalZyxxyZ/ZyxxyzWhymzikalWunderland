'use strict';

import PostalMime         from 'postal-mime';
import { MailboxDO }      from './mailbox-do.js';
import { RegistryDO }     from './registry-do.js';
import { generateAddress } from './address.js';
import { randomHex }      from './crypto.js';

export { MailboxDO, RegistryDO };

// ── Security headers injected on every response ───────────────────────────────
const SEC_HEADERS = {
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'Referrer-Policy':           'no-referrer',
    'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' ws: wss:; " +
        "img-src 'self' data: blob:; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'; " +
        "frame-src 'self';",
};

function addSecHeaders(response) {
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(SEC_HEADERS)) r.headers.set(k, v);
    return r;
}

// ── Per-IP rate limiter (in-memory, scoped to each isolate instance) ──────────
const _ipLimits = new Map();

function _ipAllow(ip, maxReqs = 120, windowMs = 60_000) {
    const now = Date.now();
    const e   = _ipLimits.get(ip);
    if (!e || now > e.reset) {
        _ipLimits.set(ip, { count: 1, reset: now + windowMs });
        return true;
    }
    if (e.count >= maxReqs) return false;
    e.count++;
    return true;
}

// Stricter limit for mailbox creation
function _ipAllowCreate(ip) { return _ipAllow(ip, 10, 60_000); }

// ── Routing helpers ───────────────────────────────────────────────────────────
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function err(msg, status = 400) { return json({ error: msg }, status); }

function bearer(request) {
    const hdr = request.headers.get('Authorization') || '';
    const m   = hdr.match(/^Bearer\s+(\S+)$/i);
    return m ? m[1] : null;
}

async function resolveMailbox(env, token) {
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
    const reg  = env.REGISTRY.get(env.REGISTRY.idFromName('registry'));
    const res  = await reg.fetch(`http://do/lookup/${encodeURIComponent(token)}`);
    const { address } = await res.json();
    if (!address) return null;
    return env.MAILBOX.get(env.MAILBOX.idFromName(address));
}

// Forward a request to a mailbox DO, rewriting the path
async function fwdToMailbox(doStub, request, newPath, opts = {}) {
    const url     = new URL(request.url);
    url.pathname  = newPath;
    const fwdReq  = new Request(url.toString(), {
        method:  opts.method  || request.method,
        headers: request.headers,
        body:    opts.body !== undefined ? opts.body : request.body,
    });
    return doStub.fetch(fwdReq);
}

// ── Main Worker ───────────────────────────────────────────────────────────────
export default {
    // ── HTTP handler ─────────────────────────────────────────────────────────────
    async fetch(request, env) {
        const url    = new URL(request.url);
        const path   = url.pathname;
        const method = request.method;
        const ip     = request.headers.get('CF-Connecting-IP') || '0.0.0.0';

        // Global rate limit
        if (!_ipAllow(ip)) {
            return addSecHeaders(err('Too many requests — slow down', 429));
        }

        // ── WebSocket upgrade ─────────────────────────────────────────────────
        // Route by ?addr= (email address, not sensitive) so the token is never
        // exposed in the URL. Auth still happens via the first WS message in the DO.
        if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
            const addr = url.searchParams.get('addr');
            if (!addr || addr.length > 320) return addSecHeaders(err('Missing address', 400));
            const mb = env.MAILBOX.get(env.MAILBOX.idFromName(addr.toLowerCase()));
            return mb.fetch(request);
        }

        // ── API routes ────────────────────────────────────────────────────────
        if (!path.startsWith('/api/')) {
            // Static assets are served by the [assets] binding automatically;
            // anything that falls through here is a 404.
            return addSecHeaders(new Response('Not Found', { status: 404 }));
        }

        const apiPath = path.slice(4); // strip /api

        // POST /api/mailbox — create a new mailbox (unauthenticated)
        if (apiPath === '/mailbox' && method === 'POST') {
            if (!_ipAllowCreate(ip)) return addSecHeaders(err('Too many mailbox requests — slow down', 429));

            const domain  = env.DOMAIN    || 'mail.zyxwonderland.xyz';
            const ttlMs   = Math.min(parseInt(env.TTL_MS)      || 3_600_000, 86_400_000);
            const maxMb   = parseInt(env.MAX_MAILBOXES) || 0;

            // Check capacity via registry size (best-effort — registry is in-memory)
            const address = generateAddress(domain);
            const token   = randomHex(32);   // 256-bit bearer token

            const mb  = env.MAILBOX.get(env.MAILBOX.idFromName(address));
            const res = await mb.fetch(new Request('http://do/init', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ address, token, ttlMs }),
            }));
            const { expiresAt } = await res.json();

            // Register token in the registry
            const reg = env.REGISTRY.get(env.REGISTRY.idFromName('registry'));
            await reg.fetch(new Request('http://do/register', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ token, address, expiresAt }),
            }));

            return addSecHeaders(json({ address, token, expiresAt }));
        }

        // All remaining routes require auth
        const token = bearer(request);
        const mb    = await resolveMailbox(env, token);
        if (!mb) return addSecHeaders(err('Invalid or expired session', 401));

        // GET /api/mailbox
        if (apiPath === '/mailbox' && method === 'GET') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/info'));
        }

        // POST /api/mailbox/extend
        if (apiPath === '/mailbox/extend' && method === 'POST') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/extend'));
        }

        // DELETE /api/mailbox
        if (apiPath === '/mailbox' && method === 'DELETE') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/burn'));
        }

        // GET /api/qr
        if (apiPath === '/qr' && method === 'GET') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/qr'));
        }

        // /api/box/* routes
        if (apiPath.startsWith('/box/')) {
            const sub = apiPath.slice(4); // /box/...
            return addSecHeaders(await fwdToMailbox(mb, request, sub));
        }

        // /api/draft and /api/draft/:id
        if (apiPath === '/draft' && method === 'POST') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/draft'));
        }
        if (apiPath.startsWith('/draft/') && method === 'PUT') {
            return addSecHeaders(await fwdToMailbox(mb, request, apiPath.slice(4)));
        }

        // POST /api/send
        if (apiPath === '/send' && method === 'POST') {
            return addSecHeaders(await fwdToMailbox(mb, request, '/send'));
        }

        return addSecHeaders(err('Not Found', 404));
    },

    // ── Inbound email handler (Cloudflare Email Routing) ─────────────────────
    async email(message, env) {
        const to = (message.to || '').toLowerCase();

        // Parse the raw email stream
        const raw    = await new Response(message.raw).arrayBuffer();
        const parser = new PostalMime();
        const parsed = await parser.parse(raw);

        const attachments = (parsed.attachments || []).map(a => {
            // Convert Uint8Array to base64 for JSON serialisation
            const b64 = btoa(String.fromCharCode(...a.content));
            return {
                filename:    a.filename   || 'attachment',
                contentType: a.mimeType   || 'application/octet-stream',
                size:        a.content.byteLength,
                data:        b64,
            };
        });

        const payload = {
            from:        parsed.from?.address || message.from,
            to,
            cc:          (parsed.cc || []).map(x => x.address).join(', '),
            subject:     parsed.subject || '(no subject)',
            body:        parsed.text    || '',
            bodyHtml:    parsed.html    || null,
            attachments,
        };

        const mb  = env.MAILBOX.get(env.MAILBOX.idFromName(to));
        const res = await mb.fetch(new Request('http://do/deliver', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        }));

        if (!res.ok) {
            // Unknown address — reject so the sending MTA gets a bounce
            message.setReject('Mailbox not found');
        }
    },
};
