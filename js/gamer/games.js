/* global getOrCreateUsername */
function fmtDaeMs(ms) {
            const s = Math.floor(ms / 100) / 10;
            const m = Math.floor(s / 60), sec = s % 60;
            return String(m).padStart(2,'0') + ':' + sec.toFixed(1).padStart(4,'0');
        }

        function bindDaedalusScore(fbPath, numId, userId) {
            if (!window.FIREBASE_READY) return;
            firebase.database().ref(fbPath).on('value', snap => {
                const v = snap.val();
                if (v === null || v === undefined) return;
                if (typeof v === 'object' && Number.isFinite(v.score)) {
                    document.getElementById(numId).textContent = fmtDaeMs(v.score);
                    document.getElementById(userId).textContent =
                        typeof v.username === 'string' ? v.username.slice(0, 30) : '—';
                }
            });
        }

        bindDaedalusScore('scores/daedalus', 'world-daedalus', 'user-daedalus');

        if (typeof getOrCreateUsername === 'function') {
            document.getElementById('username-display').textContent = getOrCreateUsername();
        }

        function bindScore(fbPath, numId, userId) {
            if (!window.FIREBASE_READY) return;
            firebase.database().ref(fbPath).on('value', snap => {
                const v = snap.val();
                if (v === null || v === undefined) return;
                // Support both old (plain number) and new ({score, username}) formats
                if (typeof v === 'object' && v !== null) {
                    const sc = (Number.isFinite(v.score) && v.score >= 0) ? v.score : 0;
                    document.getElementById(numId).textContent  = sc;
                    document.getElementById(userId).textContent =
                        typeof v.username === 'string' ? v.username.slice(0,30) : '—';
                } else {
                    const sc = (Number.isFinite(v) && v >= 0) ? v : 0;
                    document.getElementById(numId).textContent  = sc;
                    document.getElementById(userId).textContent = '—';
                }
            });
        }

        bindScore('scores/tetris',       'world-tetris',       'user-tetris');
        bindScore('scores/snake',        'world-snake',        'user-snake');
        bindScore('scores/chess',        'world-chess',        'user-chess');
        bindScore('scores/checkers',     'world-checkers',     'user-checkers');
        bindScore('scores/pong',         'world-pong',         'user-pong');
        bindScore('scores/rps',          'world-rps',          'user-rps');
        bindScore('scores/puzzle',       'world-puzzle',       'user-puzzle');
        bindScore('scores/blackjack',    'world-blackjack',    'user-blackjack');
        bindScore('scores/solitaire',    'world-solitaire',    'user-solitaire');
        bindScore('scores/poker',        'world-poker',        'user-poker');
        bindScore('scores/fivecarddraw', 'world-fivecarddraw', 'user-fivecarddraw');

        // ── Suggestions ────────────────────────────────────────────
        let suggestionsLoaded = false;

        function fmtTimestamp(ts) {
            const d = new Date(ts);
            const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return date + ' · ' + time;
        }

        function renderSuggestions(items) {
            const list = document.getElementById('suggestions-list');
            const empty = document.getElementById('suggestions-empty');
            if (!items || items.length === 0) {
                empty.style.display = '';
                return;
            }
            empty.style.display = 'none';
            // newest first
            items.sort((a, b) => b.timestamp - a.timestamp);
            list.innerHTML = '';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'sug-item';
                const meta = document.createElement('div');
                meta.className = 'sug-meta';
                meta.innerHTML = '<span class="sug-user">' + escHtml(item.username) + '</span>'
                    + '<span>' + fmtTimestamp(item.timestamp) + '</span>';
                const text = document.createElement('div');
                text.className = 'sug-text';
                text.textContent = item.text;
                div.appendChild(meta);
                div.appendChild(text);
                list.appendChild(div);
            });
        }

        function escHtml(s) {
            return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function loadSuggestions() {
            if (suggestionsLoaded) return;
            suggestionsLoaded = true;
            if (!window.FIREBASE_READY) return;
            firebase.database().ref('suggestions').on('value', snap => {
                const val = snap.val();
                const items = val ? Object.values(val) : [];
                renderSuggestions(items);
            });
        }

        function openSuggestions() {
            const overlay = document.getElementById('suggestions-overlay');
            const offline = document.getElementById('suggestions-offline');
            const form = document.getElementById('suggestions-form');
            const submit = document.getElementById('suggestions-submit');
            overlay.classList.add('open');
            if (!window.FIREBASE_READY) {
                offline.style.display = '';
                form.style.display = 'none';
            } else {
                offline.style.display = 'none';
                form.style.display = 'flex';
                submit.disabled = false;
            }
            loadSuggestions();
            document.getElementById('suggestion-input').focus();
        }

        function closeSuggestions() {
            document.getElementById('suggestions-overlay').classList.remove('open');
        }

        function submitSuggestion() {
            if (!window.FIREBASE_READY) return;
            const input = document.getElementById('suggestion-input');
            const text = input.value.trim();
            if (!text) return;
            const username = (typeof getOrCreateUsername === 'function')
                ? getOrCreateUsername() : 'Anonymous';
            const submit = document.getElementById('suggestions-submit');
            submit.disabled = true;
            firebase.database().ref('suggestions').push({
                text: text,
                username: username,
                timestamp: Date.now()
            }).then(() => {
                input.value = '';
                submit.disabled = false;
            }).catch(() => {
                submit.disabled = false;
            });
        }

        document.getElementById('suggestions-overlay').addEventListener('click', function(e) {
            if (e.target === this) closeSuggestions();
        });

        document.getElementById('suggestion-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') submitSuggestion();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeSuggestions();
        });
