'use strict';

const express = require('express');
const busboy  = require('busboy');
const crypto  = require('crypto');
const store   = require('../lib/mailstore');
const sender  = require('../lib/sender');

const router = express.Router();

const BOXES    = new Set(['inbox', 'drafts', 'sent']);
const MAX_FILE = 25 * 1024 * 1024; // 25 MB per attachment

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

// ── Multipart parser (compose / upload) ───────────────────────────────────────
function parseForm(req) {
    return new Promise((resolve, reject) => {
        const fields = Object.create(null);
        const files  = [];

        const bb = busboy({
            headers: req.headers,
            limits:  { fileSize: MAX_FILE, files: 20, fields: 20 },
        });

        bb.on('field', (name, val) => {
            // Only accept safe field names
            if (/^[a-zA-Z0-9_-]{1,64}$/.test(name)) fields[name] = val;
        });

        bb.on('file', (name, stream, info) => {
            const chunks = [];
            stream.on('data', d => chunks.push(d));
            stream.on('close', () => {
                const data = Buffer.concat(chunks);
                if (data.length > 0) {
                    files.push({
                        id:          crypto.randomBytes(12).toString('hex'),
                        filename:    info.filename || 'attachment',
                        contentType: info.mimeType || 'application/octet-stream',
                        size:        data.length,
                        data,
                    });
                }
            });
        });

        bb.on('finish', () => resolve({ fields, files }));
        bb.on('error',  reject);
        req.pipe(bb);
    });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function validateBox(req, res) {
    if (!BOXES.has(req.params.box)) {
        res.status(400).json({ error: 'Invalid mailbox — use inbox, drafts, or sent' });
        return false;
    }
    return true;
}

// ── Mailbox ───────────────────────────────────────────────────────────────────

// Create a new temporary mailbox — no auth required
router.post('/mailbox', (req, res) => {
    const domain = req.app.get('domain');
    const ttl    = Math.min(
        parseInt(process.env.MAILBOX_TTL_MS) || 3600000,
        24 * 60 * 60 * 1000,  // hard cap: 24 h
    );
    const result = store.createMailbox(domain, ttl);
    res.json(result);
});

// Get mailbox metadata
router.get('/mailbox', auth, (req, res) => {
    res.json({ address: req.mb.address, expiresAt: req.mb.expiresAt });
});

// Destroy mailbox immediately
router.delete('/mailbox', auth, (req, res) => {
    // Just clear the boxes — the token/address records will expire naturally
    req.mb.inbox  = [];
    req.mb.drafts = [];
    req.mb.sent   = [];
    res.json({ ok: true });
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
    const ok = store.deleteEmail(req.mb, req.params.box, req.params.id);
    res.json({ ok });
});

// ── Attachment download ────────────────────────────────────────────────────────

router.get('/box/:box/:emailId/attachment/:attachId', auth, (req, res) => {
    if (!validateBox(req, res)) return;
    const att = store.getAttachment(
        req.mb, req.params.box, req.params.emailId, req.params.attachId,
    );
    if (!att) return res.status(404).json({ error: 'Attachment not found' });
    const safe = encodeURIComponent(att.filename);
    res.set('Content-Type', att.contentType);
    res.set('Content-Disposition', `attachment; filename="${safe}"; filename*=UTF-8''${safe}`);
    res.set('X-Content-Type-Options', 'nosniff');
    res.send(att.data);
});

// ── Drafts ────────────────────────────────────────────────────────────────────

router.post('/draft', auth, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);
        const id = store.saveDraft(req.mb, {
            to:          fields.to      || '',
            cc:          fields.cc      || '',
            subject:     fields.subject || '',
            body:        fields.body    || '',
            attachments: files,
        });
        res.json({ id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/draft/:id', auth, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);
        const ok = store.updateDraft(req.mb, req.params.id, {
            to:          fields.to      || '',
            cc:          fields.cc      || '',
            subject:     fields.subject || '',
            body:        fields.body    || '',
            attachments: files,
        });
        if (!ok) return res.status(404).json({ error: 'Draft not found' });
        res.json({ ok });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── Send ──────────────────────────────────────────────────────────────────────

router.post('/send', auth, async (req, res) => {
    try {
        const { fields, files } = await parseForm(req);

        const to      = (fields.to || '').trim();
        const cc      = (fields.cc || '').trim();
        const subject = (fields.subject || '').trim() || '(no subject)';
        const body    = (fields.body    || '').trim();

        if (!to) return res.status(400).json({ error: 'Recipient (To) is required' });

        await sender.sendEmail({
            from:        req.mb.address,
            to, cc, subject, body,
            attachments: files,
        });

        store.pushToSent(req.mb, { to, cc, subject, body, attachments: files });

        // Remove source draft if specified
        if (fields.draftId) store.deleteDraft(req.mb, fields.draftId);

        res.json({ ok: true });
    } catch (err) {
        console.error('[send]', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
