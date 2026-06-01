'use strict';

import * as API     from './api.js';
import * as Compose from './compose.js';

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    address:       null,
    expiresAt:     null,
    currentBox:    'inbox',
    emails:        [],
    activeEmailId: null,
    activeEmail:   null,
    ws:            null,
    countdowns:    {},  // box → count of unread
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s = '') {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)       return 'just now';
    if (s < 3600)     return Math.floor(s / 60)   + 'm ago';
    if (s < 86400)    return Math.floor(s / 3600)  + 'h ago';
    return             Math.floor(s / 86400)        + 'd ago';
}

function fmtFull(ts) {
    return new Date(ts).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour:  '2-digit', minute: '2-digit',
    });
}

function fmtSize(n) {
    if (n < 1024)    return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
}

function toast(msg, type = '') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' toast-' + type : '');
    t.textContent = msg;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => {
        t.classList.remove('visible');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 3500);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(
        () => toast('Copied to clipboard!', 'success'),
        () => toast('Copy failed — select and copy manually.', 'error'),
    );
}

// ── Countdown timer ────────────────────────────────────────────────────────────
let countdownInterval = null;

function startCountdown() {
    const el = document.getElementById('expires-countdown');
    if (!el || !state.expiresAt) return;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        const remaining = state.expiresAt - Date.now();
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            el.textContent = 'Expired';
            el.classList.add('expired');
            toast('Your temporary inbox has expired.', 'error');
            return;
        }
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        el.textContent = `${m}:${String(s).padStart(2, '0')} remaining`;
    }, 1000);
}

// ── Landing ───────────────────────────────────────────────────────────────────
async function showLanding() {
    document.getElementById('landing').hidden  = false;
    document.getElementById('client').hidden   = true;
}

async function handleCreate() {
    const btn = document.getElementById('create-btn');
    btn.disabled = true;
    btn.textContent = 'Creating…';
    try {
        const { address, token, expiresAt } = await API.createMailbox();
        API.setToken(token);
        state.address   = address;
        state.expiresAt = expiresAt;
        showClient();
    } catch (err) {
        toast('Failed to create mailbox: ' + err.message, 'error');
        btn.disabled    = false;
        btn.textContent = 'Generate my address →';
    }
}

// ── Client shell ──────────────────────────────────────────────────────────────
function showClient() {
    document.getElementById('landing').hidden = true;
    document.getElementById('client').hidden  = false;

    document.getElementById('address-display').textContent = state.address;
    document.getElementById('address-copy').addEventListener('click', () =>
        copyToClipboard(state.address));

    startCountdown();
    connectWS();
    loadBox('inbox');
}

function connectWS() {
    if (state.ws) state.ws.close();
    state.ws = API.openWebSocket(handleWsEvent);
}

function handleWsEvent(event) {
    if (event.type === 'new_email') {
        if (state.currentBox === 'inbox') {
            state.emails.unshift(event.email);
            renderList();
        }
        updateBadge('inbox', (parseInt(document.getElementById('badge-inbox').textContent || '0')) + 1);
        toast(`New email from ${event.email.from}`, 'success');
    }
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function setActiveNav(box) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.box === box);
    });
}

function updateBadge(box, n) {
    const el = document.getElementById(`badge-${box}`);
    if (!el) return;
    el.textContent = n > 0 ? String(n) : '';
    el.hidden = n <= 0;
}

// ── Email list ────────────────────────────────────────────────────────────────
async function loadBox(box) {
    state.currentBox    = box;
    state.activeEmailId = null;
    state.activeEmail   = null;
    setActiveNav(box);

    const listEl = document.getElementById('email-list');
    listEl.innerHTML = '<div class="list-loading">Loading…</div>';
    clearEmailView();

    try {
        state.emails = await API.listBox(box);
        renderList();
        const unread = state.emails.filter(e => !e.read).length;
        updateBadge(box, unread);
    } catch (err) {
        listEl.innerHTML = `<div class="list-empty">Error: ${esc(err.message)}</div>`;
    }
}

function renderList() {
    const listEl = document.getElementById('email-list');
    if (!state.emails.length) {
        const labels = { inbox: 'No emails yet', drafts: 'No drafts', sent: 'No sent mail' };
        listEl.innerHTML = `<div class="list-empty">${labels[state.currentBox]}</div>`;
        return;
    }
    listEl.innerHTML = '';
    state.emails.forEach(e => {
        const item = document.createElement('div');
        item.className = 'email-item' + (e.read ? '' : ' unread') +
                         (e.id === state.activeEmailId ? ' selected' : '');
        item.dataset.id = e.id;

        const primary = state.currentBox === 'sent' || state.currentBox === 'drafts'
            ? esc(e.to || '(no recipient)')
            : esc(e.from || '(unknown)');

        item.innerHTML = `
            <div class="item-top">
                <span class="item-from">${primary}</span>
                <span class="item-time">${timeAgo(e.ts)}</span>
            </div>
            <div class="item-subject">${esc(e.subject || '(no subject)')}${e.hasAttachments ? ' <span class="att-badge">📎</span>' : ''}</div>
        `;
        item.addEventListener('click', () => viewEmail(e.id));
        listEl.appendChild(item);
    });
}

// ── Email view ────────────────────────────────────────────────────────────────
async function viewEmail(id) {
    state.activeEmailId = id;

    // Highlight in list
    document.querySelectorAll('.email-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
        if (el.dataset.id === id) el.classList.remove('unread');
    });

    const viewEl = document.getElementById('email-view');
    viewEl.innerHTML = '<div class="view-loading">Loading…</div>';

    try {
        const email = await API.getEmail(state.currentBox, id);
        state.activeEmail = email;
        renderEmailView(email);
    } catch (err) {
        viewEl.innerHTML = `<div class="view-error">Failed to load: ${esc(err.message)}</div>`;
    }
}

function renderEmailView(email) {
    const viewEl = document.getElementById('email-view');

    const metaFrom = state.currentBox === 'sent' || state.currentBox === 'drafts'
        ? `<div class="meta-row"><span class="meta-label">To</span><span>${esc(email.to)}</span></div>
           ${email.cc ? `<div class="meta-row"><span class="meta-label">CC</span><span>${esc(email.cc)}</span></div>` : ''}`
        : `<div class="meta-row"><span class="meta-label">From</span><span>${esc(email.from)}</span></div>`;

    const atts = (email.attachments || []).map(a => `
        <a class="att-download" href="${API.attachmentUrl(state.currentBox, email.id, a.id)}"
           download="${esc(a.filename)}">
            <span>📎</span>
            <span>${esc(a.filename)}</span>
            <span class="att-size">${fmtSize(a.size)}</span>
        </a>
    `).join('');

    // Render body — prefer plain text (escaped) over HTML (iframed)
    const bodyContent = email.bodyHtml
        ? `<iframe class="email-html-frame" srcdoc="${esc(email.bodyHtml)}" sandbox="allow-same-origin" title="Email body"></iframe>`
        : `<pre class="email-body-plain">${esc(email.body)}</pre>`;

    const editBtn = state.currentBox === 'drafts'
        ? `<button class="btn btn-secondary" id="edit-draft-btn">Edit draft</button>` : '';

    viewEl.innerHTML = `
        <div class="email-header">
            <h2 class="email-subject">${esc(email.subject || '(no subject)')}</h2>
            <div class="email-meta">
                ${metaFrom}
                <div class="meta-row"><span class="meta-label">Date</span><span>${fmtFull(email.ts)}</span></div>
            </div>
        </div>
        ${atts ? `<div class="email-attachments">${atts}</div>` : ''}
        <div class="email-body">${bodyContent}</div>
        <div class="email-actions">
            ${state.currentBox === 'inbox'
                ? `<button class="btn btn-primary" id="reply-btn">Reply</button>` : ''}
            ${editBtn}
            <button class="btn btn-danger" id="delete-email-btn">Delete</button>
        </div>
    `;

    document.getElementById('delete-email-btn')?.addEventListener('click', () =>
        confirmDelete(state.currentBox, email.id));

    document.getElementById('reply-btn')?.addEventListener('click', () =>
        Compose.openCompose({
            to:      email.from,
            subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
            onSent:  box => loadBox(box),
        }));

    document.getElementById('edit-draft-btn')?.addEventListener('click', () =>
        Compose.openCompose({
            draftId: email.id,
            to:      email.to,
            cc:      email.cc,
            subject: email.subject,
            body:    email.body,
            onSent:  box => loadBox(box),
            onDrafted: () => loadBox('drafts'),
        }));
}

async function confirmDelete(box, id) {
    if (!confirm('Delete this email?')) return;
    try {
        await API.deleteEmail(box, id);
        state.emails = state.emails.filter(e => e.id !== id);
        clearEmailView();
        renderList();
        toast('Deleted.', 'success');
    } catch (err) {
        toast('Delete failed: ' + err.message, 'error');
    }
}

function clearEmailView() {
    const viewEl = document.getElementById('email-view');
    viewEl.innerHTML = `
        <div class="view-empty">
            <div class="view-empty-icon">✉</div>
            <p>Select an email to read it</p>
        </div>
    `;
}

// ── Burn / destroy ────────────────────────────────────────────────────────────
async function burnMailbox() {
    if (!confirm('Destroy this mailbox and delete all emails now?')) return;
    try {
        await fetch('/api/mailbox', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${API.getToken()}` },
        });
    } catch { /* ignore */ }
    API.clearToken();
    if (state.ws) state.ws.close();
    if (countdownInterval) clearInterval(countdownInterval);
    Object.assign(state, { address: null, expiresAt: null, emails: [], ws: null });
    showLanding();
    document.getElementById('create-btn').disabled = false;
    document.getElementById('create-btn').textContent = 'Generate my address →';
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
    Compose.initCompose();

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => loadBox(el.dataset.box));
    });

    // Compose button
    document.getElementById('compose-btn').addEventListener('click', () =>
        Compose.openCompose({
            onSent:    box => loadBox(box),
            onDrafted: ()  => loadBox('drafts'),
        }));

    // Burn button
    document.getElementById('burn-btn').addEventListener('click', burnMailbox);

    // Create button on landing
    document.getElementById('create-btn').addEventListener('click', handleCreate);

    // Restore session from sessionStorage
    const token = API.getToken();
    if (token) {
        try {
            const info = await API.getMailboxInfo();
            state.address   = info.address;
            state.expiresAt = info.expiresAt;
            showClient();
            return;
        } catch {
            API.clearToken();
        }
    }
    showLanding();
}

document.addEventListener('DOMContentLoaded', init);
