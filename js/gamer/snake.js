/* global snakePlaceFood, snakeTick, S_COLS, S_CELL, S_ROWS, SNAKE_MAX_SCORE, snakeChangeDirection */
// S_COLS, S_ROWS, S_CELL, SNAKE_MAX_SCORE, snakePlaceFood, snakeTick,
        // snakeChangeDirection all provided by /js/snake-engine.js

        let sBoard, sDir, sNextDir, sFoodPos;
        let sScore, sGameOver, sPaused;
        let sTickMs, sIntervalId;
        let sCanvas, sCtx;
        let sHighScore = parseInt(localStorage.getItem('snakeHighScore') || '0');

        function snakeStartGame() {
            clearInterval(sIntervalId);
            sBoard   = [{x:12,y:10},{x:11,y:10},{x:10,y:10}];
            sDir     = {x:1, y:0};
            sNextDir = {x:1, y:0};
            sScore   = 0;
            sGameOver = false;
            sPaused   = false;
            sTickMs   = 150;
            sFoodPos  = snakePlaceFood(sBoard);
            document.getElementById('snake-score').textContent  = 0;
            document.getElementById('snake-length').textContent = 3;
            document.getElementById('snake-best').textContent   = sHighScore;
            document.getElementById('snake-status').textContent = '';
            document.getElementById('snake-status').style.color = '#f00';
            document.getElementById('snake-start').textContent  = 'RESTART';
            document.getElementById('snake-best-box').classList.remove('new-best');
            document.getElementById('snake-world-box').classList.remove('new-world');
            sRender();
            sIntervalId = setInterval(sTick, sTickMs);
        }

        function sTick() {
            if (sGameOver || sPaused) return;
            const result = snakeTick(sBoard, sDir, sNextDir, sFoodPos, sScore, sTickMs);
            if (result.gameOver) { sEndGame(); return; }
            sBoard   = result.board;
            sDir     = result.dir;
            sFoodPos = result.foodPos;
            sScore   = result.score;
            sTickMs  = result.tickMs;
            if (result.ate) {
                document.getElementById('snake-score').textContent  = sScore;
                document.getElementById('snake-length').textContent = sBoard.length;
                clearInterval(sIntervalId);
                sIntervalId = setInterval(sTick, sTickMs);
            }
            sRender();
        }

        function sRender() {
            sCtx.fillStyle = '#111';
            sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);
            sCtx.strokeStyle = 'rgba(255,255,255,0.04)';
            sCtx.lineWidth = 1;
            for (let x = 0; x < S_COLS; x++) {
                sCtx.beginPath(); sCtx.moveTo(x * S_CELL, 0); sCtx.lineTo(x * S_CELL, sCanvas.height); sCtx.stroke();
            }
            for (let y = 0; y < S_ROWS; y++) {
                sCtx.beginPath(); sCtx.moveTo(0, y * S_CELL); sCtx.lineTo(sCanvas.width, y * S_CELL); sCtx.stroke();
            }
            sCtx.fillStyle = '#f44';
            sCtx.beginPath();
            sCtx.arc(sFoodPos.x * S_CELL + S_CELL / 2, sFoodPos.y * S_CELL + S_CELL / 2, S_CELL / 2 - 2, 0, Math.PI * 2);
            sCtx.fill();
            sBoard.forEach((seg, i) => {
                sCtx.fillStyle = i === 0 ? '#00f0f0' : '#00c000';
                sCtx.fillRect(seg.x * S_CELL + 1, seg.y * S_CELL + 1, S_CELL - 2, S_CELL - 2);
                if (i === 0) {
                    sCtx.fillStyle = 'rgba(255,255,255,0.3)';
                    sCtx.fillRect(seg.x * S_CELL + 1, seg.y * S_CELL + 1, S_CELL - 2, 3);
                    sCtx.fillRect(seg.x * S_CELL + 1, seg.y * S_CELL + 1, 3, S_CELL - 2);
                }
            });
        }

        function sEndGame() {
            sGameOver = true;
            clearInterval(sIntervalId);
            sRender();
            document.getElementById('snake-start').textContent = 'PLAY AGAIN';

            const isLocalBest = sScore > sHighScore;
            if (isLocalBest) {
                sHighScore = sScore;
                localStorage.setItem('snakeHighScore', sHighScore);
                document.getElementById('snake-best').textContent = sHighScore;
                const box = document.getElementById('snake-best-box');
                box.classList.remove('new-best');
                void box.offsetWidth;
                box.classList.add('new-best');
            }

            if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
                const ref = firebase.database().ref('scores/snake');
                ref.once('value', snap => {
                    const raw = snap.val();
                    const worldBest = (Number.isFinite(raw) && raw >= 0) ? raw : 0;
                    if (sScore > worldBest) {
                        ref.set(Math.min(sScore, SNAKE_MAX_SCORE));
                        document.getElementById('snake-status').textContent = 'WORLD RECORD!';
                        document.getElementById('snake-status').style.color = '#4caf50';
                        const wbox = document.getElementById('snake-world-box');
                        wbox.classList.remove('new-world');
                        void wbox.offsetWidth;
                        wbox.classList.add('new-world');
                    } else if (isLocalBest) {
                        document.getElementById('snake-status').textContent = 'NEW BEST!';
                        document.getElementById('snake-status').style.color = '#ffd700';
                    } else {
                        document.getElementById('snake-status').textContent = 'GAME OVER';
                        document.getElementById('snake-status').style.color = '#f00';
                    }
                });
            } else {
                document.getElementById('snake-status').textContent = isLocalBest ? 'NEW BEST!' : 'GAME OVER';
                document.getElementById('snake-status').style.color = isLocalBest ? '#ffd700' : '#f00';
            }
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'p' || e.key === 'P') {
                if (sGameOver) return;
                sPaused = !sPaused;
                if (sPaused) {
                    document.getElementById('snake-status').textContent = 'PAUSED';
                    document.getElementById('snake-status').style.color = '#f00';
                } else {
                    document.getElementById('snake-status').textContent = '';
                    sRender();
                }
                return;
            }
            if (sPaused || sGameOver) return;
            const newDir = snakeChangeDirection(sDir, sNextDir, e.key);
            if (newDir !== sNextDir) { sNextDir = newDir; e.preventDefault(); }
        });

        window.addEventListener('load', () => {
            sCanvas = document.getElementById('snake-board');
            sCtx = sCanvas.getContext('2d');
            sCtx.fillStyle = '#111';
            sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);
            document.getElementById('snake-best').textContent = sHighScore;

            if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
                firebase.database().ref('scores/snake').on('value', snap => {
                    const v = snap.val();
                    document.getElementById('snake-world').textContent = (Number.isFinite(v) && v >= 0) ? v : 0;
                });
            }
        });
