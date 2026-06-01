'use strict';

// esc(), fmtDate(), showToast(), withFirebase() from /js/utils.js

const MAX_MSG    = 400;
const MAX_ENTRIES = 200;
const PAGE_SIZE  = 20;
const ADMIN_KEY  = 'blog_admin_unlocked';

let allEntries   = [];
let visibleCount = PAGE_SIZE;

function isAdmin() { return sessionStorage.getItem(ADMIN_KEY) === '1'; }

// ── Admin toggle ──────────────────────────────────────────────────────────────
(function initAdmin() {
    const btn = document.getElementById('gb-admin-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (isAdmin()) {
            sessionStorage.removeItem(ADMIN_KEY);
            document.querySelectorAll('.gb-delete').forEach(b => b.hidden = true);
            return;
        }
        const pin = prompt('Admin PIN:');
        if (pin === 'ZYXXYZ') {
            sessionStorage.setItem(ADMIN_KEY, '1');
            document.querySelectorAll('.gb-delete').forEach(b => b.hidden = false);
        }
    });
})();

// ── Char counter ──────────────────────────────────────────────────────────────
document.getElementById('gb-msg').addEventListener('input', function () {
    document.getElementById('gb-chars').textContent = this.value.length;
});

// ── Submit ────────────────────────────────────────────────────────────────────
document.getElementById('gb-submit').addEventListener('click', submitEntry);
document.getElementById('gb-msg').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) submitEntry();
});

function submitEntry() {
    const name = document.getElementById('gb-name').value.trim();
    const url  = document.getElementById('gb-url').value.trim();
    const msg  = document.getElementById('gb-msg').value.trim();

    if (!name) { document.getElementById('gb-name').focus(); return; }
    if (!msg)  { document.getElementById('gb-msg').focus();  return; }
    if (msg.length > MAX_MSG) return;

    if (url && !/^https?:\/\/.+/.test(url)) {
        showToast('Website URL must start with http:// or https://', 'error');
        return;
    }

    if (!window.FIREBASE_READY) { showToast('Not connected — try again shortly.', 'error'); return; }

    const btn = document.getElementById('gb-submit');
    btn.disabled = true; btn.textContent = 'Signing…';

    firebase.database().ref('guestbook/entries').push({
        name: name.slice(0, 40),
        url:  url.slice(0, 100),
        msg:  msg.slice(0, MAX_MSG),
        ts:   Date.now(),
    }).then(() => {
        document.getElementById('gb-name').value = '';
        document.getElementById('gb-url').value  = '';
        document.getElementById('gb-msg').value  = '';
        document.getElementById('gb-chars').textContent = '0';
        showToast('Entry added — thanks for signing!', 'success');
    }).catch(() => {
        showToast('Something went wrong. Please try again.', 'error');
    }).finally(() => {
        btn.disabled = false; btn.textContent = 'Sign the book →';
    });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderEntries() {
    const feed  = document.getElementById('gb-feed');
    const count = document.getElementById('gb-count');
    const old   = document.getElementById('gb-more');
    if (old) old.remove();

    if (!allEntries.length) {
        feed.innerHTML = '<div class="gb-empty">No entries yet — be the first to sign!</div>';
        count.textContent = '';
        return;
    }

    const slice = allEntries.slice(0, visibleCount);
    feed.innerHTML = slice.map(e => `
        <div class="gb-entry">
            <div class="gb-entry-meta">
                <span class="gb-name">${esc(e.name)}</span>
                ${e.url ? `<a class="gb-url" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(e.url).hostname)}</a>` : ''}
                <span class="gb-date">${fmtDate(e.ts)}</span>
                <button class="gb-delete" data-key="${esc(e.key)}" aria-label="Delete entry"${isAdmin() ? '' : ' hidden'}>✕</button>
            </div>
            <div class="gb-msg">${esc(e.msg)}</div>
        </div>
    `).join('');

    feed.querySelectorAll('.gb-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteEntry(btn.dataset.key));
    });

    count.textContent = allEntries.length + ' entr' + (allEntries.length === 1 ? 'y' : 'ies');

    if (allEntries.length > visibleCount) {
        const more = document.createElement('button');
        more.id        = 'gb-more';
        more.className = 'gb-more-btn';
        more.textContent = `Show more (${allEntries.length - visibleCount} remaining)`;
        more.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderEntries(); });
        feed.after(more);
    }
}

function deleteEntry(key) {
    if (!confirm('Delete this entry?')) return;
    firebase.database().ref('guestbook/entries/' + key).remove()
        .then(() => showToast('Entry deleted.', 'success'))
        .catch(() => showToast('Delete failed.', 'error'));
}

// ── Load ──────────────────────────────────────────────────────────────────────
function loadEntries() {
    if (!window.FIREBASE_READY) {
        document.getElementById('gb-feed').innerHTML = '<div class="gb-empty">Not connected.</div>';
        return;
    }
    firebase.database().ref('guestbook/entries')
        .orderByChild('ts')
        .limitToLast(MAX_ENTRIES)
        .on('value', snap => {
            allEntries = [];
            snap.forEach(c => allEntries.unshift({ key: c.key, ...c.val() }));
            renderEntries();
        });
}

loadEntries();
