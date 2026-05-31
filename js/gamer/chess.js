const myName   = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS    = 'scores/chess';
        const CH_SIZE  = 480;
        const CELL     = CH_SIZE / 8;

        document.getElementById('ch-user-label').textContent = myName;

        // Piece glyphs (Unicode chess symbols)
        const GLYPHS = {
            [CH_PAWN*CH_WHITE]: '♙', [CH_KNIGHT*CH_WHITE]: '♘', [CH_BISHOP*CH_WHITE]: '♗',
            [CH_ROOK*CH_WHITE]:  '♖', [CH_QUEEN*CH_WHITE]:  '♕', [CH_KING*CH_WHITE]:   '♔',
            [CH_PAWN*CH_BLACK]: '♟', [CH_KNIGHT*CH_BLACK]: '♞', [CH_BISHOP*CH_BLACK]: '♝',
            [CH_ROOK*CH_BLACK]:  '♜', [CH_QUEEN*CH_BLACK]:  '♛', [CH_KING*CH_BLACK]:   '♚',
        };

        // ── SP State ─────────────────────────────────────────────────────────
        let gameState = null, selected = null, legalForSel = [], diff = 3, aiThinking = false;
        let spWins = 0;
        let pendingPromoMove = null;

        document.getElementById('ch-diff-slider').addEventListener('input', function() {
            diff = +this.value;
            document.getElementById('ch-diff-val').textContent = this.value;
        });

        function setMode(m) {
            document.getElementById('sp-panel').style.display = m==='sp' ? '' : 'none';
            document.getElementById('mp-panel').style.display = m==='mp' ? '' : 'none';
            document.getElementById('btn-sp').classList.toggle('active', m==='sp');
            document.getElementById('btn-mp').classList.toggle('active', m==='mp');
        }

        function startChess() {
            gameState = newChessGame();
            gameState = updateStatus(gameState);
            selected  = null; legalForSel = []; aiThinking = false;
            setStatus('Your turn (White)');
            drawChessBoard(document.getElementById('ch-canvas').getContext('2d'), gameState, null, []);
        }

        function setStatus(msg) { document.getElementById('ch-status').textContent = msg; }

        const canvas = document.getElementById('ch-canvas');
        canvas.addEventListener('click', e => {
            if (!gameState || aiThinking) return;
            if (gameState.turn !== CH_WHITE || gameState.status === 'checkmate' || gameState.status === 'stalemate') return;
            const rect = canvas.getBoundingClientRect();
            const col  = Math.floor((e.clientX - rect.left) / (rect.width  / 8));
            const row  = Math.floor((e.clientY - rect.top)  / (rect.height / 8));
            handleSpClick(row, col);
        });

        function handleSpClick(row, col) {
            const moves = gameState.legalMoves || [];
            if (selected) {
                const move = legalForSel.find(m => m.tr === row && m.tc === col);
                if (move) {
                    if (move.promo !== undefined && !move.promo) {
                        // Player chooses promotion piece
                        pendingPromoMove = { base: move, row, col };
                        openPromoDialog(CH_WHITE);
                        return;
                    }
                    applySpMove(move); return;
                }
            }
            const piece = gameState.board[row][col];
            if (piece > 0) {
                selected    = { row, col };
                legalForSel = moves.filter(m => m.r === row && m.c === col);
                drawSp(); return;
            }
            selected = null; legalForSel = []; drawSp();
        }

        function applySpMove(move) {
            gameState = applyMove(gameState, move);
            gameState = updateStatus(gameState);
            selected  = null; legalForSel = [];
            drawSp();
            if (gameState.status === 'checkmate') { setStatus('🎉 Checkmate! You win!'); spWins++; maybeUpdateHighScore(spWins); return; }
            if (gameState.status === 'stalemate') { setStatus('🤝 Stalemate!'); return; }
            if (gameState.status === 'check')     setStatus('Check! AI thinking…');
            else                                   setStatus('AI thinking…');
            aiThinking = true;
            setTimeout(doAIMove, 100);
        }

        function doAIMove() {
            const move = getChessAIMove(gameState, diff);
            if (!move) { setStatus('No moves for AI — draw?'); aiThinking = false; return; }
            gameState  = applyMove(gameState, move);
            gameState  = updateStatus(gameState);
            aiThinking = false;
            drawSp();
            if (gameState.status === 'checkmate') { setStatus('💀 Checkmate! AI wins.'); return; }
            if (gameState.status === 'stalemate') { setStatus('🤝 Stalemate!'); return; }
            if (gameState.status === 'check')     { setStatus('Check! Your turn (White)'); return; }
            setStatus('Your turn (White)');
        }

        function openPromoDialog(color) {
            const pieces  = [CH_QUEEN, CH_ROOK, CH_BISHOP, CH_KNIGHT];
            const unicode = { [CH_QUEEN]:'♕',[CH_ROOK]:'♖',[CH_BISHOP]:'♗',[CH_KNIGHT]:'♘' };
            const box     = document.getElementById('promo-choices');
            box.innerHTML = '';
            for (const pt of pieces) {
                const btn = document.createElement('button');
                btn.className   = 'promo-btn';
                btn.textContent = color === CH_WHITE ? unicode[pt] :
                    { [CH_QUEEN]:'♛',[CH_ROOK]:'♜',[CH_BISHOP]:'♝',[CH_KNIGHT]:'♞' }[pt];
                btn.addEventListener('click', () => {
                    document.getElementById('ch-promo-modal').classList.remove('open');
                    const finalMove = { ...pendingPromoMove.base, promo: pt * color };
                    pendingPromoMove = null;
                    applySpMove(finalMove);
                });
                box.appendChild(btn);
            }
            document.getElementById('ch-promo-modal').classList.add('open');
        }

        function drawSp() {
            drawChessBoard(document.getElementById('ch-canvas').getContext('2d'),
                           gameState, selected, legalForSel);
        }

        // ── Board renderer ────────────────────────────────────────────────────
        function drawChessBoard(ctx, state, sel, selMoves) {
            if (!state) return;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    ctx.fillStyle = (r+c)%2===0 ? '#f0d9b5' : '#b58863';
                    ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
                }
            }
            // Rank / file labels
            ctx.font      = `${CELL*0.15}px 'Courier New'`;
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            for (let i = 0; i < 8; i++) {
                ctx.fillText(String.fromCharCode(97+i), i*CELL+3, CH_SIZE-3);
                ctx.fillText(8-i, 3, i*CELL+CELL*0.2);
            }
            if (sel) {
                ctx.fillStyle = 'rgba(244,162,97,0.55)';
                ctx.fillRect(sel.col*CELL, sel.row*CELL, CELL, CELL);
            }
            if (selMoves) {
                for (const m of selMoves) {
                    ctx.fillStyle = state.board[m.tr][m.tc]
                        ? 'rgba(220,30,30,0.35)' : 'rgba(100,200,100,0.35)';
                    ctx.fillRect(m.tc*CELL, m.tr*CELL, CELL, CELL);
                }
            }
            // Check highlight
            if (state.status === 'check' || state.status === 'checkmate') {
                const k = findKing(state.board, state.turn);
                if (k) {
                    ctx.fillStyle = 'rgba(220,0,0,0.4)';
                    ctx.fillRect(k.c*CELL, k.r*CELL, CELL, CELL);
                }
            }
            ctx.font      = `${CELL*0.78}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = state.board[r][c];
                    if (!p) continue;
                    ctx.fillStyle = p > 0 ? '#fff' : '#000';
                    ctx.shadowColor   = p > 0 ? '#555' : '#aaa';
                    ctx.shadowBlur    = 3;
                    ctx.fillText(GLYPHS[p] || '?', c*CELL+CELL/2, r*CELL+CELL/2+2);
                    ctx.shadowBlur = 0;
                }
            }
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'alphabetic';
        }

        startChess();

        // ── Firebase high score ──────────────────────────────────────────────
        function maybeUpdateHighScore(wins) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (wins > cur) ref.set({ score: Math.min(wins, CH_MAX_SCORE), username: String(myName).slice(0,40) });
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
        const MP_BASE = 'chessRooms';
        let mpRoomId=null, mpRole=null, mpState=null, mpSel=null, mpLegalForSel=[];

        function chMpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            mpRoomId = Math.random().toString(36).slice(2,8).toUpperCase();
            mpRole   = 'p1';  // p1 = white
            const init = updateStatus(newChessGame());
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).set({
                p1: myName, p2: null,
                board: init.board, turn: init.turn,
                castling: init.castling, enPassant: init.enPassant || null,
                status: 'waiting'
            });
            document.getElementById('ch-mp-status').textContent  = 'Waiting for opponent. Code: ';
            document.getElementById('ch-room-code').textContent   = mpRoomId;
            chMpListen();
        }

        function chMpJoin() {
            const code = document.getElementById('ch-join-code').value.trim().toUpperCase().slice(0,6);
            if (!code || !window.FIREBASE_READY) return;
            mpRoomId = code; mpRole = 'p2';  // p2 = black
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).once('value', snap => {
                if (!snap.val()) { document.getElementById('ch-mp-status').textContent = 'Room not found.'; return; }
                firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({ p2: myName, status: 'active' });
                document.getElementById('ch-mp-game').style.display = '';
                chMpListen();
            });
        }

        function chMpListen() {
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).on('value', snap => {
                const d = snap.val();
                if (!d) return;
                if (d.p2 && d.status === 'active') {
                    document.getElementById('ch-mp-game').style.display = '';
                    document.getElementById('ch-mp-status').textContent = `${d.p1} (White) vs ${d.p2} (Black)`;
                }
                if (d.board) {
                    mpState = updateStatus({
                        board: d.board, turn: d.turn,
                        castling: d.castling || { wK:false,wQ:false,bK:false,bQ:false },
                        enPassant: d.enPassant || null,
                        halfMove: d.halfMove || 0, fullMove: d.fullMove || 1, status: 'active'
                    });
                    const flip = mpRole === 'p2';
                    drawChessBoardFlipped(document.getElementById('ch-canvas-mp').getContext('2d'),
                                         mpState, mpSel, mpLegalForSel, flip);
                    const myColor = mpRole === 'p1' ? CH_WHITE : CH_BLACK;
                    const isMyTurn = mpState.turn === myColor;
                    const msg = mpState.status === 'checkmate'
                        ? (mpState.turn === myColor ? '💀 You are checkmated!' : '🎉 Opponent checkmated!')
                        : mpState.status === 'stalemate' ? '🤝 Stalemate!'
                        : mpState.status === 'check'
                            ? (isMyTurn ? '⚠ You are in check!' : "Opponent in check…")
                            : (isMyTurn ? 'Your turn' : "Opponent's turn…");
                    document.getElementById('ch-mp-game-status').textContent = msg;
                }
            });
        }

        const mpCanvas = document.getElementById('ch-canvas-mp');
        mpCanvas.addEventListener('click', e => {
            if (!mpState) return;
            const myColor = mpRole === 'p1' ? CH_WHITE : CH_BLACK;
            if (mpState.turn !== myColor) return;
            if (mpState.status === 'checkmate' || mpState.status === 'stalemate') return;
            const rect  = mpCanvas.getBoundingClientRect();
            const flip  = mpRole === 'p2';
            let col = Math.floor((e.clientX - rect.left) / (rect.width  / 8));
            let row = Math.floor((e.clientY - rect.top)  / (rect.height / 8));
            if (flip) { col = 7 - col; row = 7 - row; }

            const moves = mpState.legalMoves || [];
            if (mpSel) {
                const move = mpLegalForSel.find(m => m.tr === row && m.tc === col);
                if (move && window.FIREBASE_READY) {
                    const finalMove = move.promo !== undefined
                        ? { ...move, promo: CH_QUEEN * myColor }  // auto-promote to queen in MP
                        : move;
                    const next = applyMove(mpState, finalMove);
                    firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({
                        board: next.board, turn: next.turn,
                        castling: next.castling, enPassant: next.enPassant || null,
                        halfMove: next.halfMove, fullMove: next.fullMove
                    });
                    mpSel = null; mpLegalForSel = []; return;
                }
            }
            const piece = mpState.board[row][col];
            if (piece !== 0 && (piece > 0 ? CH_WHITE : CH_BLACK) === myColor) {
                mpSel        = { row, col };
                mpLegalForSel = moves.filter(m => m.r === row && m.c === col);
            } else {
                mpSel = null; mpLegalForSel = [];
            }
            const flip2 = mpRole === 'p2';
            drawChessBoardFlipped(mpCanvas.getContext('2d'), mpState, mpSel, mpLegalForSel, flip2);
        });

        function drawChessBoardFlipped(ctx, state, sel, selMoves, flip) {
            if (!state) return;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    ctx.fillStyle = (r+c)%2===0 ? '#f0d9b5' : '#b58863';
                    ctx.fillRect(c*CELL, r*CELL, CELL, CELL);
                }
            }
            if (sel) {
                const dr = flip ? 7-sel.row : sel.row, dc = flip ? 7-sel.col : sel.col;
                ctx.fillStyle = 'rgba(244,162,97,0.55)';
                ctx.fillRect(dc*CELL, dr*CELL, CELL, CELL);
            }
            if (selMoves) {
                for (const m of selMoves) {
                    const dr = flip ? 7-m.tr : m.tr, dc = flip ? 7-m.tc : m.tc;
                    ctx.fillStyle = state.board[m.tr][m.tc]
                        ? 'rgba(220,30,30,0.35)' : 'rgba(100,200,100,0.35)';
                    ctx.fillRect(dc*CELL, dr*CELL, CELL, CELL);
                }
            }
            ctx.font='${CELL*0.78}px serif'; // overridden below
            ctx.font = Math.floor(CELL*0.78) + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const br = flip ? 7-r : r, bc = flip ? 7-c : c;
                    const p  = state.board[br][bc];
                    if (!p) continue;
                    ctx.fillStyle   = p > 0 ? '#fff' : '#000';
                    ctx.shadowColor = p > 0 ? '#555' : '#aaa';
                    ctx.shadowBlur  = 3;
                    ctx.fillText(GLYPHS[p] || '?', c*CELL+CELL/2, r*CELL+CELL/2+2);
                    ctx.shadowBlur = 0;
                }
            }
            ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
