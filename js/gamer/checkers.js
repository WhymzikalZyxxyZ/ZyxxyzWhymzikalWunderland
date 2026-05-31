const myName   = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS    = 'scores/checkers';
        const CK_SIZE  = 480;
        const CELL     = CK_SIZE / 8;

        document.getElementById('ck-user-label').textContent = myName;

        // ── SP State ─────────────────────────────────────────────────────────
        let gameState = null, selected = null, legalNow = [], diff = 3, aiThinking = false;
        let spWins = 0;

        document.getElementById('ck-diff-slider').addEventListener('input', function() {
            diff = +this.value;
            document.getElementById('ck-diff-val').textContent = this.value;
        });

        function setMode(m) {
            document.getElementById('sp-panel').style.display = m==='sp' ? '' : 'none';
            document.getElementById('mp-panel').style.display = m==='mp' ? '' : 'none';
            document.getElementById('btn-sp').classList.toggle('active', m==='sp');
            document.getElementById('btn-mp').classList.toggle('active', m==='mp');
        }

        function startCheckers() {
            gameState  = newCheckersGame();
            selected   = null;
            aiThinking = false;
            legalNow   = getAllCheckersMovesForColor(gameState, CK_WHITE);
            setStatus('Your turn (White)');
            drawBoard(document.getElementById('ck-canvas').getContext('2d'), gameState);
        }

        function setStatus(msg) { document.getElementById('ck-status').textContent = msg; }

        // Highlight helper
        function selectedMoves() {
            if (!selected || !legalNow.length) return [];
            return legalNow.filter(m => m[0].r === selected.r && m[0].c === selected.c);
        }

        const canvas = document.getElementById('ck-canvas');
        canvas.addEventListener('click', e => {
            if (!gameState || gameState.status !== 'active' || aiThinking) return;
            if (gameState.turn !== CK_WHITE) return;
            const rect = canvas.getBoundingClientRect();
            const col  = Math.floor((e.clientX - rect.left) / (rect.width  / 8));
            const row  = Math.floor((e.clientY - rect.top)  / (rect.height / 8));
            handleSpClick(row, col);
        });

        function handleSpClick(row, col) {
            const piece = gameState.board[row][col];
            // Selecting own piece
            if (piece > 0) { selected = { r: row, c: col }; drawSp(); return; }
            // Attempting move
            if (selected) {
                const moves = selectedMoves();
                const move  = moves.find(m => m[m.length-1].r === row && m[m.length-1].c === col);
                if (move) {
                    gameState = applyCheckersMove(gameState, move);
                    selected  = null;
                    drawSp();
                    if (gameState.status === 'finished') {
                        setStatus('🎉 You win!');
                        spWins++;
                        maybeUpdateHighScore(spWins);
                        return;
                    }
                    legalNow   = [];
                    setStatus('AI thinking…');
                    aiThinking = true;
                    setTimeout(doAIMove, 150);
                    return;
                }
            }
            selected = null; drawSp();
        }

        function doAIMove() {
            const move = getCheckersAIMove(gameState, diff);
            if (!move) { setStatus('Stalemate or no moves.'); aiThinking=false; return; }
            gameState  = applyCheckersMove(gameState, move);
            aiThinking = false;
            legalNow   = getAllCheckersMovesForColor(gameState, CK_WHITE);
            drawSp();
            if (gameState.status === 'finished') { setStatus('💀 AI wins!'); return; }
            setStatus('Your turn (White)');
        }

        function drawSp() {
            drawBoard(document.getElementById('ck-canvas').getContext('2d'), gameState,
                      selected, selectedMoves());
        }

        // ── Board renderer ────────────────────────────────────────────────────
        function drawBoard(ctx, state, sel, selMoves) {
            if (!state) return;
            ctx.clearRect(0,0,CK_SIZE,CK_SIZE);
            for (let r=0; r<8; r++) {
                for (let c=0; c<8; c++) {
                    ctx.fillStyle = (r+c)%2===0 ? '#e8d5b7' : '#8b4513';
                    ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
                }
            }
            // Highlight selected
            if (sel) {
                ctx.fillStyle = 'rgba(244,162,97,0.45)';
                ctx.fillRect(sel.c*CELL, sel.r*CELL, CELL, CELL);
            }
            // Highlight possible destinations
            if (selMoves) {
                for (const m of selMoves) {
                    const to = m[m.length-1];
                    ctx.fillStyle = 'rgba(100,255,100,0.35)';
                    ctx.fillRect(to.c*CELL, to.r*CELL, CELL, CELL);
                }
            }
            // Draw pieces
            for (let r=0; r<8; r++) {
                for (let c=0; c<8; c++) {
                    const p = state.board[r][c];
                    if (!p) continue;
                    const cx = c*CELL+CELL/2, cy = r*CELL+CELL/2, rad = CELL*0.38;
                    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2);
                    ctx.fillStyle = p > 0 ? '#f0f0f0' : '#1a1a1a';
                    ctx.fill();
                    ctx.strokeStyle = p > 0 ? '#aaa' : '#555';
                    ctx.lineWidth = 2; ctx.stroke();
                    if (Math.abs(p) === 2) {
                        ctx.beginPath(); ctx.arc(cx, cy, rad*0.5, 0, Math.PI*2);
                        ctx.fillStyle = p > 0 ? '#f4a261' : '#f4a261';
                        ctx.fill();
                    }
                }
            }
        }

        startCheckers();

        // ── Firebase high score ──────────────────────────────────────────────
        function maybeUpdateHighScore(wins) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (wins > cur) ref.set({ score: Math.min(wins, CK_MAX_SCORE), username: String(myName).slice(0,40) });
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
        const MP_BASE = 'checkersRooms';
        let mpRoomId=null, mpRole=null, mpState=null, mpSel=null, mpLegal=[];

        function ckMpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            mpRoomId = Math.random().toString(36).slice(2,8).toUpperCase();
            mpRole   = 'p1';
            const init = newCheckersGame();
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).set({
                p1: myName, p2: null, board: init.board, turn: init.turn, status: 'waiting'
            });
            document.getElementById('ck-mp-status').textContent  = 'Waiting for opponent. Code: ';
            document.getElementById('ck-room-code').textContent   = mpRoomId;
            ckMpListen();
        }

        function ckMpJoin() {
            const code = document.getElementById('ck-join-code').value.trim().toUpperCase().slice(0,6);
            if (!code || !window.FIREBASE_READY) return;
            mpRoomId = code; mpRole = 'p2';
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).once('value', snap => {
                if (!snap.val()) { document.getElementById('ck-mp-status').textContent = 'Room not found.'; return; }
                firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({ p2: myName, status: 'active' });
                document.getElementById('ck-mp-game').style.display = '';
                ckMpListen();
            });
        }

        function ckMpListen() {
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).on('value', snap => {
                const d = snap.val();
                if (!d) return;
                if (d.status === 'active' && d.p2) {
                    document.getElementById('ck-mp-game').style.display = '';
                    document.getElementById('ck-mp-status').textContent = `${d.p1} (White) vs ${d.p2} (Black)`;
                }
                if (d.board) {
                    mpState = { board: d.board, turn: d.turn, status: d.status || 'active', winner: d.winner || null };
                    const myColor = mpRole === 'p1' ? CK_WHITE : CK_BLACK;
                    mpLegal = getAllCheckersMovesForColor(mpState, myColor);
                    const mpCanvas = document.getElementById('ck-canvas-mp');
                    drawBoard(mpCanvas.getContext('2d'), mpState, mpSel,
                              mpSel ? mpLegal.filter(m=>m[0].r===mpSel.r&&m[0].c===mpSel.c) : []);
                    const isMyTurn = mpState.turn === myColor;
                    const msg = mpState.status === 'finished'
                        ? (mpState.winner === myColor ? '🎉 You win!' : '💀 Opponent wins!')
                        : (isMyTurn ? 'Your turn' : "Opponent's turn…");
                    document.getElementById('ck-mp-status2').textContent = msg;
                }
            });
        }

        const mpCanvas = document.getElementById('ck-canvas-mp');
        mpCanvas.addEventListener('click', e => {
            if (!mpState || mpState.status !== 'active') return;
            const myColor = mpRole === 'p1' ? CK_WHITE : CK_BLACK;
            if (mpState.turn !== myColor) return;
            const rect = mpCanvas.getBoundingClientRect();
            const col  = Math.floor((e.clientX - rect.left) / (rect.width  / 8));
            const row  = Math.floor((e.clientY - rect.top)  / (rect.height / 8));
            const piece = mpState.board[row][col];
            if (piece !== 0 && (piece > 0 ? CK_WHITE : CK_BLACK) === myColor) {
                mpSel = { r: row, c: col }; return;
            }
            if (mpSel) {
                const myMoves = mpLegal.filter(m=>m[0].r===mpSel.r&&m[0].c===mpSel.c);
                const move = myMoves.find(m=>m[m.length-1].r===row&&m[m.length-1].c===col);
                if (move && window.FIREBASE_READY) {
                    const newSt = applyCheckersMove(mpState, move);
                    firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({
                        board: newSt.board, turn: newSt.turn,
                        status: newSt.status, winner: newSt.winner
                    });
                }
                mpSel = null;
            }
        });
