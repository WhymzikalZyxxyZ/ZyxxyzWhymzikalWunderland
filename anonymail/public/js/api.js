'use strict';

// ── Token storage ─────────────────────────────────────────────────────────────
// Token lives in sessionStorage only — cleared when the tab closes.
const TOKEN_KEY = 'anonymail_token';

export function getToken()        { return sessionStorage.getItem(TOKEN_KEY); }
export function setToken(t)       { sessionStorage.setItem(TOKEN_KEY, t); }
export function clearToken()      { sessionStorage.removeItem(TOKEN_KEY); }

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function authHeaders(extra = {}) {
    return { Authorization: `Bearer ${getToken()}`, ...extra };
}

async function request(method, path, body, isForm = false) {
    const opts = {
        method,
        headers: isForm
            ? authHeaders()
            : authHeaders({ 'Content-Type': 'application/json' }),
    };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
    }
    return res.json();
}

// ── Mailbox ───────────────────────────────────────────────────────────────────
export async function createMailbox() {
    const res = await fetch('/api/mailbox', { method: 'POST' });
    if (!res.ok) throw new Error('Could not create mailbox');
    return res.json();          // { address, token, expiresAt }
}

export async function getMailboxInfo() {
    return request('GET', '/api/mailbox');
}

// ── Boxes ─────────────────────────────────────────────────────────────────────
export async function listBox(box) {
    return request('GET', `/api/box/${box}`);
}

export async function getEmail(box, id) {
    return request('GET', `/api/box/${box}/${id}`);
}

export async function deleteEmail(box, id) {
    return request('DELETE', `/api/box/${box}/${id}`);
}

// ── Attachments ───────────────────────────────────────────────────────────────
export function attachmentUrl(box, emailId, attachId) {
    return `/api/box/${box}/${emailId}/attachment/${attachId}`;
}

// ── Drafts ────────────────────────────────────────────────────────────────────
export async function saveDraft(formData) {
    const res = await fetch('/api/draft', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();   // { id }
}

export async function updateDraft(id, formData) {
    const res = await fetch(`/api/draft/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

// ── Send ──────────────────────────────────────────────────────────────────────
export async function sendEmail(formData) {
    const res = await fetch('/api/send', {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
}

// ── WebSocket ──────────────────────────────────────────────────────────────────
export function openWebSocket(onEvent) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws    = new WebSocket(`${proto}://${location.host}/ws?token=${getToken()}`);

    let pingInterval;

    ws.addEventListener('open', () => {
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
    });

    ws.addEventListener('message', e => {
        try { onEvent(JSON.parse(e.data)); } catch { /* ignore malformed */ }
    });

    ws.addEventListener('close', () => {
        clearInterval(pingInterval);
        // Reconnect after 3 s if page is still open
        setTimeout(() => {
            if (getToken()) openWebSocket(onEvent);
        }, 3000);
    });

    ws.addEventListener('error', () => ws.close());

    return ws;
}
