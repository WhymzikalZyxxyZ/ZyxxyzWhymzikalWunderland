'use strict';

import PostalMime         from 'postal-mime';
import { MailboxDO }      from './mailbox-do.js';
import { RegistryDO }     from './registry-do.js';
import { generateAddress } from './address.js';
import { randomHex }      from './crypto.js';

export { MailboxDO, RegistryDO };

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS_ORIGINS = new Set([
    'https://zyxwonderland.xyz',
    'https://www.zyxwonderland.xyz',
]);

function corsHeaders(origin) {
    if (!CORS_ORIGINS.has(origin)) return {};
    return {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age':       '86400',
        'Vary':                         'Origin',
    };
}

// ── Security headers injected on every response ───────────────────────────────
const SEC_HEADERS = {
    'X-Content-Type-Options':    'nosniff',
    'X-Frame-Options':           'DENY',
    'Referrer-Policy':           'no-referrer',
    'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
    // 2 years; includeSubDomains so mail.* inherits the policy
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' https://static.cloudflareinsights.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        // 'self' already covers same-origin ws/wss — no need for the broad ws:/wss: wildcards
        "connect-src 'self' https://cloudflareinsights.com; " +
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

// Stricter limit for mailbox creation — bypassed when DEV_RATE_BYPASS=true
function _ipAllowCreate(ip, env) {
    if (env && env.DEV_RATE_BYPASS === 'true') return true;
    return _ipAllow(ip, 10, 60_000);
}

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

// ── Observability ─────────────────────────────────────────────────────────────
const WORKER_VERSION = '1.0.0';

function newRequestId() {
    // 8-byte hex request ID for log correlation
    return randomHex(8);
}

function log(level, requestId, event, fields = {}) {
    console.log(JSON.stringify({ level, requestId, event, ts: Date.now(), ...fields }));
}

// ── Core request handler (extracted for testability and error wrapping) ───────
async function _handleRequest(request, env, url, path, method, ip, requestId) {
    // Global rate limit
    if (!_ipAllow(ip)) {
        log('warn', requestId, 'rate_limit.global', { ip: ip.slice(0, 8) + '…' });
        return addSecHeaders(err('Too many requests — slow down', 429));
    }

    // ── Health check ──────────────────────────────────────────────────────────
    if (path === '/health' && method === 'GET') {
        let mailboxStats = {};
        try {
            const reg = env.REGISTRY.get(env.REGISTRY.idFromName('registry'));
            const res = await reg.fetch(new Request('http://do/stats'));
            if (res.ok) mailboxStats = await res.json();
        } catch (_) { /* registry unavailable — still return ok */ }
        return addSecHeaders(json({
            status:    'ok',
            version:   WORKER_VERSION,
            timestamp: Date.now(),
            mailboxes: mailboxStats,
        }));
    }

    // ── WebSocket upgrade ─────────────────────────────────────────────────────
    // Route by ?addr= so the token is never exposed in the URL.
    if (path === '/ws' && request.headers.get('Upgrade') === 'websocket') {
        const addr = url.searchParams.get('addr');
        if (!addr || addr.length > 320) return addSecHeaders(err('Missing address', 400));
        const mb = env.MAILBOX.get(env.MAILBOX.idFromName(addr.toLowerCase()));
        return mb.fetch(request);
    }

    // ── API routes ────────────────────────────────────────────────────────────
    if (!path.startsWith('/api/')) {
        return addSecHeaders(new Response('Not Found', { status: 404 }));
    }

    const apiPath = path.slice(4); // strip /api

    // POST /api/mailbox — create a new mailbox (unauthenticated)
    if (apiPath === '/mailbox' && method === 'POST') {
        if (!_ipAllowCreate(ip, env)) {
            log('warn', requestId, 'rate_limit.create', { ip: ip.slice(0, 8) + '…' });
            return addSecHeaders(err('Too many mailbox requests — slow down', 429));
        }

        const domain = env.DOMAIN  || 'mail.zyxwonderland.xyz';
        const ttlMs  = Math.min(parseInt(env.TTL_MS) || 3_600_000, 86_400_000);
        const address = generateAddress(domain);
        const token   = randomHex(32);

        const mb  = env.MAILBOX.get(env.MAILBOX.idFromName(address));
        const res = await mb.fetch(new Request('http://do/init', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ address, token, ttlMs }),
        }));
        const { expiresAt } = await res.json();

        const reg = env.REGISTRY.get(env.REGISTRY.idFromName('registry'));
        const regRes = await reg.fetch(new Request('http://do/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ token, address, expiresAt }),
        }));

        if (!regRes.ok) {
            const { error } = await regRes.json().catch(() => ({ error: 'capacity' }));
            log('warn', requestId, 'mailbox.create.rejected', { reason: error });
            return addSecHeaders(err(error || 'Mailbox capacity reached', 503));
        }

        log('info', requestId, 'mailbox.created', { address, expiresAt });
        return addSecHeaders(json({ address, token, expiresAt }));
    }

    // POST /api/beacon/burn — navigator.sendBeacon cleanup on page unload.
    // sendBeacon can only POST and cannot set custom headers, so the token
    // travels in the JSON body instead of the Authorization header.
    if (apiPath === '/beacon/burn' && method === 'POST') {
        let beaconToken;
        try { ({ token: beaconToken } = await request.json()); } catch { /* malformed */ }
        if (beaconToken && /^[0-9a-f]{64}$/.test(beaconToken)) {
            const mb = await resolveMailbox(env, beaconToken);
            if (mb) {
                await mb.fetch(new Request('http://do/burn', {
                    method:  'DELETE',
                    headers: { Authorization: `Bearer ${beaconToken}` },
                })).catch(() => {});
                const reg = env.REGISTRY.get(env.REGISTRY.idFromName('registry'));
                await reg.fetch(new Request(
                    `http://do/revoke/${encodeURIComponent(beaconToken)}`,
                    { method: 'DELETE' },
                )).catch(() => {});
                log('info', requestId, 'mailbox.beacon_burn', { token: beaconToken.slice(0, 8) + '…' });
            }
        }
        return addSecHeaders(json({ ok: true }));
    }

    // All remaining routes require auth
    const token = bearer(request);
    const mb    = await resolveMailbox(env, token);
    if (!mb) return addSecHeaders(err('Invalid or expired session', 401));

    if (apiPath === '/mailbox' && method === 'GET')
        return addSecHeaders(await fwdToMailbox(mb, request, '/info'));

    if (apiPath === '/mailbox/extend' && method === 'POST')
        return addSecHeaders(await fwdToMailbox(mb, request, '/extend'));

    if (apiPath === '/mailbox' && method === 'DELETE')
        return addSecHeaders(await fwdToMailbox(mb, request, '/burn'));

    if (apiPath === '/qr' && method === 'GET')
        return addSecHeaders(await fwdToMailbox(mb, request, '/qr'));

    if (apiPath.startsWith('/box/'))
        return addSecHeaders(await fwdToMailbox(mb, request, apiPath));

    if (apiPath === '/draft' && method === 'POST')
        return addSecHeaders(await fwdToMailbox(mb, request, '/draft'));

    if (apiPath.startsWith('/draft/') && method === 'PUT')
        return addSecHeaders(await fwdToMailbox(mb, request, apiPath));

    if (apiPath === '/send' && method === 'POST')
        return addSecHeaders(await fwdToMailbox(mb, request, '/send'));

    return addSecHeaders(err('Not Found', 404));
}

// ── Main Worker ───────────────────────────────────────────────────────────────
export default {
    // ── HTTP handler ─────────────────────────────────────────────────────────────
    async fetch(request, env) {
        const requestId = newRequestId();
        const start     = Date.now();
        const url       = new URL(request.url);
        const path      = url.pathname;
        const method    = request.method;
        const ip        = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const origin    = request.headers.get('Origin') || '';

        log('info', requestId, 'request.start', { method, path, ip: ip.slice(0, 8) + '…' });

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(origin) });
        }

        let response;
        try {
            response = await _handleRequest(request, env, url, path, method, ip, requestId);
        } catch (e) {
            log('error', requestId, 'request.error', { error: e.message, stack: e.stack });
            response = addSecHeaders(err('Internal server error', 500));
        }

        const duration = Date.now() - start;
        log('info', requestId, 'request.end', { status: response.status, duration });

        // Attach request ID, timing, and CORS headers to every response
        const r = new Response(response.body, response);
        r.headers.set('X-Request-Id', requestId);
        r.headers.set('X-Response-Time', `${duration}ms`);
        for (const [k, v] of Object.entries(corsHeaders(origin))) r.headers.set(k, v);
        return r;
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
