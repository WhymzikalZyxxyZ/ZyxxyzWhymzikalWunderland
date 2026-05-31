'use strict';

// esc(), fmtDate(), withFirebase() provided by /js/utils.js

const MAX_MSG = 400;
const MAX_ENTRIES = 200;

// ── Char counter ──────────────────────────────────────────────────────────────
document.getElementById('gb-msg').addEventListener('input', function() {
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

    // Basic URL validation
    if (url && !/^https?:\/\/.+/.test(url)) {
        alert('Website URL should start with http:// or https://');
        return;
    }

    if (!window.FIREBASE_READY) { alert('Not connected — try again shortly.'); return; }

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
        btn.disabled = false; btn.textContent = 'Sign the book →';
    }).catch(() => {
        btn.disabled = false; btn.textContent = 'Sign the book →';
        alert('Something went wrong. Please try again.');
    });
}

// ── Load entries ──────────────────────────────────────────────────────────────
function loadEntries() {
    if (!window.FIREBASE_READY) {
        document.getElementById('gb-feed').innerHTML = '<div class="gb-empty">Not connected.</div>';
        return;
    }

    firebase.database().ref('guestbook/entries')
        .orderByChild('ts')
        .limitToLast(MAX_ENTRIES)
        .on('value', snap => {
            const entries = [];
            snap.forEach(c => entries.unshift({ key: c.key, ...c.val() }));
            renderEntries(entries);
        });
}

function renderEntries(entries) {
    const feed = document.getElementById('gb-feed');
    const count = document.getElementById('gb-count');

    if (!entries.length) {
        feed.innerHTML = '<div class="gb-empty">No entries yet — be the first to sign!</div>';
        count.textContent = '';
        return;
    }

    feed.innerHTML = entries.map(e => `
        <div class="gb-entry">
            <div class="gb-entry-meta">
                <span class="gb-name">${esc(e.name)}</span>
                ${e.url ? `<a class="gb-url" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(e.url).hostname)}</a>` : ''}
                <span class="gb-date">${fmtDate(e.ts)}</span>
            </div>
            <div class="gb-msg">${esc(e.msg)}</div>
        </div>
    `).join('');

    count.textContent = entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies');
}

loadEntries();
