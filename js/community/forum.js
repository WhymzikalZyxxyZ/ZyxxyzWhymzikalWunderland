// ── Username pool ─────────────────────────────────────────────────────────────
        const ADJS  = ['Cosmic','Neon','Velvet','Funky','Mystic','Jazzy','Quirky','Sneaky',
                        'Zesty','Fuzzy','Glitchy','Lunar','Tangy','Wobbly','Spiffy'];
        const NOUNS = ['Penguin','Wizard','Pickle','Comet','Noodle','Goblin','Muffin','Platypus',
                        'Biscuit','Cactus','Gnome','Waffle','Ferret','Pebble','Sprocket'];

        function genUsername() {
            const adj  = ADJS[Math.floor(Math.random() * ADJS.length)];
            const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
            return `${adj}${noun}_${Math.floor(Math.random() * 900 + 100)}`;
        }

        function claimUsername(username) {
            const ref = firebase.database().ref(`forum/presence/${username}`);
            ref.onDisconnect().remove();
            return new Promise(resolve => {
                ref.transaction(
                    current => current === null ? { ts: Date.now() } : undefined,
                    (err, committed) => {
                        if (!committed) ref.onDisconnect().cancel();
                        resolve(!err && committed);
                    }
                );
            });
        }

        async function initUsername() {
            const stored = sessionStorage.getItem('forumUsername');
            if (stored && await claimUsername(stored)) return stored;
            let name;
            do { name = genUsername(); } while (!await claimUsername(name));
            sessionStorage.setItem('forumUsername', name);
            return name;
        }

        // ── Session UID (anonymous authorship for delete) ─────────────────────────
        let myUid = sessionStorage.getItem('forumUid');
        if (!myUid) {
            myUid = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
            sessionStorage.setItem('forumUid', myUid);
        }

        // ── Helpers ───────────────────────────────────────────────────────────────────
        const chatMessages  = document.getElementById('chat-messages');
        const statusDot     = document.getElementById('chat-status-dot');
        const chatInput     = document.getElementById('chat-input');
        const chatSend      = document.getElementById('chat-send');
        const loadOlderBtn  = document.getElementById('load-older-btn');

        function escHtml(str) {
            return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
        function fmtTime(ts) {
            const d = new Date(ts);
            const date = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return date + ' · ' + time;
        }
        function addSystemMsg(text) {
            const el = document.createElement('div');
            el.className = 'msg-system';
            el.textContent = text;
            chatMessages.appendChild(el);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        function addMessageEl(username, text, ts, isMine, msgKey, canDelete, prepend = false) {
            const div = document.createElement('div');
            div.className = 'msg ' + (isMine ? 'mine' : 'theirs');
            if (msgKey) div.dataset.key = msgKey;

            const meta = document.createElement('div');
            meta.className = 'msg-meta';

            const sender = document.createElement('span');
            sender.className = 'sender';
            sender.textContent = isMine ? 'You' : username;

            const time = document.createElement('span');
            time.className = 'time';
            time.textContent = ' · ' + fmtTime(ts);

            meta.appendChild(sender);
            meta.appendChild(time);

            if (canDelete && msgKey) {
                const del = document.createElement('button');
                del.className = 'msg-delete';
                del.textContent = '✕';
                del.title = 'Delete this message';
                del.setAttribute('aria-label', 'Delete message');
                del.addEventListener('click', () => deleteMessage(msgKey, div));
                meta.appendChild(del);
            }

            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            bubble.textContent = text;

            div.appendChild(meta);
            div.appendChild(bubble);

            if (prepend) {
                const firstMsg = chatMessages.querySelector('.msg, .msg-system');
                chatMessages.insertBefore(div, firstMsg || null);
            } else {
                chatMessages.appendChild(div);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        function deleteMessage(key, el) {
            if (!confirm('Delete this message?')) return;
            firebase.database().ref(`forum/messages/${key}`).remove()
                .then(() => el.remove())
                .catch(() => alert('Delete failed.'));
        }

        // ── Firebase ──────────────────────────────────────────────────────────────────
        let sendMessage = () => {};

        if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
            const messagesRef = firebase.database().ref('forum/messages');
            let myUsername    = null;
            let lastSent      = 0;
            let earliestTs    = Infinity;
            let loadingOlder  = false;

            sendMessage = function () {
                if (!myUsername) return;
                const text = chatInput.value.trim();
                if (!text || text.length > 500) return;
                if (Date.now() - lastSent < 1500) return;
                lastSent = Date.now();
                messagesRef.push({ username: myUsername, text, ts: Date.now(), uid: myUid });
                chatInput.value = '';
                document.getElementById('char-count').textContent = '0 / 500';
                document.getElementById('char-count').classList.remove('warn');
            };

            firebase.database().ref('.info/connected').on('value', snap => {
                statusDot.textContent = snap.val() ? '● live' : '● reconnecting';
                statusDot.classList.toggle('live', !!snap.val());
            });

            const loadOlderMessages = () => {
                if (loadingOlder || earliestTs === Infinity) return;
                loadingOlder = true;
                if (loadOlderBtn) { loadOlderBtn.disabled = true; loadOlderBtn.textContent = 'Loading…'; }
                messagesRef.orderByChild('ts').endAt(earliestTs - 1).limitToLast(20)
                    .once('value', snap => {
                        const older = [];
                        snap.forEach(child => older.push({ key: child.key, ...child.val() }));
                        if (older.length === 0) {
                            addSystemMsg('— beginning of chat —');
                            if (loadOlderBtn) loadOlderBtn.remove();
                        } else {
                            older.reverse().forEach(msg => {
                                if (msg.text) {
                                    const isMine = msg.username === myUsername;
                                    addMessageEl(msg.username, msg.text, msg.ts, isMine, msg.key, isMine || msg.uid === myUid, true);
                                    if (msg.ts < earliestTs) earliestTs = msg.ts;
                                }
                            });
                            if (loadOlderBtn) { loadOlderBtn.disabled = false; loadOlderBtn.textContent = 'Load older messages'; }
                        }
                        loadingOlder = false;
                    });
            }

            if (loadOlderBtn) loadOlderBtn.addEventListener('click', loadOlderMessages);

            initUsername().then(username => {
                myUsername = username;
                document.getElementById('chat-username').textContent = username;
                chatInput.disabled    = false;
                chatSend.disabled     = false;
                chatInput.placeholder = 'Say something...';
                chatInput.focus();

                let initialLoad = true;
                messagesRef.orderByChild('ts').limitToLast(50).on('child_added', snapshot => {
                    if (initialLoad) {
                        addSystemMsg('— last 50 messages —');
                        initialLoad = false;
                    }
                    const msg = snapshot.val();
                    if (msg && msg.text) {
                        const isMine = msg.username === myUsername;
                        if (msg.ts < earliestTs) earliestTs = msg.ts;
                        addMessageEl(msg.username, msg.text, msg.ts, isMine, snapshot.key, isMine || msg.uid === myUid);
                    }
                });
            });

        } else {
            statusDot.textContent = '● not configured';
            const myUsername = sessionStorage.getItem('forumUsername') || genUsername();
            sessionStorage.setItem('forumUsername', myUsername);
            document.getElementById('chat-username').textContent = myUsername;
            addSystemMsg('— chat requires Firebase — see /js/config/firebase-config.js —');
        }

        chatSend.addEventListener('click', () => sendMessage());
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
        chatInput.addEventListener('input', function () {
            const len     = this.value.length;
            const counter = document.getElementById('char-count');
            counter.textContent = `${len} / 500`;
            counter.classList.toggle('warn', len > 420);
        });
