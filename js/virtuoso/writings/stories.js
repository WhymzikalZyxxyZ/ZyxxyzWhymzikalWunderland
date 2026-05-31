// ════════════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════════════
function switchTab(t) {
    ['library','write'].forEach(id => {
        document.getElementById('tab-'+id).classList.toggle('active', id===t);
        document.getElementById('tab-'+id+'-content').style.display = id===t ? '' : 'none';
    });
}

// ════════════════════════════════════════════════════════════════════════
// AUTHOR / USERNAME
// ════════════════════════════════════════════════════════════════════════
let currentAuthor = '';

function initAuthor() {
    currentAuthor = getOrCreateUsername();
    document.getElementById('write-author-name').textContent = currentAuthor;
}

function openUsernameModal() {
    document.getElementById('username-input').value = currentAuthor;
    document.getElementById('username-modal').classList.add('open');
    setTimeout(() => document.getElementById('username-input').focus(), 50);
}

function closeUsernameModal() {
    document.getElementById('username-modal').classList.remove('open');
}

function randomiseUsername() {
    document.getElementById('username-input').value = genUsername();
}

function saveUsername() {
    const val = document.getElementById('username-input').value.trim();
    try {
        setUsername(val);
        currentAuthor = val;
        document.getElementById('write-author-name').textContent = currentAuthor;
        closeUsernameModal();
    } catch (_) {
        document.getElementById('username-input').style.borderColor = '#e74c3c';
        setTimeout(() => document.getElementById('username-input').style.borderColor = '', 1200);
    }
}

document.getElementById('username-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveUsername();
    if (e.key === 'Escape') closeUsernameModal();
});
document.getElementById('username-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('username-modal')) closeUsernameModal();
});

// ════════════════════════════════════════════════════════════════════════
// WRITE — word count & publish state
// ════════════════════════════════════════════════════════════════════════
function wordCount(text) {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function updateWriteState() {
    const body  = document.getElementById('story-editor').value;
    const title = document.getElementById('story-title').value.trim();
    const wc    = wordCount(body);
    const cc    = body.length;
    document.getElementById('wc-num').textContent = wc.toLocaleString();
    document.getElementById('cc-num').textContent = cc.toLocaleString();
    document.getElementById('publish-btn').disabled = !(title && wc >= 5);
}

// ════════════════════════════════════════════════════════════════════════
// FIREBASE
// ════════════════════════════════════════════════════════════════════════
let db       = null;
let allStories = [];

function initFirebase() {
    if (typeof firebase === 'undefined' || !FIREBASE_READY) return;
    try { db = firebase.database(); } catch (_) { return; }
    db.ref('stories').orderByChild('timestamp').on('value', snap => {
        allStories = [];
        snap.forEach(child => {
            allStories.unshift({ id: child.key, ...child.val() });
        });
        renderLibrary(allStories);
    });
}

// ════════════════════════════════════════════════════════════════════════
// PUBLISH
// ════════════════════════════════════════════════════════════════════════
function publishStory() {
    const title  = document.getElementById('story-title').value.trim();
    const body   = document.getElementById('story-editor').value.trim();
    const genre  = document.getElementById('story-genre').value;
    const author = currentAuthor;
    const wc     = wordCount(body);

    if (!title || wc < 5) return;

    const btn    = document.getElementById('publish-btn');
    const status = document.getElementById('pub-status');
    btn.disabled = true;
    btn.textContent = 'Publishing…';
    status.className = 'pub-status';
    status.style.display = 'none';

    const story = { title, author, genre, body, wordCount: wc, timestamp: Date.now() };

    if (!db) {
        // Offline fallback — store locally
        const localId = 'local_' + Date.now();
        allStories.unshift({ id: localId, ...story });
        renderLibrary(allStories);
        onPublishSuccess(btn);
        return;
    }

    db.ref('stories').push(story)
        .then(() => onPublishSuccess(btn))
        .catch(err => onPublishError(btn, status, err));
}

function onPublishSuccess(btn) {
    document.getElementById('story-title').value  = '';
    document.getElementById('story-editor').value = '';
    updateWriteState();
    const status = document.getElementById('pub-status');
    status.textContent = '&#10003; Story published!';
    status.className   = 'pub-status ok';
    btn.textContent    = '&#10026; Publish Story';
    btn.disabled       = true;
    switchTab('library');
    setTimeout(() => { status.className = 'pub-status'; }, 3000);
}

function onPublishError(btn, status, err) {
    btn.disabled    = false;
    btn.textContent = '&#10026; Publish Story';
    status.textContent = 'Error: ' + (err && err.message ? err.message : 'Could not save.');
    status.className   = 'pub-status err';
}

// ════════════════════════════════════════════════════════════════════════
// LIBRARY — render & filter
// ════════════════════════════════════════════════════════════════════════
const GENRE_LABELS = {
    fantasy:'Fantasy', scifi:'Sci-Fi', horror:'Horror', romance:'Romance',
    mystery:'Mystery', adventure:'Adventure', drama:'Drama', comedy:'Comedy', other:'Other'
};

function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function excerpt(text, len) {
    if (!text) return '';
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length <= len ? clean : clean.slice(0, len).trimEnd() + '…';
}

function renderLibrary(stories) {
    const grid  = document.getElementById('story-grid');
    const count = document.getElementById('lib-count');

    if (!stories.length) {
        grid.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1;">' +
            '<span class="em-icon">&#128213;</span>' +
            'No stories yet.<br>Be the first to write one!' +
            '</div>';
        count.textContent = '';
        return;
    }

    count.textContent = stories.length + (stories.length === 1 ? ' story' : ' stories');
    grid.innerHTML = '';

    stories.forEach(story => {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.innerHTML =
            '<div class="story-card-header">' +
                '<div class="story-title">' + escHtml(story.title || 'Untitled') + '</div>' +
                (story.genre ? '<span class="genre-tag">' + escHtml(GENRE_LABELS[story.genre] || story.genre) + '</span>' : '') +
            '</div>' +
            '<div class="story-author"><span class="author-name">' + escHtml(story.author || 'Anonymous') + '</span></div>' +
            '<div class="story-excerpt">' + escHtml(excerpt(story.body || '', 280)) + '</div>' +
            '<div class="story-footer">' +
                '<div class="story-meta">' +
                    '<span>' + (story.wordCount ? story.wordCount.toLocaleString() + ' words' : '') + '</span>' +
                    '<span>' + formatDate(story.timestamp) + '</span>' +
                '</div>' +
                '<button class="read-btn" onclick="openReader(' + JSON.stringify(story.id) + ')">Read &#8594;</button>' +
            '</div>';
        grid.appendChild(card);
    });
}

function filterStories() {
    const query = document.getElementById('lib-search').value.toLowerCase();
    const genre = document.getElementById('lib-genre').value;
    const filtered = allStories.filter(s => {
        const matchGenre  = !genre || s.genre === genre;
        const matchSearch = !query ||
            (s.title  || '').toLowerCase().includes(query) ||
            (s.author || '').toLowerCase().includes(query) ||
            (s.body   || '').toLowerCase().includes(query);
        return matchGenre && matchSearch;
    });
    renderLibrary(filtered);
}

// ════════════════════════════════════════════════════════════════════════
// READER
// ════════════════════════════════════════════════════════════════════════
function openReader(storyId) {
    const story = allStories.find(s => s.id === storyId);
    if (!story) return;
    document.getElementById('reader-title').textContent  = story.title  || 'Untitled';
    document.getElementById('reader-author').textContent = story.author || 'Anonymous';
    document.getElementById('reader-body').textContent   = story.body   || '';
    document.getElementById('reader-meta').textContent   =
        (story.genre ? (GENRE_LABELS[story.genre] || story.genre) + ' · ' : '') +
        (story.wordCount ? story.wordCount.toLocaleString() + ' words · ' : '') +
        formatDate(story.timestamp);
    document.getElementById('reader-view').style.display  = '';
    document.getElementById('library-view').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeReader() {
    document.getElementById('reader-view').style.display  = 'none';
    document.getElementById('library-view').style.display = '';
}

// ════════════════════════════════════════════════════════════════════════
// UTILS
// ════════════════════════════════════════════════════════════════════════
function escHtml(s) {
    return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

// ════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════
initAuthor();
initFirebase();
updateWriteState();
