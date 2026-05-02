'use strict';

(function () {
    const MAX_MSG       = 200;
    const MAX_DISPLAY   = 60;
    const CHAT_FB_PATH  = 'gamerChat/messages';
    const USERNAME_KEY  = 'zyxUsername';

    function escHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getUsername() {
        try {
            const s = localStorage.getItem(USERNAME_KEY);
            if (s && /^[A-Za-z]{6,32}_\d{3}$/.test(s)) return s;
        } catch (_) { /* ignore */ }
        return 'Guest_' + Math.floor(Math.random() * 9000 + 1000);
    }

    const username = getUsername();

    // ── Inject styles ───────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #gc-widget {
            position: fixed; bottom: 20px; right: 20px;
            width: 280px; max-height: 400px;
            background: rgba(10,10,18,0.94);
            border: 1px solid rgba(244,162,97,0.35);
            border-radius: 12px;
            display: flex; flex-direction: column;
            z-index: 9000; font-family: 'Courier New', monospace;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            transition: max-height 0.2s ease;
        }
        #gc-widget.collapsed { max-height: 42px; overflow: hidden; }
        #gc-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 12px; cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.07);
            flex-shrink: 0;
        }
        #gc-title {
            font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
            color: #f4a261;
        }
        #gc-toggle {
            background: none; border: none; color: #888; cursor: pointer;
            font-size: 14px; padding: 0 2px; line-height: 1;
        }
        #gc-user-label {
            font-size: 9px; color: #555; padding: 4px 12px 0;
            letter-spacing: 1px; flex-shrink: 0;
        }
        #gc-user-label span { color: #f4a261; }
        #gc-messages {
            flex: 1; overflow-y: auto; padding: 8px 10px;
            display: flex; flex-direction: column; gap: 6px;
            min-height: 0;
        }
        #gc-messages::-webkit-scrollbar { width: 3px; }
        #gc-messages::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
        .gc-msg { display: flex; flex-direction: column; gap: 1px; }
        .gc-msg-meta { font-size: 9px; color: #555; }
        .gc-msg-meta.mine { color: #f4a261; text-align: right; }
        .gc-msg-bubble {
            font-size: 11px; line-height: 1.5; padding: 5px 8px;
            border-radius: 7px; word-break: break-word; max-width: 100%;
        }
        .gc-msg.mine .gc-msg-bubble {
            background: rgba(244,162,97,0.18); color: #f0e8d8;
            align-self: flex-end;
        }
        .gc-msg.theirs .gc-msg-bubble {
            background: rgba(255,255,255,0.07); color: #ccc;
            align-self: flex-start;
        }
        #gc-input-row {
            display: flex; gap: 5px; padding: 8px 10px;
            border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0;
        }
        #gc-input {
            flex: 1; background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 6px; color: #eee; font-family: 'Courier New', monospace;
            font-size: 11px; padding: 5px 8px; outline: none;
        }
        #gc-input:focus { border-color: #f4a261; }
        #gc-send {
            background: #f4a261; border: none; border-radius: 6px;
            color: #111; font-family: 'Courier New', monospace;
            font-size: 11px; font-weight: bold; padding: 5px 10px; cursor: pointer;
        }
        #gc-send:hover { background: #e76f51; }
        #gc-status {
            font-size: 9px; color: #4caf50; padding: 0 12px 4px;
            letter-spacing: 1px; flex-shrink: 0;
        }
    `;
    document.head.appendChild(style);

    // ── Build DOM ───────────────────────────────────────────────────────────
    const widget = document.createElement('div');
    widget.id = 'gc-widget';
    widget.innerHTML = `
        <div id="gc-header">
            <span id="gc-title">&#127918; Game Chat</span>
            <button id="gc-toggle" title="Toggle chat">&#8722;</button>
        </div>
        <div id="gc-user-label">Playing as <span>${escHtml(username)}</span></div>
        <div id="gc-status" id="gc-status"></div>
        <div id="gc-messages"></div>
        <div id="gc-input-row">
            <input id="gc-input" type="text" placeholder="Say something..." maxlength="${MAX_MSG}" autocomplete="off">
            <button id="gc-send">Send</button>
        </div>
    `;
    document.body.appendChild(widget);

    const header   = document.getElementById('gc-header');
    const toggle   = document.getElementById('gc-toggle');
    const messages = document.getElementById('gc-messages');
    const input    = document.getElementById('gc-input');
    const send     = document.getElementById('gc-send');
    const status   = document.getElementById('gc-status');

    let collapsed = false;
    header.addEventListener('click', () => {
        collapsed = !collapsed;
        widget.classList.toggle('collapsed', collapsed);
        toggle.textContent = collapsed ? '+' : '−';
    });

    function appendMessage(username, text, ts) {
        const isMe = username === getUsername();
        const div  = document.createElement('div');
        div.className = 'gc-msg ' + (isMe ? 'mine' : 'theirs');
        const time  = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        div.innerHTML = `
            <div class="gc-msg-meta ${isMe ? 'mine' : ''}">${escHtml(username)} · ${time}</div>
            <div class="gc-msg-bubble">${escHtml(text)}</div>
        `;
        messages.appendChild(div);
        // Trim to MAX_DISPLAY
        while (messages.children.length > MAX_DISPLAY) messages.removeChild(messages.firstChild);
        messages.scrollTop = messages.scrollHeight;
    }

    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        if (typeof firebase === 'undefined' || !window.FIREBASE_READY) return;
        try {
            firebase.database().ref(CHAT_FB_PATH).push({
                username: String(username).slice(0, 40),
                text:     String(text).slice(0, MAX_MSG),
                ts:       firebase.database.ServerValue.TIMESTAMP,
            });
        } catch (_) { /* ignore */ }
    }

    send.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });

    // ── Firebase connection ─────────────────────────────────────────────────
    function connectChat() {
        if (typeof firebase === 'undefined' || !window.FIREBASE_READY) {
            status.textContent = '○ offline';
            return;
        }
        status.textContent = '● live';
        const ref = firebase.database().ref(CHAT_FB_PATH).limitToLast(MAX_DISPLAY);
        ref.on('child_added', snap => {
            const d = snap.val();
            if (!d || typeof d.username !== 'string' || typeof d.text !== 'string') return;
            appendMessage(d.username.slice(0, 40), d.text.slice(0, MAX_MSG), d.ts || Date.now());
        });
    }

    // Wait for Firebase to be initialized by the page's firebase-config.js
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connectChat);
    } else {
        connectChat();
    }
})();
