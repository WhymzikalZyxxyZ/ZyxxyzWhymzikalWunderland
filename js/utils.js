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
