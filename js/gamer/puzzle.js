const myName   = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS    = 'scores/puzzle';
        const BOARD_PX = 480;  // display size of board
        let puzzle = null, timerInterval = null, elapsedSec = 0;

        document.getElementById('user-label').textContent = myName;

        document.getElementById('piece-count-slider').addEventListener('input', function() {
            document.getElementById('piece-count-val').textContent = this.value;
        });

        // ── Image generation (blues/reds/purples) ───────────────────────────
        function generatePuzzleImage(widthPx, heightPx) {
            const offscreen = document.createElement('canvas');
            offscreen.width = widthPx; offscreen.height = heightPx;
            const c = offscreen.getContext('2d');

            // Base gradient
            const g = c.createLinearGradient(0, 0, widthPx, heightPx);
            g.addColorStop(0,   '#1a0050');
            g.addColorStop(0.3, '#550066');
            g.addColorStop(0.6, '#002866');
            g.addColorStop(1,   '#3d006e');
            c.fillStyle = g;
            c.fillRect(0, 0, widthPx, heightPx);

            // Decorative circles — purples and reds
            const circles = [
                { cx:0.2, cy:0.2, r:0.25, color:'rgba(180,0,100,0.45)' },
                { cx:0.75,cy:0.3, r:0.2,  color:'rgba(0,80,200,0.4)' },
                { cx:0.5, cy:0.7, r:0.3,  color:'rgba(120,0,180,0.5)' },
                { cx:0.9, cy:0.8, r:0.18, color:'rgba(200,30,60,0.4)' },
                { cx:0.1, cy:0.75,r:0.22, color:'rgba(80,0,160,0.5)' },
                { cx:0.6, cy:0.15,r:0.15, color:'rgba(160,0,40,0.35)' },
            ];
            for (const { cx, cy, r, color } of circles) {
                const rg = c.createRadialGradient(
                    cx*widthPx, cy*heightPx, 0,
                    cx*widthPx, cy*heightPx, r * Math.max(widthPx, heightPx));
                rg.addColorStop(0,   color);
                rg.addColorStop(1,   'rgba(0,0,0,0)');
                c.fillStyle = rg;
                c.fillRect(0, 0, widthPx, heightPx);
            }

            // Grid lines for structure
            c.strokeStyle = 'rgba(255,255,255,0.06)';
            c.lineWidth   = 1;
            const step = widthPx / 8;
            for (let x = step; x < widthPx; x += step) {
                c.beginPath(); c.moveTo(x,0); c.lineTo(x,heightPx); c.stroke();
            }
            for (let y = step; y < heightPx; y += step) {
                c.beginPath(); c.moveTo(0,y); c.lineTo(widthPx,y); c.stroke();
            }

            return offscreen;
        }

        // ── Puzzle setup ────────────────────────────────────────────────────
        function startPuzzle() {
            const requested = Math.max(9, Math.min(420, parseInt(document.getElementById('piece-count-slider').value, 10) || 25));
            puzzle = shufflePuzzle(newPuzzle(requested));
            document.getElementById('game-panel').style.display = '';
            document.getElementById('puz-done-msg').textContent = '';

            clearInterval(timerInterval);
            elapsedSec = 0;
            updateTimer();
            timerInterval = setInterval(() => {
                elapsedSec++;
                updateTimer();
            }, 1000);

            buildBoard();
            buildTray();
        }

        function updateTimer() {
            const m = Math.floor(elapsedSec / 60), s = elapsedSec % 60;
            document.getElementById('puz-timer').textContent =
                m + ':' + String(s).padStart(2,'0');
        }

        // ── Board rendering ──────────────────────────────────────────────────
        let boardCanvas, boardCtx, sourceImage;
        let pieceW, pieceH, boardW, boardH;

        function buildBoard() {
            const { cols, rows } = puzzle;
            pieceW = Math.floor(BOARD_PX / cols);
            pieceH = Math.floor(BOARD_PX / rows);
            boardW = pieceW * cols;
            boardH = pieceH * rows;

            sourceImage = generatePuzzleImage(boardW, boardH);

            const wrap = document.getElementById('puz-board-wrap');
            wrap.style.width  = boardW + 'px';
            wrap.style.height = boardH + 'px';

            boardCanvas = document.getElementById('puz-board');
            boardCanvas.width  = boardW;
            boardCanvas.height = boardH;
            boardCtx = boardCanvas.getContext('2d');
            drawBoard();
        }

        function drawBoard() {
            boardCtx.fillStyle = '#111';
            boardCtx.fillRect(0, 0, boardW, boardH);
            // Grid overlay
            boardCtx.strokeStyle = 'rgba(255,255,255,0.12)';
            boardCtx.lineWidth   = 1;
            for (let c = 0; c <= puzzle.cols; c++) {
                boardCtx.beginPath(); boardCtx.moveTo(c*pieceW,0); boardCtx.lineTo(c*pieceW,boardH); boardCtx.stroke();
            }
            for (let r = 0; r <= puzzle.rows; r++) {
                boardCtx.beginPath(); boardCtx.moveTo(0,r*pieceH); boardCtx.lineTo(boardW,r*pieceH); boardCtx.stroke();
            }
            // Draw placed pieces
            for (const p of puzzle.pieces) {
                if (p.placed) drawPieceOnBoard(p);
            }
            updateProgress();
        }

        function drawPieceOnBoard(p) {
            boardCtx.drawImage(
                sourceImage,
                p.correctCol * pieceW, p.correctRow * pieceH, pieceW, pieceH,
                p.correctCol * pieceW, p.correctRow * pieceH, pieceW, pieceH
            );
            boardCtx.strokeStyle = 'rgba(244,162,97,0.4)';
            boardCtx.lineWidth   = 1;
            boardCtx.strokeRect(p.correctCol*pieceW+0.5, p.correctRow*pieceH+0.5, pieceW-1, pieceH-1);
        }

        function updateProgress() {
            const placed = puzzle.pieces.filter(p => p.placed).length;
            document.getElementById('puz-progress').textContent =
                `${placed} / ${puzzle.count} placed`;
        }

        // ── Tray of unplaced pieces ──────────────────────────────────────────
        let dragPieceId = null;

        function buildTray() {
            const tray = document.getElementById('puz-tray');
            tray.innerHTML = '';
            for (const p of puzzle.pieces) {
                if (p.placed) continue;
                const c = document.createElement('canvas');
                c.width  = pieceW;
                c.height = pieceH;
                c.className = 'puz-piece';
                c.dataset.id = p.id;
                c.title = `Piece ${p.id + 1}`;
                const tc = c.getContext('2d');
                tc.drawImage(sourceImage,
                    p.correctCol*pieceW, p.correctRow*pieceH, pieceW, pieceH,
                    0, 0, pieceW, pieceH);
                c.addEventListener('dragstart', e => {
                    dragPieceId = +e.target.dataset.id;
                    e.target.classList.add('dragging');
                });
                c.addEventListener('dragend',   e => e.target.classList.remove('dragging'));
                c.draggable = true;
                tray.appendChild(c);
            }
        }

        document.getElementById('puz-board-wrap').addEventListener('dragover', e => { e.preventDefault(); });
        document.getElementById('puz-board-wrap').addEventListener('drop', e => {
            e.preventDefault();
            if (dragPieceId === null || !puzzle) return;
            const wrap  = document.getElementById('puz-board-wrap');
            const rect  = wrap.getBoundingClientRect();
            const dropX = e.clientX - rect.left;
            const dropY = e.clientY - rect.top;
            const col   = Math.floor(dropX / pieceW);
            const row   = Math.floor(dropY / pieceH);
            if (col < 0 || col >= puzzle.cols || row < 0 || row >= puzzle.rows) return;
            // Check nothing already placed there
            const occupant = puzzle.pieces.find(p => p.placed && p.correctCol===col && p.correctRow===row);
            if (occupant) return;
            puzzle = placePiece(puzzle, dragPieceId, col, row);
            dragPieceId = null;
            drawBoard();
            buildTray();
            if (puzzle.solved) onSolved();
        });

        function onSolved() {
            clearInterval(timerInterval);
            const score = calcPuzzleScore(puzzle.count, elapsedSec);
            document.getElementById('puz-done-msg').textContent =
                `🎉 Solved in ${document.getElementById('puz-timer').textContent}! Score: ${score}`;
            // Draw the full image
            boardCtx.drawImage(sourceImage, 0, 0, boardW, boardH);
            maybeUpdateHighScore(score);
        }

        function maybeUpdateHighScore(score) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (score > cur) ref.set({ score: Math.min(score, 999999), username: String(myName).slice(0,40) });
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
