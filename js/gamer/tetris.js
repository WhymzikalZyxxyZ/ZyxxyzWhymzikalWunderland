/* global COLORS, COLS, BLOCK, ROWS, collides, clearLines, newPiece, MAX_SCORE, newBoard, rotateShape */
// COLS, ROWS, BLOCK, COLORS, SHAPES, MAX_SCORE, newBoard, newPiece,
        // collides, rotateShape, clearLines all provided by /js/tetris-engine.js

        let board, piece, nextPiece;
        let score, lines, level, dropInterval;
        let gameOver, paused, lastDrop, animId;
        let canvas, ctx, nextCanvas, nextCtx;
        let highScore = parseInt(localStorage.getItem('tetrisHighScore') || '0');
        let timeLevel, gameStartTimestamp, totalPauseTime, pauseStartTimestamp;

        function drawBlock(c, x, y, id, size) {
            c.fillStyle = COLORS[id];
            c.fillRect(x * size, y * size, size - 1, size - 1);
            c.fillStyle = 'rgba(255,255,255,0.3)';
            c.fillRect(x * size, y * size, size - 1, 3);
            c.fillRect(x * size, y * size, 3, size - 1);
        }

        function render() {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let x = 0; x < COLS; x++) {
                ctx.beginPath(); ctx.moveTo(x * BLOCK, 0); ctx.lineTo(x * BLOCK, canvas.height); ctx.stroke();
            }
            for (let y = 0; y < ROWS; y++) {
                ctx.beginPath(); ctx.moveTo(0, y * BLOCK); ctx.lineTo(canvas.width, y * BLOCK); ctx.stroke();
            }
            board.forEach((row, y) => row.forEach((v, x) => { if (v) drawBlock(ctx, x, y, v, BLOCK); }));
            if (!gameOver) {
                let ghost = { x: piece.x, y: piece.y, shape: piece.shape };
                while (!collides(board, ghost, 0, 1)) ghost = { x: ghost.x, y: ghost.y + 1, shape: ghost.shape };
                ctx.globalAlpha = 0.15;
                ghost.shape.forEach((row, dy) => row.forEach((v, dx) => { if (v) drawBlock(ctx, ghost.x + dx, ghost.y + dy, v, BLOCK); }));
                ctx.globalAlpha = 1;
                piece.shape.forEach((row, dy) => row.forEach((v, dx) => { if (v) drawBlock(ctx, piece.x + dx, piece.y + dy, v, BLOCK); }));
            }
            const nb = 24;
            nextCtx.fillStyle = '#111';
            nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
            const ox = Math.floor((nextCanvas.width / nb - nextPiece.shape[0].length) / 2);
            const oy = Math.floor((nextCanvas.height / nb - nextPiece.shape.length) / 2);
            nextPiece.shape.forEach((row, dy) => row.forEach((v, dx) => { if (v) drawBlock(nextCtx, ox + dx, oy + dy, v, nb); }));
        }

        function lockPiece() {
            piece.shape.forEach((row, dy) => {
                row.forEach((v, dx) => {
                    if (!v) return;
                    const y = piece.y + dy;
                    if (y >= 0) board[y][piece.x + dx] = v;
                });
            });
            const cl = clearLines(board, score, lines, level);
            board = cl.board; score = cl.score; lines = cl.lines; level = cl.level;
            if (cl.cleared) {
                document.getElementById('tetris-score').textContent = score;
                document.getElementById('tetris-lines').textContent = lines;
            }
            piece = nextPiece;
            nextPiece = newPiece();
            if (collides(board, piece)) endGame();
        }

        function drop() {
            if (!collides(board, piece, 0, 1)) piece.y++;
            else lockPiece();
        }

        function hardDrop() {
            while (!collides(board, piece, 0, 1)) piece.y++;
            lockPiece();
        }

        function showSpeedUp() {
            const status = document.getElementById('tetris-status');
            status.textContent = 'SPEED UP!';
            status.style.color = '#f0f000';
            setTimeout(() => {
                if (!gameOver) { status.textContent = ''; status.style.color = '#f00'; }
            }, 1500);
        }

        function loop(timestamp) {
            if (gameOver) return;
            animId = requestAnimationFrame(loop);
            if (paused) return;
            if (!lastDrop) { lastDrop = timestamp; gameStartTimestamp = timestamp; }
            const elapsed = timestamp - gameStartTimestamp - totalPauseTime;
            const newTimeLevel = Math.floor(elapsed / 30000);
            if (newTimeLevel > timeLevel) { timeLevel = newTimeLevel; showSpeedUp(); }
            const effectiveLevel = level + timeLevel;
            dropInterval = Math.max(80, 1000 - (effectiveLevel - 1) * 90);
            document.getElementById('tetris-level').textContent = effectiveLevel;
            if (timestamp - lastDrop >= dropInterval) { drop(); lastDrop = timestamp; }
            render();
        }

        function startGame() {
            cancelAnimationFrame(animId);
            board = newBoard();
            piece = newPiece();
            nextPiece = newPiece();
            score = 0; lines = 0; level = 1; dropInterval = 1000;
            timeLevel = 0; gameStartTimestamp = 0; totalPauseTime = 0; pauseStartTimestamp = 0;
            gameOver = false; paused = false; lastDrop = 0;
            document.getElementById('tetris-score').textContent = 0;
            document.getElementById('tetris-lines').textContent = 0;
            document.getElementById('tetris-level').textContent = 1;
            document.getElementById('tetris-best').textContent = highScore;
            document.getElementById('tetris-status').textContent = '';
            document.getElementById('tetris-status').style.color = '#f00';
            document.getElementById('tetris-start').textContent = 'RESTART';
            document.getElementById('tetris-best-box').classList.remove('new-best');
            document.getElementById('tetris-world-box').classList.remove('new-world');
            animId = requestAnimationFrame(loop);
        }

        function endGame() {
            gameOver = true;
            render();
            document.getElementById('tetris-start').textContent = 'PLAY AGAIN';

            const isLocalBest = score > highScore;
            if (isLocalBest) {
                highScore = score;
                localStorage.setItem('tetrisHighScore', highScore);
                document.getElementById('tetris-best').textContent = highScore;
                const box = document.getElementById('tetris-best-box');
                box.classList.remove('new-best');
                void box.offsetWidth;
                box.classList.add('new-best');
            }

            if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
                const ref = firebase.database().ref('scores/tetris');
                ref.once('value', snap => {
                    const raw = snap.val();
                    const worldBest = (Number.isFinite(raw) && raw >= 0) ? raw : 0;
                    if (score > worldBest) {
                        ref.set(Math.min(score, MAX_SCORE));
                        document.getElementById('tetris-status').textContent = 'WORLD RECORD!';
                        document.getElementById('tetris-status').style.color = '#4caf50';
                        const wbox = document.getElementById('tetris-world-box');
                        wbox.classList.remove('new-world');
                        void wbox.offsetWidth;
                        wbox.classList.add('new-world');
                    } else if (isLocalBest) {
                        document.getElementById('tetris-status').textContent = 'NEW BEST!';
                        document.getElementById('tetris-status').style.color = '#ffd700';
                    } else {
                        document.getElementById('tetris-status').textContent = 'GAME OVER';
                        document.getElementById('tetris-status').style.color = '#f00';
                    }
                });
            } else {
                document.getElementById('tetris-status').textContent = isLocalBest ? 'NEW BEST!' : 'GAME OVER';
                document.getElementById('tetris-status').style.color = isLocalBest ? '#ffd700' : '#f00';
            }
        }

        document.addEventListener('keydown', e => {
            if (gameOver) return;
            if (e.key === 'p' || e.key === 'P') {
                paused = !paused;
                if (paused) {
                    pauseStartTimestamp = performance.now();
                    document.getElementById('tetris-status').textContent = 'PAUSED';
                    document.getElementById('tetris-status').style.color = '#f00';
                } else {
                    totalPauseTime += performance.now() - pauseStartTimestamp;
                    document.getElementById('tetris-status').textContent = '';
                    lastDrop = performance.now();
                    render();
                }
                return;
            }
            if (paused) return;
            switch (e.key) {
                case 'ArrowLeft':
                    if (!collides(board, piece, -1)) { piece.x--; render(); }
                    e.preventDefault(); break;
                case 'ArrowRight':
                    if (!collides(board, piece, 1)) { piece.x++; render(); }
                    e.preventDefault(); break;
                case 'ArrowDown':
                    drop(); lastDrop = performance.now(); render();
                    e.preventDefault(); break;
                case 'ArrowUp': {
                    const rotated = rotateShape(piece.shape);
                    for (const kick of [0, -1, 1, -2, 2]) {
                        if (!collides(board, { x: piece.x + kick, y: piece.y, shape: piece.shape }, 0, 0, rotated)) {
                            piece.shape = rotated; piece.x += kick; break;
                        }
                    }
                    render(); e.preventDefault(); break;
                }
                case ' ':
                    hardDrop(); render(); e.preventDefault(); break;
            }
        });

        window.addEventListener('load', () => {
            canvas = document.getElementById('tetris-board');
            ctx = canvas.getContext('2d');
            nextCanvas = document.getElementById('tetris-next');
            nextCtx = nextCanvas.getContext('2d');
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            nextCtx.fillStyle = '#111';
            nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
            document.getElementById('tetris-best').textContent = highScore;

            if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
                firebase.database().ref('scores/tetris').on('value', snap => {
                    const v = snap.val();
                    document.getElementById('tetris-world').textContent = (Number.isFinite(v) && v >= 0) ? v : 0;
                });
            }
        });
