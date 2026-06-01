'use strict';

// esc(), fmtDateLong(), renderMd(), showToast(), withFirebase(),
// verifyPin(), isAdmin(), rateGuard() from /js/utils.js

const EMOJIS    = ['👍','❤️','😂','🤯','✨'];
const PAGE_SIZE = 10;

let allPosts = [];

document.getElementById('admin-toggle').addEventListener('click', () => {
    if (isAdmin()) {
        sessionStorage.removeItem(ADMIN_KEY);
        document.getElementById('blog-write').classList.remove('visible');
        document.querySelectorAll('.post-delete').forEach(b => b.hidden = true);
        return;
    }
    const pin = prompt('Admin PIN:');
    if (!pin) return;
    verifyPin(pin).then(valid => {
        if (!valid) return;
        sessionStorage.setItem(ADMIN_KEY, '1');
        document.getElementById('blog-write').classList.add('visible');
        document.querySelectorAll('.post-delete').forEach(b => b.hidden = false);
    });
});

if (isAdmin()) document.getElementById('blog-write').classList.add('visible');

// ── Publish ───────────────────────────────────────────────────────────────────
document.getElementById('post-submit').addEventListener('click', () => {
    if (!isAdmin()) return;
    const title = document.getElementById('post-title-input').value.trim();
    const body  = document.getElementById('post-body-input').value.trim();
    const tag   = document.getElementById('post-tag-input').value.trim().toLowerCase() || 'update';
    if (!title || !body) { showToast('Title and body required.', 'error'); return; }
    if (!window.FIREBASE_READY) { showToast('Firebase not connected.', 'error'); return; }

    const btn = document.getElementById('post-submit');
    btn.disabled = true; btn.textContent = 'Publishing…';

    firebase.database().ref('blog/posts').push({ title, body, tag, ts: Date.now() })
        .then(() => {
            document.getElementById('post-title-input').value = '';
            document.getElementById('post-body-input').value  = '';
            document.getElementById('post-tag-input').value   = '';
            showToast('Post published.', 'success');
        })
        .catch(() => showToast('Publish failed. Try again.', 'error'))
        .finally(() => { btn.disabled = false; btn.textContent = 'Publish →'; });
});

// ── Render post ───────────────────────────────────────────────────────────────
function renderPost(key, data) {
    const div = document.createElement('div');
    div.className = 'blog-post';
    div.dataset.key = key;
    div.innerHTML = `
        <div class="post-meta">
            <span class="post-date">${fmtDateLong(data.ts)}</span>
            ${data.tag ? `<span class="post-tag">${esc(data.tag)}</span>` : ''}
            <button class="post-delete" title="Delete post" aria-label="Delete post"${isAdmin() ? '' : ' hidden'}>✕</button>
        </div>
        <div class="post-title">${esc(data.title)}</div>
        <div class="post-body">${renderMd(data.body)}</div>
        <div class="post-reactions" id="react-${key}"></div>
    `;

    div.querySelector('.post-delete').addEventListener('click', () => deletePost(key));

    const reactBar = div.querySelector(`#react-${key}`);
    EMOJIS.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className   = 'react-btn';
        btn.dataset.emoji = emoji;
        btn.textContent = emoji + ' 0';
        const storageKey = `blog_react_${key}_${emoji}`;
        if (localStorage.getItem(storageKey)) btn.classList.add('reacted');
        btn.addEventListener('click', () => handleReact(btn, key, emoji, storageKey));
        reactBar.appendChild(btn);
    });
    return div;
}

function deletePost(key) {
    if (!isAdmin() || !confirm('Delete this post?')) return;
    firebase.database().ref('blog/posts/' + key).remove()
        .then(() => showToast('Post deleted.', 'success'))
        .catch(() => showToast('Delete failed.', 'error'));
}

function handleReact(btn, key, emoji, storageKey) {
    if (!window.FIREBASE_READY) return;
    if (!rateGuard('react-' + key + emoji, 2000)) return;
    const ref     = firebase.database().ref(`blog/reactions/${key}/${emoji}`);
    const already = !!localStorage.getItem(storageKey);
    ref.transaction(cur => (cur || 0) + (already ? -1 : 1));
    if (already) localStorage.removeItem(storageKey);
    else         localStorage.setItem(storageKey, '1');
    btn.classList.toggle('reacted', !already);
}

// ── Feed with pagination ──────────────────────────────────────────────────────
let visibleCount = PAGE_SIZE;

function renderFeed() {
    const feed = document.getElementById('blog-feed');
    const old  = document.getElementById('blog-more');
    if (old) old.remove();

    feed.innerHTML = '';
    const slice = allPosts.slice(0, visibleCount);
    slice.forEach(p => feed.appendChild(renderPost(p.key, p)));

    // Reaction live counts
    slice.forEach(p => {
        firebase.database().ref(`blog/reactions/${p.key}`).on('value', snap => {
            const counts = snap.val() || {};
            const bar = document.getElementById(`react-${p.key}`);
            if (!bar) return;
            bar.querySelectorAll('.react-btn').forEach(btn => {
                btn.textContent = btn.dataset.emoji + ' ' + (counts[btn.dataset.emoji] || 0);
            });
        });
    });

    if (allPosts.length > visibleCount) {
        const more = document.createElement('button');
        more.id        = 'blog-more';
        more.className = 'blog-more-btn';
        more.textContent = `Show more (${allPosts.length - visibleCount} remaining)`;
        more.addEventListener('click', () => { visibleCount += PAGE_SIZE; renderFeed(); });
        feed.after(more);
    }
}

function loadFeed() {
    if (!window.FIREBASE_READY) {
        document.getElementById('blog-feed').innerHTML = '<div class="blog-empty">Firebase not connected.</div>';
        return;
    }
    firebase.database().ref('blog/posts').orderByChild('ts').on('value', snap => {
        allPosts = [];
        snap.forEach(c => allPosts.unshift({ key: c.key, ...c.val() }));
        if (!allPosts.length) {
            document.getElementById('blog-feed').innerHTML = '<div class="blog-empty">No posts yet. Check back soon.</div>';
            return;
        }
        renderFeed();
    });
}

loadFeed();
