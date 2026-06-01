'use strict';

const { encrypt, encryptBuf, decrypt, decryptBuf, randomHex } = require('./crypto');

// ── Address corpus ─────────────────────────────────────────────────────────────
const ADJS  = ['swift','quiet','bold','bright','calm','cool','dark','deep','fair','free',
               'brave','crisp','fresh','grand','light','plain','sharp','smart','true','wide'];
const NOUNS = ['fox','owl','elk','wolf','hawk','bear','lynx','fawn','dove','swan',
               'crab','deer','hare','ibis','kite','lark','mole','newt','puma','wren'];

// ── In-memory stores ───────────────────────────────────────────────────────────
const mailboxes = new Map();   // address → MailboxRecord
const tokenIdx  = new Map();   // token   → address

class MailboxRecord {
    constructor(address, token, ttlMs) {
        this.address   = address;
        this.token     = token;
        this.expiresAt = Date.now() + ttlMs;
        this.inbox     = [];
        this.drafts    = [];
        this.sent      = [];
    }
}

// ── Address generation ────────────────────────────────────────────────────────
function generateAddress(domain) {
    const adj  = ADJS[Math.floor(Math.random() * ADJS.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${adj}.${noun}.${randomHex(3)}@${domain}`;
}

// ── Encrypt / expose helpers ──────────────────────────────────────────────────
function store(email) {
    return {
        ...email,
        body:        encrypt(email.body     || ''),
        bodyHtml:    email.bodyHtml ? encrypt(email.bodyHtml) : null,
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
        from:           stored.from,
        to:             stored.to,
        cc:             stored.cc    || '',
        subject:        stored.subject,
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

function createMailbox(domain, ttlMs = 60 * 60 * 1000) {
    let address;
    do { address = generateAddress(domain); } while (mailboxes.has(address));

    const token = randomHex(32);
    const mb    = new MailboxRecord(address, token, ttlMs);
    mailboxes.set(address, mb);
    tokenIdx.set(token, address);

    // Auto-expire
    setTimeout(() => {
        tokenIdx.delete(token);
        mailboxes.delete(address);
    }, ttlMs);

    // Welcome message
    mb.inbox.push(store({
        id:      randomHex(16),
        from:    `no-reply@${domain}`,
        to:      address,
        subject: 'Welcome to Anonymail',
        body:    [
            `Your temporary inbox is ready.`,
            ``,
            `Address:   ${address}`,
            `Expires:   ${new Date(mb.expiresAt).toLocaleTimeString()} (1 hour)`,
            ``,
            `Share this address anywhere. Emails arrive here in real time.`,
            `Everything is encrypted in memory and wiped when the session expires.`,
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

// ── Inbox ─────────────────────────────────────────────────────────────────────
function pushToInbox(address, email) {
    const mb = mailboxes.get(address.toLowerCase());
    if (!mb) return false;
    mb.inbox.unshift(store(email));
    return true;
}

// ── Drafts ────────────────────────────────────────────────────────────────────
function saveDraft(mb, draft) {
    const id = randomHex(16);
    mb.drafts.unshift(store({ ...draft, id, ts: Date.now(), from: mb.address, read: true }));
    return id;
}

function updateDraft(mb, id, draft) {
    const idx = mb.drafts.findIndex(d => d.id === id);
    if (idx === -1) return false;
    mb.drafts[idx] = store({ ...draft, id, ts: Date.now(), from: mb.address, read: true });
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
    mb.sent.unshift(store({ ...email, id, ts: Date.now(), from: mb.address, read: true }));
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
    createMailbox, byToken, hasAddress,
    pushToInbox, saveDraft, updateDraft, deleteDraft, pushToSent,
    getBox, getEmail, deleteEmail, getAttachment,
};
