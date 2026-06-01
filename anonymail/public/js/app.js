'use strict';

import * as API     from './api.js';
import * as Compose from './compose.js';

// ── Loading phrases ───────────────────────────────────────────────────────────
const PHRASES = [
    // Silly
    'Convincing bits to line up nicely…',
    'Negotiating terms with the router…',
    'Deploying carrier pigeons…',
    'Untangling the internet spaghetti…',
    'Asking the DNS server very politely…',
    'Bribing the load balancer with cookies…',
    'Counting electrons for dramatic effect…',
    'Teaching packets to swim…',
    'Performing a packet séance…',
    // Zany
    'Defragmenting the vibes…',
    'Bribery in progress — please hold…',
    'Warming up the hamster wheel…',
    'Channeling digital spirits…',
    'Rerouting through Hogwarts…',
    'Consulting the ancient scrolls of TCP/IP…',
    'Aggressively refreshing karma…',
    'Doing the worm (the digital kind)…',
    'Untangling the cursed regex…',
    'Arguing with the firewall…',
    // Sultry
    'Making you wait just a little longer…',
    'Whispering sweet nothings to the server…',
    'The server is getting dressed…',
    'Taking its time. Worth the wait.',
    'Seducing the firewall…',
    'Slow loading is the internet flirting with you…',
    'Good things take time. This is one of them.',
    'Patience is a virtue. We have neither.',
    'The bytes are shy. Give them a moment.',
    'Just making sure you really want this…',
    'Building anticipation, byte by byte…',
    'Almost there. Or are we? Yes. Probably.',
];

let phraseIdx      = Math.floor(Math.random() * PHRASES.length);
let phraseInterval = null;

function startPhrases(elId, intervalMs = 700) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = PHRASES[phraseIdx];
    phraseInterval = setInterval(() => {
        phraseIdx = (phraseIdx + 1) % PHRASES.length;
        el.style.opacity = '0';
        setTimeout(() => {
            if (!el) return;
            el.textContent = PHRASES[phraseIdx];
            el.style.opacity = '1';
        }, 180);
    }, intervalMs);
}

function stopPhrases() {
    clearInterval(phraseInterval);
    phraseInterval = null;
}

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    currentBox:    'inbox',
    emails:        [],
    activeEmailId: null,
    activeEmail:   null,
    ws:            null,
    searchQuery:   '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s = '') {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60)  + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return              Math.floor(s / 86400)  + 'd ago';
}
function fmtFull(ts) {
    return new Date(ts).toLocaleString([], {
        month:'short', day:'numeric', hour:'2-digit', minute:'2-digit',
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
    t.className   = 'toast' + (type ? ' toast-' + type : '');
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
        () => toast('Copied!', 'success'),
        () => toast('Copy failed — select manually.', 'error'),
    );
}

function updatePageTitle() {
    const unread = state.emails.filter(e => !e.read && state.currentBox === 'inbox').length;
    document.title = unread > 0 ? `(${unread}) Anonymail` : 'Anonymail';
}

// ── Countdown ─────────────────────────────────────────────────────────────────
let countdownInterval = null;

function startCountdown(token) {
    const el = document.getElementById('expires-countdown');
    if (!el) return;
    if (countdownInterval) clearInterval(countdownInterval);

    function tick() {
        const sessions = API.getSessions();
        const session  = sessions.find(s => s.token === token);
        if (!el || !session) return;
        const rem = session.expiresAt - Date.now();
        if (rem <= 0) {
            clearInterval(countdownInterval);
            el.textContent = 'Expired';
            el.classList.add('expired');
            return;
        }
        const m = Math.floor(rem / 60000);
        const s = Math.floor((rem % 60000) / 1000);
        el.textContent = `${m}:${String(s).padStart(2, '0')} remaining`;
        el.classList.toggle('expiring-soon', rem < 600000); // warn at < 10 min
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
}

// ── Address list in sidebar ────────────────────────────────────────────────────
function renderAddressList() {
    const listEl  = document.getElementById('address-list');
    const sessions = API.getSessions();
    const active   = API.getActiveToken();
    listEl.innerHTML = '';

    sessions.forEach(({ token, address, expiresAt }) => {
        const item = document.createElement('div');
        item.className = 'address-item' + (token === active ? ' active' : '');
        item.dataset.token = token;

        // Short display: first two segments + domain
        const parts = address.split('@');
        const local = parts[0].split('.');
        const short = local.slice(0, 2).join('.') + '…@' + parts[1];

        const expired = expiresAt < Date.now();
        item.innerHTML = `
            <span class="address-dot ${expired ? 'dot-dead' : 'dot-live'}"></span>
            <span class="address-short" title="${esc(address)}">${esc(short)}</span>
            <button class="address-remove" data-token="${esc(token)}" title="Remove address">✕</button>
        `;
        item.addEventListener('click', e => {
            if (e.target.classList.contains('address-remove')) return;
            if (token !== active) switchAddress(token);
        });
        item.querySelector('.address-remove').addEventListener('click', e => {
            e.stopPropagation();
            removeAddress(token);
        });
        listEl.appendChild(item);
    });
}

async function addNewAddress() {
    const btn = document.getElementById('add-address-btn');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
        const { address, token, expiresAt } = await API.createMailbox();
        API.addSession({ address, token, expiresAt });
        renderAddressList();
        switchAddress(token);
        toast(`New address created: ${address}`, 'success');
    } catch (err) {
        toast('Failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '+ New address';
    }
}

function switchAddress(token) {
    if (state.ws) { state.ws.close(); state.ws = null; }
    if (countdownInterval) clearInterval(countdownInterval);
    API.setActiveToken(token);
    renderAddressList();
    const sessions = API.getSessions();
    const session  = sessions.find(s => s.token === token);
    if (!session) return;
    document.getElementById('address-display').textContent = session.address;
    startCountdown(token);
    connectWS(token);
    loadBox('inbox');
}

function removeAddress(token) {
    API.removeSession(token);
    const sessions = API.getSessions();
    if (sessions.length === 0) {
        burnAll();
    } else {
        const nextToken = API.getActiveToken() || sessions[0].token;
        switchAddress(nextToken);
        renderAddressList();
    }
}

// ── Extend TTL ────────────────────────────────────────────────────────────────
async function handleExtend() {
    const token = API.getActiveToken();
    const btn   = document.getElementById('extend-btn');
    btn.disabled = true; btn.textContent = '+1h…';
    try {
        const { expiresAt } = await API.extendTtl(token);
        const sessions = API.getSessions().map(s =>
            s.token === token ? { ...s, expiresAt } : s
        );
        API.saveSessions(sessions);
        renderAddressList();
        startCountdown(token);
        toast('Extended by 1 hour.', 'success');
    } catch (err) {
        toast('Extend failed: ' + err.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '+1h';
    }
}

// ── QR code ────────────────────────────────────────────────────────────────────
async function showQr() {
    const token = API.getActiveToken();
    const modal = document.getElementById('qr-modal');
    const img   = document.getElementById('qr-image');
    const lbl   = document.getElementById('qr-address-label');
    modal.hidden = false;
    img.src      = '';
    lbl.textContent = '';
    try {
        const { dataUrl, address } = await API.getQr(token);
        img.src         = dataUrl;
        lbl.textContent = address;
    } catch (err) {
        toast('QR failed: ' + err.message, 'error');
        modal.hidden = true;
    }
}

// ── Notifications ──────────────────────────────────────────────────────────────
async function toggleNotifications() {
    const btn    = document.getElementById('notif-btn');
    const result = await API.requestNotificationPermission();
    if (result === 'unsupported') {
        toast('Browser notifications not supported.', 'error');
    } else if (result === 'granted') {
        btn.classList.add('notif-on');
        btn.title = 'Notifications enabled';
        toast('Notifications enabled!', 'success');
    } else {
        toast('Notification permission denied.', 'error');
    }
}

function initNotifButton() {
    const btn = document.getElementById('notif-btn');
    if (!('Notification' in window)) { btn.hidden = true; return; }
    if (Notification.permission === 'granted') btn.classList.add('notif-on');
    btn.addEventListener('click', toggleNotifications);
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────
function initKeyboard() {
    document.addEventListener('keydown', e => {
        // Skip when typing in an input/textarea
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        // Skip when compose modal is open
        if (!document.getElementById('compose-modal').hidden) return;

        switch (e.key) {
            case 'n': case 'c':
                e.preventDefault();
                openCompose();
                break;
            case 'r':
                if (state.activeEmail && state.currentBox === 'inbox') {
                    e.preventDefault();
                    replyToActive();
                }
                break;
            case 'Delete': case 'd':
                if (state.activeEmailId) {
                    e.preventDefault();
                    confirmDelete(state.currentBox, state.activeEmailId);
                }
                break;
            case 'j': case 'ArrowDown':
                e.preventDefault();
                navigateList(1);
                break;
            case 'k': case 'ArrowUp':
                e.preventDefault();
                navigateList(-1);
                break;
            case '/':
                e.preventDefault();
                document.getElementById('search-input')?.focus();
                break;
            case '?':
                toggleShortcutHelp();
                break;
            case 'Escape':
                closeShortcutHelp();
                closeQrModal();
                break;
        }
    });
}

function navigateList(dir) {
    if (!state.emails.length) return;
    const filtered = filteredEmails();
    const idx = filtered.findIndex(e => e.id === state.activeEmailId);
    const next = filtered[idx + dir];
    if (next) viewEmail(next.id);
}

// ── Shortcut help modal ────────────────────────────────────────────────────────
function toggleShortcutHelp() {
    const el = document.getElementById('shortcuts-modal');
    el.hidden = !el.hidden;
}
function closeShortcutHelp() {
    document.getElementById('shortcuts-modal').hidden = true;
}
function closeQrModal() {
    document.getElementById('qr-modal').hidden = true;
}

// ── Search ────────────────────────────────────────────────────────────────────
function filteredEmails() {
    const q = state.searchQuery.toLowerCase().trim();
    if (!q) return state.emails;
    return state.emails.filter(e =>
        (e.subject || '').toLowerCase().includes(q) ||
        (e.from    || '').toLowerCase().includes(q) ||
        (e.to      || '').toLowerCase().includes(q)
    );
}

function initSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', () => {
        state.searchQuery = input.value;
        renderList();
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { input.value = ''; state.searchQuery = ''; renderList(); input.blur(); }
    });
}

// ── Skeleton loading ──────────────────────────────────────────────────────────
function renderSkeleton() {
    const listEl = document.getElementById('email-list');
    listEl.innerHTML = Array.from({ length: 5 }).map(() => `
        <div class="email-item skeleton-item" aria-hidden="true">
            <div class="item-top">
                <div class="skeleton skel-from"></div>
                <div class="skeleton skel-time"></div>
            </div>
            <div class="skeleton skel-subject"></div>
        </div>
    `).join('');
}

// ── WS ────────────────────────────────────────────────────────────────────────
function connectWS(token) {
    if (state.ws) state.ws.close();
    const session = API.getSessions().find(s => s.token === token);
    state.ws = API.openWebSocket(token, session?.address, handleWsEvent);
}

function handleWsEvent(event) {
    if (event.type === 'new_email') {
        if (state.currentBox === 'inbox') {
            state.emails.unshift(event.email);
            renderList();
        }
        updateBadge('inbox', (state.emails.filter(e => !e.read).length));
        updatePageTitle();
        toast(`📬 New email from ${event.email.from}`, 'success');
        API.pushNotification('New email in Anonymail', `From: ${event.email.from}\n${event.email.subject}`);
    } else if (event.type === 'expired') {
        toast('Your inbox has expired.', 'error');
        document.getElementById('expires-countdown').textContent = 'Expired';
        document.getElementById('expires-countdown').classList.add('expired');
    }
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function setActiveNav(box) {
    document.querySelectorAll('.nav-item').forEach(el =>
        el.classList.toggle('active', el.dataset.box === box));
    const labels = { inbox: 'Inbox', drafts: 'Drafts', sent: 'Sent' };
    document.getElementById('list-header').textContent = labels[box] || box;
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
    state.searchQuery   = '';
    const searchEl = document.getElementById('search-input');
    if (searchEl) searchEl.value = '';

    setActiveNav(box);
    renderSkeleton();
    startPhrases('list-phrase', 1500);
    clearEmailView();

    const token = API.getActiveToken();
    try {
        state.emails = await API.listBox(token, box);
        stopPhrases();
        renderList();
        if (box === 'inbox') {
            updateBadge('inbox', state.emails.filter(e => !e.read).length);
            updatePageTitle();
        }
    } catch (err) {
        stopPhrases();
        document.getElementById('email-list').innerHTML =
            `<div class="list-empty">Error: ${esc(err.message)}</div>`;
    }

    // Mobile: show list panel
    document.getElementById('client').classList.remove('mobile-email-view');
}

function renderList() {
    const listEl = document.getElementById('email-list');
    const emails = filteredEmails();

    if (!emails.length) {
        const isSearch = !!state.searchQuery;
        const empty    = { inbox:'No emails yet', drafts:'No drafts', sent:'No sent mail' };
        listEl.innerHTML = `<div class="list-empty">${isSearch ? 'No results.' : (empty[state.currentBox] || 'Empty')}</div>`;
        return;
    }

    listEl.innerHTML = '';
    emails.forEach(e => {
        const item = document.createElement('div');
        item.className = 'email-item' +
            (e.read   ? ''          : ' unread')   +
            (e.id === state.activeEmailId ? ' selected' : '');
        item.dataset.id = e.id;

        const primary = (state.currentBox === 'sent' || state.currentBox === 'drafts')
            ? esc(e.to || '(no recipient)')
            : esc(e.from || '(unknown)');

        item.innerHTML = `
            <div class="item-top">
                <span class="item-from">${primary}</span>
                <span class="item-time">${timeAgo(e.ts)}</span>
            </div>
            <div class="item-subject">${esc(e.subject || '(no subject)')}${e.hasAttachments ? ' <span class="att-badge" title="Has attachments">📎</span>' : ''}</div>
        `;
        item.addEventListener('click', () => viewEmail(e.id));
        listEl.appendChild(item);
    });
}

// ── Email view ────────────────────────────────────────────────────────────────
async function viewEmail(id) {
    state.activeEmailId = id;

    document.querySelectorAll('.email-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id);
        if (el.dataset.id === id) el.classList.remove('unread');
    });

    const viewEl = document.getElementById('email-view');
    viewEl.innerHTML = `
        <div class="view-loading">
            <div id="list-phrase" class="loading-phrase"></div>
        </div>`;
    startPhrases('list-phrase', 800);

    // Mobile: switch to email view
    document.getElementById('client').classList.add('mobile-email-view');

    const token = API.getActiveToken();
    try {
        const email = await API.getEmail(token, state.currentBox, id);
        stopPhrases();
        state.activeEmail = email;
        renderEmailView(email);
        updatePageTitle();
    } catch (err) {
        stopPhrases();
        viewEl.innerHTML = `<div class="view-error">Failed to load: ${esc(err.message)}</div>`;
    }
}

function renderEmailView(email) {
    const viewEl = document.getElementById('email-view');
    const token  = API.getActiveToken();

    const metaRows = state.currentBox === 'inbox'
        ? `<div class="meta-row"><span class="meta-label">From</span><span>${esc(email.from)}</span></div>`
        : `<div class="meta-row"><span class="meta-label">To</span><span>${esc(email.to)}</span></div>
           ${email.cc ? `<div class="meta-row"><span class="meta-label">CC</span><span>${esc(email.cc)}</span></div>` : ''}`;

    // Attachments: inline images + download links for everything
    const atts = (email.attachments || []).map(a => {
        const url    = API.attachmentUrl(state.currentBox, email.id, a.id, token);
        const isImg  = a.contentType.startsWith('image/');
        const isPdf  = a.contentType === 'application/pdf';
        if (isImg) {
            return `<div class="att-preview-wrap">
                <img class="att-preview-img" src="${url}" alt="${esc(a.filename)}" loading="lazy">
                <div class="att-preview-meta">
                    <span>${esc(a.filename)}</span>
                    <a class="att-download" href="${url}" download="${esc(a.filename)}">⬇ Download</a>
                </div>
            </div>`;
        }
        return `<a class="att-download" href="${url}" download="${esc(a.filename)}">
            <span>${isPdf ? '📄' : '📎'}</span>
            <span>${esc(a.filename)}</span>
            <span class="att-size">${fmtSize(a.size)}</span>
        </a>`;
    }).join('');

    const bodyContent = email.bodyHtml
        ? `<iframe class="email-html-frame" srcdoc="${esc(email.bodyHtml)}" sandbox="allow-same-origin" title="Email body"></iframe>`
        : `<pre class="email-body-plain">${esc(email.body)}</pre>`;

    viewEl.innerHTML = `
        <div class="mobile-back">
            <button id="back-to-list" class="btn btn-ghost">← Back</button>
        </div>
        <div class="email-header">
            <h2 class="email-subject">${esc(email.subject || '(no subject)')}</h2>
            <div class="email-meta">
                ${metaRows}
                <div class="meta-row"><span class="meta-label">Date</span><span>${fmtFull(email.ts)}</span></div>
            </div>
        </div>
        ${atts ? `<div class="email-attachments">${atts}</div>` : ''}
        <div class="email-body">${bodyContent}</div>
        <div class="email-actions">
            ${state.currentBox === 'inbox'
                ? `<button class="btn btn-primary" id="reply-btn">Reply</button>` : ''}
            ${state.currentBox === 'drafts'
                ? `<button class="btn btn-secondary" id="edit-draft-btn">Edit draft</button>` : ''}
            <button class="btn btn-danger" id="delete-email-btn">Delete</button>
        </div>
    `;

    document.getElementById('back-to-list')?.addEventListener('click', () => {
        document.getElementById('client').classList.remove('mobile-email-view');
    });
    document.getElementById('delete-email-btn')?.addEventListener('click', () =>
        confirmDelete(state.currentBox, email.id));
    document.getElementById('reply-btn')?.addEventListener('click', replyToActive);
    document.getElementById('edit-draft-btn')?.addEventListener('click', () =>
        openCompose({
            draftId: email.id, to: email.to, cc: email.cc,
            subject: email.subject, body: email.body, focusBody: true,
        }));
}

function replyToActive() {
    if (!state.activeEmail) return;
    const e = state.activeEmail;
    openCompose({
        to:      e.from,
        subject: e.subject?.startsWith('Re:') ? e.subject : `Re: ${e.subject}`,
    });
}

async function confirmDelete(box, id) {
    if (!confirm('Delete this email?')) return;
    const token = API.getActiveToken();
    try {
        await API.deleteEmail(token, box, id);
        state.emails = state.emails.filter(e => e.id !== id);
        clearEmailView();
        renderList();
        document.getElementById('client').classList.remove('mobile-email-view');
        toast('Deleted.', 'success');
    } catch (err) {
        toast('Delete failed: ' + err.message, 'error');
    }
}

function clearEmailView() {
    state.activeEmailId = null;
    state.activeEmail   = null;
    document.getElementById('email-view').innerHTML = `
        <div class="view-empty">
            <div class="view-empty-icon">✉</div>
            <p>Select an email to read it</p>
            <p class="view-shortcut-hint">Press <kbd>?</kbd> for keyboard shortcuts</p>
        </div>
    `;
}

// ── Compose bridge ─────────────────────────────────────────────────────────────
function openCompose(opts = {}) {
    const token = API.getActiveToken();
    Compose.openCompose({
        ...opts,
        token,
        onSent:    box  => loadBox(box),
        onDrafted: ()   => loadBox('drafts'),
    });
}

// ── Burn / destroy ────────────────────────────────────────────────────────────
async function burnActive() {
    if (!confirm('Destroy this address and delete all its emails?')) return;
    const token = API.getActiveToken();
    try {
        await fetch('/api/mailbox', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch { /* ignore */ }
    removeAddress(token);
}

async function burnAll() {
    if (state.ws) { state.ws.close(); state.ws = null; }
    if (countdownInterval) clearInterval(countdownInterval);
    API.clearAllSessions();
    Object.assign(state, { emails: [], activeEmailId: null, activeEmail: null });
    document.getElementById('client').hidden  = true;
    document.getElementById('landing').hidden = false;
    document.getElementById('create-btn').disabled    = false;
    document.getElementById('create-btn').textContent = 'Generate my address →';
}

// ── Landing & init ────────────────────────────────────────────────────────────
async function handleCreate() {
    const btn = document.getElementById('create-btn');
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
        const { address, token, expiresAt } = await API.createMailbox();
        API.addSession({ address, token, expiresAt });
        showClient();
    } catch (err) {
        toast('Failed: ' + err.message, 'error');
        btn.disabled = false; btn.textContent = 'Generate my address →';
    }
}

function showClient() {
    document.getElementById('landing').hidden = true;
    document.getElementById('client').hidden  = false;

    const token   = API.getActiveToken();
    const sessions = API.getSessions();
    const session  = sessions.find(s => s.token === token);
    if (!session) return;

    document.getElementById('address-display').textContent = session.address;
    renderAddressList();
    startCountdown(token);
    connectWS(token);
    loadBox('inbox');
    initNotifButton();
}

async function init() {
    // Show loading splash immediately
    const splash = document.getElementById('loading-splash');
    startPhrases('splash-phrase', 650);

    Compose.initCompose();
    initKeyboard();
    initSearch();

    // Wire nav
    document.querySelectorAll('.nav-item').forEach(el =>
        el.addEventListener('click', () => loadBox(el.dataset.box)));

    // Wire buttons
    document.getElementById('compose-btn').addEventListener('click', () => openCompose());
    document.getElementById('burn-btn').addEventListener('click', burnActive);
    document.getElementById('create-btn').addEventListener('click', handleCreate);
    document.getElementById('add-address-btn').addEventListener('click', addNewAddress);
    document.getElementById('extend-btn').addEventListener('click', handleExtend);
    document.getElementById('qr-btn').addEventListener('click', showQr);
    document.getElementById('shortcuts-btn').addEventListener('click', toggleShortcutHelp);
    document.getElementById('qr-close').addEventListener('click', closeQrModal);
    document.getElementById('shortcuts-close').addEventListener('click', closeShortcutHelp);
    document.getElementById('address-copy').addEventListener('click', () => {
        const addr = document.getElementById('address-display').textContent;
        copyToClipboard(addr);
    });

    // Address copy on click in address pill
    document.getElementById('address-display').addEventListener('click', () => {
        copyToClipboard(document.getElementById('address-display').textContent);
    });

    // Restore session
    const sessions = API.getSessions().filter(s => s.expiresAt > Date.now());
    API.saveSessions(sessions);

    let restored = false;
    if (sessions.length > 0) {
        const token = API.getActiveToken() || sessions[0].token;
        API.setActiveToken(token);
        try {
            await API.getMailboxInfo(token);
            restored = true;
        } catch {
            API.removeSession(token);
        }
    }

    stopPhrases();
    splash.classList.add('splash-out');
    setTimeout(() => { splash.hidden = true; }, 400);

    if (restored) {
        showClient();
    } else {
        document.getElementById('landing').hidden = false;
    }
}

document.addEventListener('DOMContentLoaded', init);
