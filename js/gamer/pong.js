/* global getOrCreateUsername, PONG_W, PONG_H, newPongState, getAIPaddleY, pongTick, PADDLE_W, PADDLE_H, BALL_R, PONG_MAX_SCORE */
const myName = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        document.getElementById('user-label').textContent = myName;

        const canvas  = document.getElementById('pong-canvas');
        const ctx     = canvas.getContext('2d');
        const FB_HS   = 'scores/pong';
        const scaleX  = () => canvas.clientWidth / PONG_W;
        const scaleY  = () => canvas.clientHeight / PONG_H;

        let state     = newPongState();
        let rafId     = null;
        let paused    = false;
        let running   = false;
        let diff      = 4;
        let keysDown  = {};

        document.addEventListener('keydown', e => { keysDown[e.key] = true; });
        document.addEventListener('keyup',   e => { keysDown[e.key] = false; });

        document.getElementById('diff-slider').addEventListener('input', function() {
            diff = +this.value;
            document.getElementById('diff-val').textContent = this.value;
        });

        function setMode(m) {
            document.getElementById('sp-panel').style.display = m==='sp' ? '' : 'none';
            document.getElementById('mp-panel').style.display = m==='mp' ? '' : 'none';
            document.getElementById('btn-sp').classList.toggle('active', m==='sp');
            document.getElementById('btn-mp').classList.toggle('active', m==='mp');
            if (running) { cancelAnimationFrame(rafId); running = false; }
        }

        function startGame() {
            state   = newPongState();
            paused  = false;
            running = true;
            document.getElementById('btn-start').disabled = true;
            document.getElementById('btn-pause').disabled = false;
            document.getElementById('btn-reset').disabled = false;
            document.getElementById('pong-msg').textContent = '';
            loop();
        }

        function togglePause() {
            paused = !paused;
            document.getElementById('btn-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
            if (!paused) loop();
        }

        function resetGame() {
            cancelAnimationFrame(rafId);
            running = false; paused = false;
            state = newPongState();
            render(state);
            document.getElementById('score-left').textContent  = 0;
            document.getElementById('score-right').textContent = 0;
            document.getElementById('btn-start').disabled  = false;
            document.getElementById('btn-pause').disabled  = true;
            document.getElementById('btn-reset').disabled  = true;
            document.getElementById('btn-pause').textContent = '⏸ Pause';
            document.getElementById('pong-msg').textContent = 'Press Start to play.';
        }

        function loop() {
            if (!running || paused) return;
            const speed = 4;
            let leftY = state.left.y;
            if (keysDown._touchLeftY !== undefined) {
                leftY = keysDown._touchLeftY;
            } else {
                if (keysDown['w'] || keysDown['W'] || keysDown['ArrowUp'])    leftY -= speed;
                if (keysDown['s'] || keysDown['S'] || keysDown['ArrowDown'])  leftY += speed;
            }
            const aiRightY = getAIPaddleY(state, 'right', diff);
            state = pongTick(state, leftY, aiRightY);
            document.getElementById('score-left').textContent  = state.score.left;
            document.getElementById('score-right').textContent = state.score.right;
            if (state.scored) checkHighScore(state.score.left);
            render(state);
            rafId = requestAnimationFrame(loop);
        }

        function render(s) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, PONG_W, PONG_H);
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(PONG_W/2, 0); ctx.lineTo(PONG_W/2, PONG_H);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, s.left.y, PADDLE_W, PADDLE_H);
            ctx.fillRect(PONG_W - PADDLE_W, s.right.y, PADDLE_W, PADDLE_H);
            ctx.beginPath();
            ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI*2);
            ctx.fill();
        }

        function checkHighScore(score) {
            if (!window.FIREBASE_READY || score <= 0) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (score > cur) ref.set({ score: Math.min(score, PONG_MAX_SCORE), username: String(myName).slice(0,40) });
            });
        }

        if (window.FIREBASE_READY) {
            firebase.database().ref(FB_HS).on('value', snap => {
                const v = snap.val();
                if (!v) return;
                document.getElementById('hs-val').textContent  = Number.isFinite(v.score) ? v.score : '—';
                document.getElementById('hs-user').textContent = typeof v.username === 'string' ? v.username.slice(0,40) : '—';
            });
        }

        // ── Multiplayer ──────────────────────────────────────────────────────
        const MP_BASE = 'pongRooms';
        let mpRoomId=null, mpRole=null, mpRafId=null, mpState=null, mpRunning=false;
        const mpCanvas = document.getElementById('pong-canvas-mp');
        const mpCtx    = mpCanvas.getContext('2d');

        function mpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            mpRoomId = Math.random().toString(36).slice(2,8).toUpperCase();
            mpRole   = 'p1';
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).set({
                p1: myName, p2: null,
                leftY: PONG_H/2 - PADDLE_H/2, rightY: PONG_H/2 - PADDLE_H/2,
                ball: newPongState().ball,
                scoreLeft: 0, scoreRight: 0, status: 'waiting'
            });
            document.getElementById('mp-status').textContent = 'Waiting for opponent. Code: ';
            document.getElementById('room-code-disp').textContent = mpRoomId;
            mpListen();
        }

        function mpJoin() {
            const code = document.getElementById('mp-join-code').value.trim().toUpperCase().slice(0,6);
            if (!code || !window.FIREBASE_READY) return;
            mpRoomId = code; mpRole = 'p2';
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).once('value', snap => {
                if (!snap.val()) { document.getElementById('mp-status').textContent = 'Room not found.'; return; }
                firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({ p2: myName, status: 'active' });
                document.getElementById('mp-status').textContent = `Joined ${code}`;
                document.getElementById('mp-game').style.display = '';
                mpListen();
                mpGameLoop();
            });
        }

        function mpListen() {
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).on('value', snap => {
                const d = snap.val();
                if (!d) return;
                if (d.p2 && d.status === 'active') {
                    document.getElementById('mp-game').style.display = '';
                    document.getElementById('mp-status').textContent = `${d.p1} vs ${d.p2}`;
                    if (mpRole === 'p1' && !mpRunning) { mpRunning = true; mpState = newPongState(); mpGameLoop(); }
                }
                if (d.scoreLeft !== undefined) document.getElementById('mp-score-left').textContent  = d.scoreLeft;
                if (d.scoreRight!== undefined) document.getElementById('mp-score-right').textContent = d.scoreRight;
                // Sync state from Firebase (p2 reads, p1 writes)
                if (mpRole === 'p2' && d.ball && d.leftY !== undefined) {
                    const s = { ball:{...d.ball}, left:{y:d.leftY}, right:{y:d.rightY||0},
                                score:{left:d.scoreLeft||0,right:d.scoreRight||0}, paused:false };
                    renderPong(mpCtx, s);
                }
            });
        }

        function mpGameLoop() {
            if (mpRole !== 'p1' || !mpRunning) return;
            const speed = 4;
            let leftY  = mpState ? mpState.left.y : PONG_H/2-PADDLE_H/2;
            let rightY = mpState ? mpState.right.y: PONG_H/2-PADDLE_H/2;
            if (keysDown['w']||keysDown['W']) leftY -= speed;
            if (keysDown['s']||keysDown['S']) leftY += speed;
            if (keysDown['ArrowUp'])   rightY -= speed;
            if (keysDown['ArrowDown']) rightY += speed;
            mpState = pongTick(mpState || newPongState(), leftY, rightY);
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({
                ball: mpState.ball, leftY: mpState.left.y, rightY: mpState.right.y,
                scoreLeft: mpState.score.left, scoreRight: mpState.score.right
            });
            renderPong(mpCtx, mpState);
            mpRafId = requestAnimationFrame(mpGameLoop);
        }

        function renderPong(c, s) {
            c.fillStyle = '#000'; c.fillRect(0,0,PONG_W,PONG_H);
            c.setLineDash([8,8]); c.strokeStyle='#222'; c.lineWidth=2;
            c.beginPath(); c.moveTo(PONG_W/2,0); c.lineTo(PONG_W/2,PONG_H); c.stroke();
            c.setLineDash([]);
            c.fillStyle='#fff';
            c.fillRect(0,s.left.y,PADDLE_W,PADDLE_H);
            c.fillRect(PONG_W-PADDLE_W,s.right.y,PADDLE_W,PADDLE_H);
            c.beginPath(); c.arc(s.ball.x,s.ball.y,BALL_R,0,Math.PI*2); c.fill();
        }

        // ── Touch controls (left paddle tracks finger Y) ──────────────────────
        canvas.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchmove',  e => {
            e.preventDefault();
            if (!running || paused) return;
            const rect  = canvas.getBoundingClientRect();
            const gameY = ((e.touches[0].clientY - rect.top) / rect.height) * PONG_H - PADDLE_H / 2;
            keysDown._touchLeftY = Math.max(0, Math.min(PONG_H - PADDLE_H, gameY));
        }, { passive: false });
        canvas.addEventListener('touchend', () => { delete keysDown._touchLeftY; }, { passive: false });

        // Initial render
        render(state);
