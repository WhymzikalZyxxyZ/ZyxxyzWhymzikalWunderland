'use strict';

const sanitizeHtml = require('sanitize-html');
const { encrypt, encryptBuf, decrypt, decryptBuf, randomHex } = require('./crypto');

// ── HTML sanitisation config ───────────────────────────────────────────────────
const SANITIZE_OPTS = {
    allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'img', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'caption',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'font', 'center',
    ],
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        '*':   ['style', 'align', 'valign', 'bgcolor'],
        a:     ['href', 'name', 'target', 'rel'],
        img:   ['src', 'alt', 'width', 'height', 'style'],
        table: ['border', 'cellpadding', 'cellspacing', 'width', 'style'],
        td:    ['colspan', 'rowspan', 'width', 'style'],
    },
    allowedSchemes:        ['http', 'https', 'mailto'],
    allowedSchemesByTag:   { img: ['http', 'https', 'data', 'cid'] },
    // Force external links to open safely
    transformTags: {
        a: (tagName, attribs) => ({
            tagName,
            attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
        }),
    },
    // Explicit allowlists — no url(), expression(), or arbitrary values
    allowedStyles: {
        '*': {
            'color':              [/^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\)|[a-zA-Z]+)$/i],
            'background-color':   [/^(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|hsla?\([\d\s,.%]+\)|[a-zA-Z]+)$/i],
            'font-size':          [/^[\d.]+(?:px|em|rem|%|pt|vw|vh|ex|ch)$/i],
            'font-weight':        [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
            'font-style':         [/^(?:normal|italic|oblique)$/i],
            'text-align':         [/^(?:left|right|center|justify|start|end)$/i],
            'text-decoration':    [/^(?:none|underline|overline|line-through)$/i],
            'padding':            [/^(?:0|auto|[\d.]+(?:px|em|rem|%|pt)(?:\s+(?:0|auto|[\d.]+(?:px|em|rem|%|pt))){0,3})$/i],
            'margin':             [/^(?:0|auto|[\d.]+(?:px|em|rem|%|pt)(?:\s+(?:0|auto|[\d.]+(?:px|em|rem|%|pt))){0,3})$/i],
            'border':             [/^[\d.]+(?:px|em|rem)\s+(?:solid|dashed|dotted|double|none)\s+(?:#[0-9a-f]{3,8}|rgba?\([\d\s,.%]+\)|[a-zA-Z]+)$/i],
            'width':              [/^(?:0|auto|[\d.]+(?:px|em|rem|%|pt|vw))$/i],
        },
    },
};

// ── Address corpus ─────────────────────────────────────────────────────────────
const ADJS  = ['swift','quiet','bold','bright','calm','cool','dark','deep','fair','free',
               'brave','crisp','fresh','grand','light','plain','sharp','smart','true','wide'];
const NOUNS = ['fox','owl','elk','wolf','hawk','bear','lynx','fawn','dove','swan',
               'crab','deer','hare','ibis','kite','lark','mole','newt','puma','wren'];

// ── In-memory stores ───────────────────────────────────────────────────────────
const mailboxes = new Map();   // address → MailboxRecord
const tokenIdx  = new Map();   // token   → address

// Injected by server.js after WS setup
let _onExpiry = (_address) => {};
function setExpiryNotifier(fn) { _onExpiry = fn; }

// ── Mailbox record ─────────────────────────────────────────────────────────────
class MailboxRecord {
    constructor(address, token, ttlMs) {
        this.address   = address;
        this.token     = token;
        this.expiresAt = Date.now() + ttlMs;
        this.inbox     = [];
        this.drafts    = [];
        this.sent      = [];
        this._timer    = null;
    }
}

function _expire(address, token) {
    tokenIdx.delete(token);
    mailboxes.delete(address);
    _onExpiry(address);
}

// ── Address generation ────────────────────────────────────────────────────────
function generateAddress(domain) {
    const adj  = ADJS[Math.floor(Math.random() * ADJS.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}.${noun}.${randomHex(6)}@${domain}`;
}

// ── Encrypt / expose helpers ──────────────────────────────────────────────────
function storeRecord(email) {
    return {
        id:          email.id,
        from:        encrypt(email.from    || ''),
        to:          encrypt(email.to      || ''),
        cc:          encrypt(email.cc      || ''),
        subject:     encrypt(email.subject || ''),
        ts:          email.ts,
        read:        email.read  || false,
        body:        encrypt(email.body     || ''),
        bodyHtml:    email.bodyHtml
            ? encrypt(sanitizeHtml(email.bodyHtml, SANITIZE_OPTS))
            : null,
        attachments: (email.attachments || []).map(a => ({
            id:          a.id,
            filename:    encrypt(a.filename),
            contentType: a.contentType,
            size:        a.size,
            data:        encryptBuf(Buffer.isBuffer(a.data) ? a.data : Buffer.from(a.data)),
        })),
    };
}

function expose(stored, full) {
    const e = {
        id:             stored.id,
        from:           decrypt(stored.from),
        to:             decrypt(stored.to),
        cc:             decrypt(stored.cc),
        subject:        decrypt(stored.subject),
        ts:             stored.ts,
        read:           stored.read  || false,
        hasAttachments: (stored.attachments || []).length > 0,
    };
    if (full) {
        e.body        = decrypt(stored.body);
        e.bodyHtml    = stored.bodyHtml ? decrypt(stored.bodyHtml) : null;
        e.attachments = (stored.attachments || []).map(a => ({
            id:          a.id,
            filename:    decrypt(a.filename),
            contentType: a.contentType,
            size:        a.size,
        }));
    }
    return e;
}

// ── Public API ────────────────────────────────────────────────────────────────

function mailboxCount() { return mailboxes.size; }

function createMailbox(domain, ttlMs = 60 * 60 * 1000, maxMailboxes = 0) {
    if (maxMailboxes > 0 && mailboxes.size >= maxMailboxes) {
        const err = new Error('Server at capacity — try again later');
        err.status = 503;
        throw err;
    }

    let address;
    do { address = generateAddress(domain); } while (mailboxes.has(address));

    const token = randomHex(32);
    const mb    = new MailboxRecord(address, token, ttlMs);
    mailboxes.set(address, mb);
    tokenIdx.set(token, address);

    mb._timer = setTimeout(() => _expire(address, token), ttlMs);

    // Welcome message
    mb.inbox.push(storeRecord({
        id:      randomHex(16),
        from:    `no-reply@${domain}`,
        to:      address,
        subject: 'Welcome to Anonymail',
        body:    [
            `Your temporary inbox is ready.`,
            ``,
            `Address:   ${address}`,
            `Expires:   ${new Date(mb.expiresAt).toLocaleTimeString()} (in ~1 hour)`,
            ``,
            `Share this address anywhere. Emails arrive here in real time.`,
            `Everything is encrypted in memory and wiped when the session expires.`,
            `Nothing is ever written to disk.`,
        ].join('\n'),
        ts:   Date.now(),
        read: false,
        attachments: [],
    }));

    return { address, token, expiresAt: mb.expiresAt };
}

function byToken(token) {
    const addr = tokenIdx.get(token);
    return addr ? mailboxes.get(addr) : null;
}

function hasAddress(address) {
    return mailboxes.has(address.toLowerCase());
}

function extendTtl(token, additionalMs = 3600000) {
    const addr = tokenIdx.get(token);
    if (!addr) return null;
    const mb = mailboxes.get(addr);
    clearTimeout(mb._timer);
    // Hard cap: no more than 24 h from now
    mb.expiresAt = Math.min(mb.expiresAt + additionalMs, Date.now() + 24 * 60 * 60 * 1000);
    mb._timer = setTimeout(() => _expire(addr, token), mb.expiresAt - Date.now());
    return mb.expiresAt;
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
function pushToInbox(address, email) {
    const mb = mailboxes.get(address.toLowerCase());
    if (!mb) return false;
    mb.inbox.unshift(storeRecord(email));
    return true;
}

// ── Drafts ────────────────────────────────────────────────────────────────────
function saveDraft(mb, draft) {
    const id = randomHex(16);
    mb.drafts.unshift(storeRecord({ ...draft, id, ts: Date.now(), from: mb.address, read: true }));
    return id;
}

function updateDraft(mb, id, draft) {
    const idx = mb.drafts.findIndex(d => d.id === id);
    if (idx === -1) return false;
    mb.drafts[idx] = storeRecord({ ...draft, id, ts: Date.now(), from: mb.address, read: true });
    return true;
}

function deleteDraft(mb, id) {
    const before = mb.drafts.length;
    mb.drafts = mb.drafts.filter(d => d.id !== id);
    return mb.drafts.length < before;
}

// ── Sent ──────────────────────────────────────────────────────────────────────
function pushToSent(mb, email) {
    const id = randomHex(16);
    mb.sent.unshift(storeRecord({ ...email, id, ts: Date.now(), from: mb.address, read: true }));
    return id;
}

// ── Read operations ────────────────────────────────────────────────────────────
function getBox(mb, box) {
    return (mb[box] || []).map(e => expose(e, false));
}

function getEmail(mb, box, id) {
    const e = (mb[box] || []).find(e => e.id === id);
    if (!e) return null;
    if (box === 'inbox' && !e.read) e.read = true;
    return expose(e, true);
}

function deleteEmail(mb, box, id) {
    if (box === 'drafts') return deleteDraft(mb, id);
    const before = mb[box].length;
    mb[box] = mb[box].filter(e => e.id !== id);
    return mb[box].length < before;
}

function getAttachment(mb, box, emailId, attachId) {
    const e = (mb[box] || []).find(e => e.id === emailId);
    if (!e) return null;
    const a = (e.attachments || []).find(a => a.id === attachId);
    if (!a) return null;
    return {
        filename:    decrypt(a.filename),
        contentType: a.contentType,
        data:        decryptBuf(a.data),
    };
}

module.exports = {
    createMailbox, byToken, hasAddress, extendTtl, mailboxCount,
    setExpiryNotifier, pushToInbox, saveDraft, updateDraft,
    deleteDraft, pushToSent, getBox, getEmail, deleteEmail, getAttachment,
};
