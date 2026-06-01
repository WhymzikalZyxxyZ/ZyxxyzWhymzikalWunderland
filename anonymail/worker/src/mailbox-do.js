'use strict';

import { generateKey, encrypt, decrypt, encryptBuf, decryptBuf, randomHex } from './crypto.js';

const BOXES       = new Set(['inbox', 'drafts', 'sent']);
const MAX_FILE    = 25 * 1024 * 1024;
const MAX_ATTACH  = 20;
const BLOCKED_MIME = new Set([
    'application/x-msdownload', 'application/x-msdos-program',
    'application/x-executable', 'application/x-sh',
    'application/x-bat', 'application/x-com', 'application/x-dosexec',
    'application/vnd.microsoft.portable-executable',
]);

// ── MailboxDO ─────────────────────────────────────────────────────────────────
// One instance per email address, keyed by env.MAILBOX.idFromName(address).
// All email data lives in memory only — nothing is written to DO storage except
// address, token, expiresAt (so the DO can re-authenticate after eviction).

export class MailboxDO {
    constructor(state, env) {
        this.state = state;
        this.env   = env;

        // Ephemeral — cleared if DO is evicted between requests
        this.key       = null;
        this.address   = null;
        this.token     = null;
        this.expiresAt = null;
        this.inbox     = [];
        this.drafts    = [];
        this.sent      = [];

        // Active WebSocket connections
        this.sockets = new Set();
    }

    // ── Entry point ─────────────────────────────────────────────────────────────
    async fetch(request) {
        const url    = new URL(request.url);
        const path   = url.pathname;
        const method = request.method;

        // Internal: initialise (called once on creation)
        if (method === 'POST' && path === '/init') return this._handleInit(request);

        // Internal: deliver inbound email from email handler
        if (method === 'POST' && path === '/deliver') return this._handleDeliver(request);

        // WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') return this._handleWs(request);

        // All other calls require a valid bearer token
        const token = _bearer(request);
        if (!await this._checkAuth(token)) return _err('Unauthorized', 401);

        if (method === 'GET'    && path === '/info')    return this._info();
        if (method === 'POST'   && path === '/extend')  return this._handleExtend(request);
        if (method === 'DELETE' && path === '/burn')    return this._handleBurn();
        if (method === 'GET'    && path === '/qr')      return this._handleQr();

        const boxMatch   = path.match(/^\/box\/([\w]+)$/);
        const emailMatch = path.match(/^\/box\/([\w]+)\/([\w]+)$/);
        const attMatch   = path.match(/^\/box\/([\w]+)\/([\w]+)\/attachment\/([\w]+)$/);
        const draftMatch = path.match(/^\/draft\/([\w]+)$/);

        if (method === 'GET'    && boxMatch)   return this._listBox(boxMatch[1]);
        if (method === 'GET'    && emailMatch)  return this._getEmail(emailMatch[1], emailMatch[2]);
        if (method === 'DELETE' && emailMatch)  return this._deleteEmail(emailMatch[1], emailMatch[2]);
        if (method === 'GET'    && attMatch)    return this._getAttachment(attMatch[1], attMatch[2], attMatch[3]);
        if (method === 'POST'   && path === '/draft')  return this._saveDraft(request);
        if (method === 'PUT'    && draftMatch)  return this._updateDraft(draftMatch[1], request);
        if (method === 'POST'   && path === '/send')   return this._sendEmail(request);

        return new Response('Not Found', { status: 404 });
    }

    // ── Alarm: mailbox TTL expired ───────────────────────────────────────────────
    async alarm() {
        this._broadcast({ type: 'expired' });
        for (const ws of this.sockets) ws.close(1000, 'Mailbox expired');
        this.sockets.clear();
        await this.state.storage.deleteAll();

        // Revoke token from registry
        if (this.token) {
            const reg = this.env.REGISTRY.get(this.env.REGISTRY.idFromName('registry'));
            await reg.fetch(`http://do/revoke/${encodeURIComponent(this.token)}`, { method: 'DELETE' });
        }
    }

    // ── Initialise ───────────────────────────────────────────────────────────────
    async _handleInit(request) {
        if (this.address) return _err('Already initialized', 409);

        const { address, token, ttlMs } = await request.json();
        const expires = Date.now() + (ttlMs || 3_600_000);

        this.key       = await generateKey();
        this.address   = address;
        this.token     = token;
        this.expiresAt = expires;

        // Minimal persistence so auth survives eviction
        await this.state.storage.put('address',   address);
        await this.state.storage.put('token',     token);
        await this.state.storage.put('expiresAt', expires);
        await this.state.storage.setAlarm(expires);

        // Welcome email
        const domain = this.env.DOMAIN || 'mail.zyxwonderland.xyz';
        await this._pushStored('inbox', {
            from:    `no-reply@${domain}`,
            to:      address,
            cc:      '',
            subject: 'Welcome to Anonymail',
            body:    [
                'Your temporary inbox is ready.',
                '',
                `Address:   ${address}`,
                `Expires:   ${new Date(expires).toUTCString()} (~1 hour)`,
                '',
                'Share this address anywhere. Emails arrive in real time.',
                'Everything is encrypted in memory — nothing is ever written to disk.',
            ].join('\n'),
            bodyHtml:    null,
            attachments: [],
        });

        return _json({ ok: true, expiresAt: expires });
    }

    // ── Deliver inbound email ────────────────────────────────────────────────────
    async _handleDeliver(request) {
        await this._ensureKey();
        if (!this.key) return _err('Mailbox not found', 404);

        const email = await request.json();

        const attachments = await Promise.all((email.attachments || []).map(async a => ({
            id:          randomHex(12),
            filename:    await encrypt(this.key, a.filename || 'attachment'),
            contentType: a.contentType || 'application/octet-stream',
            size:        a.size || 0,
            // Attachment content arrives pre-encoded as base64 from the email handler
            data:        a.data,
        })));

        const stored = {
            id:      randomHex(16),
            from:    await encrypt(this.key, email.from    || ''),
            to:      await encrypt(this.key, email.to      || ''),
            cc:      await encrypt(this.key, email.cc      || ''),
            subject: await encrypt(this.key, email.subject || '(no subject)'),
            body:    await encrypt(this.key, email.body    || ''),
            bodyHtml: email.bodyHtml ? await encrypt(this.key, _sanitize(email.bodyHtml)) : null,
            ts:      Date.now(),
            read:    false,
            attachments,
        };

        this.inbox.unshift(stored);

        this._broadcast({
            type:  'new_email',
            email: {
                id:             stored.id,
                from:           email.from,
                subject:        email.subject,
                ts:             stored.ts,
                hasAttachments: attachments.length > 0,
            },
        });

        return _json({ ok: true });
    }

    // ── WebSocket ────────────────────────────────────────────────────────────────
    async _handleWs(request) {
        const pair   = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        server.accept();

        let authed      = false;
        const authTimer = setTimeout(() => {
            if (!authed) server.close(4001, 'Authentication timeout');
        }, 10_000);

        server.addEventListener('message', async e => {
            let msg;
            try { msg = JSON.parse(e.data); } catch { return; }

            if (!authed) {
                if (msg.type !== 'auth' || !msg.token) {
                    server.close(4001, 'Token required');
                    return;
                }
                await this._ensureKey();
                if (!this.token || msg.token !== this.token) {
                    server.close(4002, 'Invalid or expired session');
                    return;
                }
                clearTimeout(authTimer);
                authed = true;
                this.sockets.add(server);
                server.send(JSON.stringify({
                    type:      'connected',
                    address:   this.address,
                    expiresAt: this.expiresAt,
                }));
                return;
            }

            if (msg.type === 'ping') server.send(JSON.stringify({ type: 'pong' }));
        });

        server.addEventListener('close', () => {
            clearTimeout(authTimer);
            this.sockets.delete(server);
        });

        return new Response(null, { status: 101, webSocket: client });
    }

    // ── Info ─────────────────────────────────────────────────────────────────────
    _info() {
        return _json({ address: this.address, expiresAt: this.expiresAt });
    }

    // ── Extend TTL ───────────────────────────────────────────────────────────────
    async _handleExtend(request) {
        const body  = await request.json().catch(() => ({}));
        const extra = Math.min(parseInt(body.extra) || 3_600_000, 3_600_000);
        const cap   = Date.now() + 24 * 60 * 60 * 1000;
        this.expiresAt = Math.min(this.expiresAt + extra, cap);
        await this.state.storage.put('expiresAt', this.expiresAt);
        await this.state.storage.setAlarm(this.expiresAt);
        this._broadcast({ type: 'extended', expiresAt: this.expiresAt });
        return _json({ expiresAt: this.expiresAt });
    }

    // ── Burn ─────────────────────────────────────────────────────────────────────
    async _handleBurn() {
        this.inbox = []; this.drafts = []; this.sent = [];
        return _json({ ok: true });
    }

    // ── QR code ──────────────────────────────────────────────────────────────────
    async _handleQr() {
        const QRCode  = (await import('qrcode')).default;
        const svg     = await QRCode.toString(this.address, { type: 'svg', width: 256, margin: 2 });
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(svg);
        return _json({ dataUrl, address: this.address });
    }

    // ── List box ─────────────────────────────────────────────────────────────────
    async _listBox(box) {
        if (!BOXES.has(box)) return _err('Invalid mailbox', 400);
        const emails = this[box] || [];
        const result = await Promise.all(emails.map(e => this._expose(e, false)));
        return _json(result);
    }

    // ── Get single email ─────────────────────────────────────────────────────────
    async _getEmail(box, id) {
        if (!BOXES.has(box)) return _err('Invalid mailbox', 400);
        const e = (this[box] || []).find(x => x.id === id);
        if (!e) return _err('Email not found', 404);
        if (box === 'inbox' && !e.read) e.read = true;
        return _json(await this._expose(e, true));
    }

    // ── Delete email ─────────────────────────────────────────────────────────────
    _deleteEmail(box, id) {
        if (!BOXES.has(box)) return _err('Invalid mailbox', 400);
        const before = this[box].length;
        this[box] = this[box].filter(e => e.id !== id);
        return _json({ ok: this[box].length < before });
    }

    // ── Get attachment ───────────────────────────────────────────────────────────
    async _getAttachment(box, emailId, attachId) {
        if (!BOXES.has(box)) return _err('Invalid mailbox', 400);
        const email = (this[box] || []).find(e => e.id === emailId);
        if (!email) return _err('Not found', 404);
        const att = (email.attachments || []).find(a => a.id === attachId);
        if (!att)   return _err('Not found', 404);

        const filename = await decrypt(this.key, att.filename);
        const data     = await decryptBuf(this.key, att.data);
        const safe     = encodeURIComponent(filename);

        return new Response(data, {
            headers: {
                'Content-Type':        att.contentType,
                'Content-Disposition': `attachment; filename="${safe}"; filename*=UTF-8''${safe}`,
                'X-Content-Type-Options': 'nosniff',
            },
        });
    }

    // ── Save draft ───────────────────────────────────────────────────────────────
    async _saveDraft(request) {
        const { fields, files } = await _parseForm(request);
        if (!this._checkFiles(files)) return _err('File type not allowed', 415);

        const id = await this._pushStored('drafts', {
            to: fields.to || '', cc: fields.cc || '',
            subject: fields.subject || '', body: fields.body || '',
            bodyHtml: null, attachments: files,
        });
        return _json({ id });
    }

    // ── Update draft ─────────────────────────────────────────────────────────────
    async _updateDraft(id, request) {
        const { fields, files } = await _parseForm(request);
        if (!this._checkFiles(files)) return _err('File type not allowed', 415);

        const idx = this.drafts.findIndex(d => d.id === id);
        if (idx === -1) return _err('Draft not found', 404);

        this.drafts[idx] = await this._storeRecord('drafts', {
            id,
            to: fields.to || '', cc: fields.cc || '',
            subject: fields.subject || '', body: fields.body || '',
            bodyHtml: null, attachments: files,
        });
        return _json({ ok: true });
    }

    // ── Send email ───────────────────────────────────────────────────────────────
    async _sendEmail(request) {
        if (!this.env.SEND_EMAIL) return _err('Outbound email is not configured on this server', 503);

        const { fields, files } = await _parseForm(request);
        if (!this._checkFiles(files)) return _err('File type not allowed', 415);

        const to      = (fields.to      || '').trim();
        const cc      = (fields.cc      || '').trim();
        const subject = (fields.subject || '').trim() || '(no subject)';
        const body    = (fields.body    || '').trim();

        if (!to) return _err('Recipient (To) is required', 400);

        try {
            const { EmailMessage } = await import('cloudflare:email');
            const raw = _buildMime({ from: this.address, to, cc, subject, body, attachments: files });
            await this.env.SEND_EMAIL.send(new EmailMessage(this.address, to, raw));
        } catch (e) {
            return _err(e.message, 500);
        }

        await this._pushStored('sent', { to, cc, subject, body, bodyHtml: null, attachments: files });

        if (fields.draftId) {
            this.drafts = this.drafts.filter(d => d.id !== fields.draftId);
        }

        return _json({ ok: true });
    }

    // ── Internals ─────────────────────────────────────────────────────────────────

    async _ensureKey() {
        if (this.key) return;
        this.address   = await this.state.storage.get('address');
        this.token     = await this.state.storage.get('token');
        this.expiresAt = await this.state.storage.get('expiresAt');
        if (!this.address || Date.now() > this.expiresAt) return;
        this.key = await generateKey();
    }

    async _checkAuth(token) {
        if (!token) return false;
        if (!this.token) await this._ensureKey();
        return token === this.token;
    }

    // Store a new email-like record into the given box; returns its id.
    async _pushStored(box, email) {
        const stored = await this._storeRecord(box, { ...email, id: randomHex(16) });
        this[box].unshift(stored);
        return stored.id;
    }

    async _storeRecord(box, email) {
        const isInbox = box === 'inbox';
        const attaches = await Promise.all((email.attachments || []).map(async a => {
            let enc;
            if (a.data instanceof Uint8Array || ArrayBuffer.isView(a.data)) {
                enc = await encryptBuf(this.key, a.data);
            } else if (typeof a.data === 'string') {
                // Already encrypted (re-store path)
                enc = a.data;
            } else {
                enc = await encryptBuf(this.key, new Uint8Array(a.data));
            }
            return {
                id:          a.id || randomHex(12),
                filename:    await encrypt(this.key, a.filename || 'attachment'),
                contentType: a.contentType || 'application/octet-stream',
                size:        a.size || 0,
                data:        enc,
            };
        }));

        return {
            id:      email.id,
            from:    await encrypt(this.key, email.from    || (isInbox ? '' : this.address)),
            to:      await encrypt(this.key, email.to      || ''),
            cc:      await encrypt(this.key, email.cc      || ''),
            subject: await encrypt(this.key, email.subject || ''),
            body:    await encrypt(this.key, email.body    || ''),
            bodyHtml: email.bodyHtml ? await encrypt(this.key, _sanitize(email.bodyHtml)) : null,
            ts:      email.ts || Date.now(),
            read:    email.read !== undefined ? email.read : !isInbox,
            attachments: attaches,
        };
    }

    async _expose(stored, full) {
        const e = {
            id:             stored.id,
            from:           await decrypt(this.key, stored.from),
            to:             await decrypt(this.key, stored.to),
            cc:             await decrypt(this.key, stored.cc),
            subject:        await decrypt(this.key, stored.subject),
            ts:             stored.ts,
            read:           stored.read || false,
            hasAttachments: (stored.attachments || []).length > 0,
        };
        if (full) {
            e.body        = await decrypt(this.key, stored.body);
            e.bodyHtml    = stored.bodyHtml ? await decrypt(this.key, stored.bodyHtml) : null;
            e.attachments = await Promise.all((stored.attachments || []).map(async a => ({
                id:          a.id,
                filename:    await decrypt(this.key, a.filename),
                contentType: a.contentType,
                size:        a.size,
            })));
        }
        return e;
    }

    _checkFiles(files) {
        return files.every(f => !BLOCKED_MIME.has(f.contentType));
    }

    _broadcast(msg) {
        const text = JSON.stringify(msg);
        for (const ws of this.sockets) {
            if (ws.readyState === 1) ws.send(text);
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _bearer(request) {
    const hdr = request.headers.get('Authorization') || '';
    const m   = hdr.match(/^Bearer\s+(\S+)$/i);
    return m ? m[1] : null;
}

function _json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function _err(msg, status = 400) {
    return _json({ error: msg }, status);
}

// Parse multipart/form-data using the Web Fetch API
async function _parseForm(request) {
    const ct = request.headers.get('Content-Type') || '';
    if (!ct.includes('multipart/form-data')) {
        const body = await request.json().catch(() => ({}));
        return { fields: body, files: [] };
    }

    const formData = await request.formData();
    const fields   = Object.create(null);
    const files    = [];

    for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
            fields[key] = value;
        } else {
            // File entry
            if (files.length >= MAX_ATTACH) continue;
            const buf = await value.arrayBuffer();
            if (buf.byteLength === 0 || buf.byteLength > MAX_FILE) continue;
            files.push({
                id:          _hex(12),
                filename:    value.name || 'attachment',
                contentType: value.type || 'application/octet-stream',
                size:        buf.byteLength,
                data:        new Uint8Array(buf),
            });
        }
    }

    return { fields, files };
}

function _hex(bytes) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// Strip the most dangerous HTML patterns — iframe sandbox is the primary defence
function _sanitize(html) {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        .replace(/\bhref\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')
        .replace(/\bsrc\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""');
}

// Build a minimal MIME message for outbound sending
function _buildMime({ from, to, cc, subject, body, attachments = [] }) {
    const boundary = 'b' + _hex(16);
    const lines = [
        `From: ${from}`,
        `To: ${to}`,
        cc ? `Cc: ${cc}` : null,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        attachments.length
            ? `Content-Type: multipart/mixed; boundary="${boundary}"`
            : 'Content-Type: text/plain; charset=UTF-8',
        '',
    ].filter(l => l !== null);

    if (!attachments.length) {
        lines.push(body);
        return lines.join('\r\n');
    }

    lines.push(
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        body,
    );

    for (const f of attachments) {
        const b64 = btoa(String.fromCharCode(...(f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data))));
        lines.push(
            `--${boundary}`,
            `Content-Type: ${f.contentType}`,
            `Content-Disposition: attachment; filename="${f.filename}"`,
            'Content-Transfer-Encoding: base64',
            '',
            b64,
        );
    }

    lines.push(`--${boundary}--`);
    return lines.join('\r\n');
}
