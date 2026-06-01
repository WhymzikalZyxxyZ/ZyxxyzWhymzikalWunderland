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

        // ── Helpers ───────────────────────────────────────────────────────────────────
        const chatMessages = document.getElementById('chat-messages');
        const statusDot    = document.getElementById('chat-status-dot');
        const chatInput    = document.getElementById('chat-input');
        const chatSend     = document.getElementById('chat-send');

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
        function addMessageEl(username, text, ts, isMine) {
            const div = document.createElement('div');
            div.className = 'msg ' + (isMine ? 'mine' : 'theirs');

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

            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble';
            bubble.textContent = text;

            div.appendChild(meta);
            div.appendChild(bubble);

            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // ── Firebase ──────────────────────────────────────────────────────────────────
        let sendMessage = () => {};

        if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
            const messagesRef = firebase.database().ref('forum/messages');
            let myUsername    = null;
            let lastSent      = 0;

            sendMessage = function () {
                if (!myUsername) return;
                const text = chatInput.value.trim();
                if (!text || text.length > 500) return;
                if (Date.now() - lastSent < 1500) return;
                lastSent = Date.now();
                messagesRef.push({ username: myUsername, text, ts: Date.now() });
                chatInput.value = '';
                document.getElementById('char-count').textContent = '0 / 500';
                document.getElementById('char-count').classList.remove('warn');
            };

            firebase.database().ref('.info/connected').on('value', snap => {
                statusDot.textContent = snap.val() ? '● live' : '● reconnecting';
                statusDot.classList.toggle('live', !!snap.val());
            });

            initUsername().then(username => {
                myUsername = username;
                document.getElementById('chat-username').textContent = username;
                chatInput.disabled    = false;
                chatSend.disabled     = false;
                chatInput.placeholder = 'Say something...';
                chatInput.focus();

                let initialLoad = true;
                messagesRef.orderByChild('ts').limitToLast(100).on('child_added', snapshot => {
                    if (initialLoad) {
                        addSystemMsg('— last 100 messages —');
                        initialLoad = false;
                    }
                    const msg = snapshot.val();
                    if (msg && msg.text) {
                        addMessageEl(msg.username, msg.text, msg.ts, msg.username === myUsername);
                    }
                });
            });

        } else {
            statusDot.textContent = '● not configured';
            const myUsername = sessionStorage.getItem('forumUsername') || genUsername();
            sessionStorage.setItem('forumUsername', myUsername);
            document.getElementById('chat-username').textContent = myUsername;
            addSystemMsg('— chat requires Firebase — see /js/firebase-config.js —');
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
