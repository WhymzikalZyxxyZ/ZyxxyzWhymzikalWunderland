'use strict';

const express  = require('express');
const busboy   = require('busboy');
const crypto   = require('crypto');
const QRCode   = require('qrcode');
const store    = require('../lib/mailstore');
const sender   = require('../lib/sender');

const router = express.Router();

const BOXES    = new Set(['inbox', 'drafts', 'sent']);
const MAX_FILE = 25 * 1024 * 1024; // 25 MB per attachment

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

function validRecipients(str) {
    if (!str) return true;
    return str.split(/[,;]/).map(s => s.trim()).filter(Boolean).every(e => EMAIL_RE.test(e));
}

// MIME types that are never allowed as attachments regardless of claimed type
const BLOCKED_MIMES = new Set([
    'application/x-msdownload', 'application/x-msdos-program',
    'application/x-executable', 'application/x-sh',
    'application/x-bat', 'application/x-com', 'application/x-dosexec',
    'application/vnd.microsoft.portable-executable',
]);

// ── Per-token in-memory rate limiter ──────────────────────────────────────────
const _tokenLimits = new Map();

function tokenRateLimit(maxReqs, windowMs) {
    return (req, res, next) => {
        if (!req.token) return next();
        const now   = Date.now();
        const entry = _tokenLimits.get(req.token);
        if (!entry || now > entry.resetAt) {
            _tokenLimits.set(req.token, { count: 1, resetAt: now + windowMs });
            return next();
        }
        if (entry.count >= maxReqs) {
            return res.status(429).json({ error: 'Rate limit exceeded for this session' });
        }
        entry.count++;
        next();
    };
}

// Clean stale entries every 5 min
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _tokenLimits) if (now > v.resetAt) _tokenLimits.delete(k);
}, 5 * 60 * 1000);

// ── Auth ──────────────────────────────────────────────────────────────────────
function auth(req, res, next) {
    const hdr   = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const mb = store.byToken(token);
    if (!mb)  return res.status(401).json({ error: 'Invalid or expired session' });
    req.mb    = mb;
    req.token = token;
    next();
}

// Per-session: 60 writes per minute
const writeLimit = tokenRateLimit(60, 60_000);

// ── MIME detection ────────────────────────────────────────────────────────────
async function detectAndValidate(files) {
    // file-type is ESM-only (v19+), loaded via dynamic import
    let fileTypeFromBuffer;
    try {
        ({ fileTypeFromBuffer } = await import('file-type'));
    } catch {
        return files; // if unavailable, skip validation
    }

    return Promise.all(files.map(async f => {
        const detected = await fileTypeFromBuffer(f.data);
        if (detected?.mime) f.contentType = detected.mime; // trust magic bytes over header
        if (BLOCKED_MIMES.has(f.contentType)) {
            const err = new Error(`File type not allowed: ${f.filename}`);
            err.status = 415;
            throw err;
        }
        return f;
    }));
}

// ── Multipart parser ──────────────────────────────────────────────────────────
function parseForm(req) {
    return new Promise((resolve, reject) => {
        const fields = Object.create(null);
        const files  = [];
        const bb = busboy({
            headers: req.headers,
            limits:  { fileSize: MAX_FILE, files: 20, fields: 20 },
        });
        bb.on('field', (name, val) => {
            if (/^[a-zA-Z0-9_-]{1,64}$/.test(name)) fields[name] = val;
        });
        bb.on('file', (name, stream, info) => {
            const chunks = [];
            stream.on('data', d => chunks.push(d));
            stream.on('close', () => {
                const data = Buffer.concat(chunks);
                if (data.length > 0) files.push({
                    id:          crypto.randomBytes(12).toString('hex'),
                    filename:    info.filename || 'attachment',
                    contentType: info.mimeType || 'application/octet-stream',
                    size:        data.length,
                    data,
                });
            });
        });
        bb.on('finish', () => resolve({ fields, files }));
        bb.on('error',  reject);
        req.pipe(bb);
    });
}

function validateBox(req, res) {
    if (!BOXES.has(req.params.box)) {
        res.status(400).json({ error: 'Invalid mailbox — use inbox, drafts, or sent' });
        return false;
    }
    return true;
}

// ── Mailbox ───────────────────────────────────────────────────────────────────
router.post('/mailbox', (req, res) => {
    const domain = req.app.get('domain');
    const max    = parseInt(process.env.MAX_MAILBOXES,   10) || 0;
    const ttl    = Math.min(parseInt(process.env.MAILBOX_TTL_MS, 10) || 3_600_000, 86_400_000);
    try {
        res.json(store.createMailbox(domain, ttl, max));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

router.get('/mailbox', auth, (req, res) => {
    res.json({ address: req.mb.address, expiresAt: req.mb.expiresAt });
});

router.post('/mailbox/extend', auth, writeLimit, (req, res) => {
    const extra = Math.min(parseInt(req.body?.extra, 10) || 3_600_000, 3_600_000);
    const expiresAt = store.extendTtl(req.token, extra);
    if (!expiresAt) return res.status(404).json({ error: 'Session not found' });
    res.json({ expiresAt });
});

router.delete('/mailbox', auth, (req, res) => {
    req.mb.inbox = []; req.mb.drafts = []; req.mb.sent = [];
    res.json({ ok: true });
});

// ── QR code ───────────────────────────────────────────────────────────────────
router.get('/qr', auth, async (req, res) => {
    try {
        const dataUrl = await QRCode.toDataURL(req.mb.address, {
            width: 256, margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });
        res.json({ dataUrl, address: req.mb.address });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Email lists ────────────────────────────────────────────────────────────────
router.get('/box/:box', auth, (req, res) => {
    if (!validateBox(req, res)) return;
    res.json(store.getBox(req.mb, req.params.box));
});

// ── Single email ───────────────────────────────────────────────────────────────
router.get('/box/:box/:id', auth, (req, res) => {
    if (!validateBox(req, res)) return;
    const email = store.getEmail(req.mb, req.params.box, req.params.id);
    if (!email) return res.status(404).json({ error: 'Email not found' });
    res.json(email);
});

router.delete('/box/:box/:id', auth, (req, res) => {
    if (!validateBox(req, res)) return;
    res.json({ ok: store.deleteEmail(req.mb, req.params.box, req.params.id) });
});

// ── Attachment ────────────────────────────────────────────────────────────────
router.get('/box/:box/:emailId/attachment/:attachId', auth, (req, res) => {
    if (!validateBox(req, res)) return;
    const att = store.getAttachment(req.mb, req.params.box, req.params.emailId, req.params.attachId);
    if (!att) return res.status(404).json({ error: 'Not found' });
    const safe = encodeURIComponent(att.filename);
    res.set('Content-Type', att.contentType);
    res.set('Content-Disposition', `attachment; filename="${safe}"; filename*=UTF-8''${safe}`);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(att.data);
});

// ── Drafts ────────────────────────────────────────────────────────────────────
router.post('/draft', auth, writeLimit, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);
        const validated = await detectAndValidate(files);
        const id = store.saveDraft(req.mb, {
            to: fields.to || '', cc: fields.cc || '',
            subject: fields.subject || '', body: fields.body || '',
            attachments: validated,
        });
        res.json({ id });
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

router.put('/draft/:id', auth, writeLimit, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);
        const validated = await detectAndValidate(files);
        const ok = store.updateDraft(req.mb, req.params.id, {
            to: fields.to || '', cc: fields.cc || '',
            subject: fields.subject || '', body: fields.body || '',
            attachments: validated,
        });
        if (!ok) return res.status(404).json({ error: 'Draft not found' });
        res.json({ ok });
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

// ── Send ──────────────────────────────────────────────────────────────────────
router.post('/send', auth, writeLimit, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);
        const validated = await detectAndValidate(files);

        const to      = (fields.to      || '').trim();
        const cc      = (fields.cc      || '').trim();
        const subject = (fields.subject || '').trim() || '(no subject)';
        const body    = (fields.body    || '').trim();

        if (!to) return res.status(400).json({ error: 'Recipient (To) is required' });
        if (!validRecipients(to) || !validRecipients(cc)) {
            return res.status(400).json({ error: 'Invalid email address in To or Cc' });
        }

        await sender.sendEmail({ from: req.mb.address, to, cc, subject, body, attachments: validated });
        store.pushToSent(req.mb, { to, cc, subject, body, attachments: validated });
        if (fields.draftId) store.deleteDraft(req.mb, fields.draftId);

        res.json({ ok: true });
    } catch (err) {
        console.error('[send]', err.message);
        res.status(err.status || 500).json({ error: err.message });
    }
});

module.exports = router;
