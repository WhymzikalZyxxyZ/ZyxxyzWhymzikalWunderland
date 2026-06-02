'use strict';

// ── Worker endpoint ───────────────────────────────────────────────────────────
export const API_BASE = 'https://mail.zyxwonderland.xyz';

// ── Multi-session storage ─────────────────────────────────────────────────────
// All active sessions live in sessionStorage as a JSON array.
// A separate key tracks which one is currently active.
const SESSIONS_KEY = 'anonymail_sessions';
const ACTIVE_KEY   = 'anonymail_active';

export function getSessions() {
    try { return JSON.parse(sessionStorage.getItem(SESSIONS_KEY) || '[]'); }
    catch { return []; }
}

export function saveSessions(sessions) {
    sessionStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getActiveToken() {
    return sessionStorage.getItem(ACTIVE_KEY);
}

export function setActiveToken(token) {
    sessionStorage.setItem(ACTIVE_KEY, token);
}

export function addSession(session) {
    const sessions = getSessions().filter(s => s.token !== session.token);
    sessions.unshift(session);
    saveSessions(sessions);
    setActiveToken(session.token);
}

export function removeSession(token) {
    const sessions = getSessions().filter(s => s.token !== token);
    saveSessions(sessions);
    if (getActiveToken() === token) {
        setActiveToken(sessions[0]?.token || null);
    }
}

export function clearAllSessions() {
    sessionStorage.removeItem(SESSIONS_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
let _onUnauthorized = null;
export function setOnUnauthorized(fn) { _onUnauthorized = fn; }

function authHeaders(token, extra = {}) {
    return { Authorization: `Bearer ${token}`, ...extra };
}

function throwApiError(msg, status) {
    const e = new Error(msg);
    e.status = status;
    if (status === 401 && _onUnauthorized) _onUnauthorized();
    throw e;
}

async function request(method, path, token, body, isForm = false) {
    const opts = {
        method,
        headers: isForm
            ? authHeaders(token)
            : authHeaders(token, { 'Content-Type': 'application/json' }),
    };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throwApiError(error || res.statusText, res.status);
    }
    return res.json();
}

// ── Mailbox ───────────────────────────────────────────────────────────────────
export async function createMailbox() {
    const res = await fetch(`${API_BASE}/api/mailbox`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not create mailbox');
    return res.json();   // { address, token, expiresAt }
}

export async function getMailboxInfo(token) {
    return request('GET', '/api/mailbox', token);
}

export async function extendTtl(token, extraMs = 3_600_000) {
    return request('POST', '/api/mailbox/extend', token, { extra: extraMs });
}

// ── QR code ───────────────────────────────────────────────────────────────────
export async function getQr(token) {
    return request('GET', '/api/qr', token);
}

// ── Boxes ─────────────────────────────────────────────────────────────────────
export async function listBox(token, box) {
    return request('GET', `/api/box/${box}`, token);
}

export async function getEmail(token, box, id) {
    return request('GET', `/api/box/${box}/${id}`, token);
}

export async function deleteEmail(token, box, id) {
    return request('DELETE', `/api/box/${box}/${id}`, token);
}

// ── Attachments ───────────────────────────────────────────────────────────────
export function attachmentUrl(box, emailId, attachId, token) {
    return `${API_BASE}/api/box/${box}/${emailId}/attachment/${attachId}?_t=${token.slice(0, 8)}`;
}

// ── Drafts ────────────────────────────────────────────────────────────────────
export async function saveDraft(token, formData) {
    const res = await fetch(`${API_BASE}/api/draft`, {
        method: 'POST', headers: authHeaders(token), body: formData,
    });
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throwApiError(error || res.statusText, res.status);
    }
    return res.json();
}

export async function updateDraft(token, id, formData) {
    const res = await fetch(`${API_BASE}/api/draft/${id}`, {
        method: 'PUT', headers: authHeaders(token), body: formData,
    });
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throwApiError(error || res.statusText, res.status);
    }
    return res.json();
}

// ── Send ──────────────────────────────────────────────────────────────────────
export async function sendEmail(token, formData) {
    const res = await fetch(`${API_BASE}/api/send`, {
        method: 'POST', headers: authHeaders(token), body: formData,
    });
    if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throwApiError(error || res.statusText, res.status);
    }
    return res.json();
}

// ── WebSocket ──────────────────────────────────────────────────────────────────
export function openWebSocket(token, address, onEvent, onClose) {
    const wsBase  = API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws');
    const addrQ   = address ? `?addr=${encodeURIComponent(address)}` : '';
    const ws      = new WebSocket(`${wsBase}/ws${addrQ}`);
    let pingInterval;

    ws.addEventListener('open', () => {
        // Send token as the first message — never in the URL where it would appear in logs
        ws.send(JSON.stringify({ type: 'auth', token }));
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: 'ping' }));
        }, 25_000);
        onEvent({ type: 'ws_open' });
    });

    ws.addEventListener('message', e => {
        try { onEvent(JSON.parse(e.data)); } catch { /* ignore malformed */ }
    });

    ws.addEventListener('close', (e) => {
        clearInterval(pingInterval);
        if (onClose) onClose(e.code);
    });

    ws.addEventListener('error', () => ws.close());
    return ws;
}

// ── Browser notifications ─────────────────────────────────────────────────────
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
}

export function pushNotification(title, body) {
    if (Notification.permission !== 'granted') return;
    const n = new Notification(title, {
        body,
        icon:  '/favicon.svg',
        badge: '/favicon.svg',
        tag:   'anonymail-new-email',
    });
    n.onclick = () => { window.focus(); n.close(); };
}
