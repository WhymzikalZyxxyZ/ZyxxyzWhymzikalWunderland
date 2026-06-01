'use strict';

// ── Shared utilities ──────────────────────────────────────────────────────────
// Loaded before page-specific scripts on any page that needs these helpers.

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateLong(ts) {
    return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Calls fn(firebase.database()) if Firebase is ready; calls fallback() otherwise.
function withFirebase(fn, fallback) {
    if (!window.FIREBASE_READY) {
        if (typeof fallback === 'function') fallback();
        return;
    }
    fn(firebase.database());
}

// ── Admin auth ────────────────────────────────────────────────────────────────
// PIN is stored as a SHA-256 hash — the plaintext never appears in source.
// To update: node -e "const c=require('crypto');console.log(c.createHash('sha256').update('NEWPIN').digest('hex'))"
const ADMIN_PIN_HASH = 'd26b847828fe00512c1fb395ec8ffd514c7369a6780c88798880659eac394ea6';
const ADMIN_KEY      = 'blog_admin_unlocked';

async function verifyPin(input) {
    const data   = new TextEncoder().encode(input);
    const buf    = await crypto.subtle.digest('SHA-256', data);
    const hex    = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === ADMIN_PIN_HASH;
}

function isAdmin() {
    return sessionStorage.getItem(ADMIN_KEY) === '1';
}

// ── Rate guard ────────────────────────────────────────────────────────────────
// Returns true if the action identified by `key` is allowed; false if
// it fired too recently.  Prevents abuse of Firebase write paths.
const _rateLimits = Object.create(null);
function rateGuard(key, ms) {
    const now = Date.now();
    if (_rateLimits[key] && now - _rateLimits[key] < ms) return false;
    _rateLimits[key] = now;
    return true;
}

// ── URL sanitisation ──────────────────────────────────────────────────────────
// Returns the URL only if it uses http or https; null otherwise.
// Prevents javascript: and data: URLs from being rendered as links.
function safeUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
    } catch {
        return null;
    }
}

// ── Toast notifications ───────────────────────────────────────────────────────
function showToast(msg, type) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3200);
}

// ── Lightweight Markdown renderer ─────────────────────────────────────────────
// Escapes HTML first, then applies safe inline transforms.
function renderMd(text) {
    return esc(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g,     '<em>$1</em>')
        .replace(/`(.+?)`/g,       '<code>$1</code>')
        .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g,   '<br>');
}
