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
