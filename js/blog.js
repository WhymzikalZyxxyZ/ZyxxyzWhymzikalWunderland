'use strict';

// esc(), fmtDate(), fmtDateLong(), withFirebase() provided by /js/utils.js

const ADMIN_KEY = 'blog_admin_unlocked';
const EMOJIS = ['👍','❤️','😂','🤯','✨'];

function isAdmin() { return sessionStorage.getItem(ADMIN_KEY) === '1'; }

document.getElementById('admin-toggle').addEventListener('click', () => {
    if (isAdmin()) { sessionStorage.removeItem(ADMIN_KEY); document.getElementById('blog-write').classList.remove('visible'); return; }
    const pin = prompt('Admin PIN:');
    if (pin === 'ZYXXYZ') { sessionStorage.setItem(ADMIN_KEY, '1'); document.getElementById('blog-write').classList.add('visible'); }
});

if (isAdmin()) document.getElementById('blog-write').classList.add('visible');

// ── Publish post ──────────────────────────────────────────────────────────────
document.getElementById('post-submit').addEventListener('click', () => {
    const title = document.getElementById('post-title-input').value.trim();
    const body  = document.getElementById('post-body-input').value.trim();
    const tag   = document.getElementById('post-tag-input').value.trim().toLowerCase() || 'update';
    if (!title || !body) { alert('Title and body required.'); return; }
    if (!window.FIREBASE_READY) { alert('Firebase not connected.'); return; }

    const ref = firebase.database().ref('blog/posts').push();
    ref.set({ title, body, tag, ts: Date.now() }).then(() => {
        document.getElementById('post-title-input').value = '';
        document.getElementById('post-body-input').value  = '';
        document.getElementById('post-tag-input').value   = '';
    });
});

// ── Render feed ───────────────────────────────────────────────────────────────
function renderPost(key, data) {
    const div = document.createElement('div');
    div.className = 'blog-post';
    div.innerHTML = `
        <div class="post-meta">
            <span class="post-date">${fmtDateLong(data.ts)}</span>
            ${data.tag ? `<span class="post-tag">${esc(data.tag)}</span>` : ''}
        </div>
        <div class="post-title">${esc(data.title)}</div>
        <div class="post-body">${esc(data.body)}</div>
        <div class="post-reactions" id="react-${key}"></div>
    `;
    // Reactions
    const reactBar = div.querySelector(`#react-${key}`);
    EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'react-btn';
        btn.dataset.emoji = emoji;
        btn.dataset.key   = key;
        btn.textContent   = emoji + ' 0';
        const storageKey  = `blog_react_${key}_${emoji}`;
        if (localStorage.getItem(storageKey)) btn.classList.add('reacted');
        btn.addEventListener('click', () => handleReact(btn, key, emoji, storageKey));
        reactBar.appendChild(btn);
    });
    return div;
}

function handleReact(btn, key, emoji, storageKey) {
    if (!window.FIREBASE_READY) return;
    const ref = firebase.database().ref(`blog/reactions/${key}/${emoji}`);
    const already = !!localStorage.getItem(storageKey);
    ref.transaction(cur => (cur || 0) + (already ? -1 : 1));
    if (already) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, '1');
    btn.classList.toggle('reacted', !already);
}

function loadFeed() {
    if (!window.FIREBASE_READY) {
        document.getElementById('blog-feed').innerHTML = '<div class="blog-empty">Firebase not connected.</div>';
        return;
    }

    const feed = document.getElementById('blog-feed');
    firebase.database().ref('blog/posts').orderByChild('ts').on('value', snap => {
        const posts = [];
        snap.forEach(c => posts.unshift({ key: c.key, ...c.val() }));

        if (!posts.length) {
            feed.innerHTML = '<div class="blog-empty">No posts yet. Check back soon.</div>';
            return;
        }

        feed.innerHTML = '';
        posts.forEach(p => feed.appendChild(renderPost(p.key, p)));

        // Reaction counts live update
        posts.forEach(p => {
            firebase.database().ref(`blog/reactions/${p.key}`).on('value', snap => {
                const counts = snap.val() || {};
                const bar = document.getElementById(`react-${p.key}`);
                if (!bar) return;
                bar.querySelectorAll('.react-btn').forEach(btn => {
                    const e = btn.dataset.emoji;
                    btn.textContent = e + ' ' + (counts[e] || 0);
                });
            });
        });
    });
}

loadFeed();
