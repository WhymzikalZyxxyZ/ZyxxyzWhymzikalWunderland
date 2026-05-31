'use strict';

// ─── Constants ──────────────────────────────────────────────────────────────
const BOARD_PX  = 520;  // max board dimension in px
const TAB_RATIO = 0.28; // tab protrusion as fraction of piece size

// ─── State ──────────────────────────────────────────────────────────────────
let puzzle = null;
let timerInterval = null, elapsedSec = 0;
let boardCanvas, boardCtx, sourceImage;
let pieceW, pieceH, boardW, boardH, tabSize;

// ─── Firebase / username ────────────────────────────────────────────────────
const myName = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
const FB_HS  = 'scores/puzzle';
document.getElementById('user-label').textContent = myName;

document.getElementById('piece-count-slider').addEventListener('input', function () {
    document.getElementById('piece-count-val').textContent = this.value;
});

// ─── Image generation ───────────────────────────────────────────────────────
function generatePuzzleImage(w, h) {
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const c = off.getContext('2d');
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0,   '#1a0050');
    g.addColorStop(0.3, '#550066');
    g.addColorStop(0.6, '#002866');
    g.addColorStop(1,   '#3d006e');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const circles = [
        { cx: 0.2,  cy: 0.2,  r: 0.25, color: 'rgba(180,0,100,0.45)' },
        { cx: 0.75, cy: 0.3,  r: 0.2,  color: 'rgba(0,80,200,0.4)'   },
        { cx: 0.5,  cy: 0.7,  r: 0.3,  color: 'rgba(120,0,180,0.5)'  },
        { cx: 0.9,  cy: 0.8,  r: 0.18, color: 'rgba(200,30,60,0.4)'  },
        { cx: 0.1,  cy: 0.75, r: 0.22, color: 'rgba(80,0,160,0.5)'   },
        { cx: 0.6,  cy: 0.15, r: 0.15, color: 'rgba(160,0,40,0.35)'  },
    ];
    for (const { cx, cy, r, color } of circles) {
        const rg = c.createRadialGradient(cx*w, cy*h, 0, cx*w, cy*h, r * Math.max(w, h));
        rg.addColorStop(0, color); rg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = rg; c.fillRect(0, 0, w, h);
    }
    // Subtle grid lines
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    const step = w / 8;
    for (let x = step; x < w; x += step) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,h); c.stroke(); }
    for (let y = step; y < h; y += step) { c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
    return off;
}

// ─── Jigsaw path ────────────────────────────────────────────────────────────
// Draws a jigsaw edge from (x0,y0) to (x1,y1).
// (perpX, perpY): unit vector pointing outward from the piece.
// sign: +1 = tab protrudes outward, -1 = blank indents inward, 0 = straight.
function jigEdge(ctx, x0, y0, x1, y1, perpX, perpY, sign, ts) {
    if (sign === 0) { ctx.lineTo(x1, y1); return; }

    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const tnx = dx / len, tny = dy / len;
    const hw = len * 0.18; // half-width of tab
    const off = sign * ts;

    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const s0x = mx - tnx * hw, s0y = my - tny * hw;
    const s1x = mx + tnx * hw, s1y = my + tny * hw;
    const tipX = mx + perpX * off, tipY = my + perpY * off;

    ctx.lineTo(s0x, s0y);
    ctx.bezierCurveTo(
        s0x + perpX * off * 0.75, s0y + perpY * off * 0.75,
        tipX - tnx * hw * 0.5,   tipY - tny * hw * 0.5,
        tipX, tipY
    );
    ctx.bezierCurveTo(
        tipX + tnx * hw * 0.5,   tipY + tny * hw * 0.5,
        s1x + perpX * off * 0.75, s1y + perpY * off * 0.75,
        s1x, s1y
    );
    ctx.lineTo(x1, y1);
}

// Build a clockwise jigsaw clip path for piece p at cell (cx, cy).
function jigsawPath(ctx, p, cx, cy, pw, ph, ts) {
    ctx.moveTo(cx, cy);
    jigEdge(ctx, cx,    cy,    cx+pw, cy,    0, -1, p.top,    ts); // top (→, perp=up)
    jigEdge(ctx, cx+pw, cy,    cx+pw, cy+ph, 1,  0, p.right,  ts); // right (↓, perp=right)
    jigEdge(ctx, cx+pw, cy+ph, cx,    cy+ph, 0,  1, p.bottom, ts); // bottom (←, perp=down)
    jigEdge(ctx, cx,    cy+ph, cx,    cy,   -1,  0, p.left,   ts); // left (↑, perp=left)
    ctx.closePath();
}

// ─── Puzzle start ────────────────────────────────────────────────────────────
function startPuzzle() {
    const req = Math.max(9, Math.min(420,
        parseInt(document.getElementById('piece-count-slider').value, 10) || 25));
    puzzle = shufflePuzzle(newPuzzle(req));

    document.getElementById('game-panel').style.display = '';
    document.getElementById('puz-done-msg').textContent = '';

    clearInterval(timerInterval);
    elapsedSec = 0; updateTimer();
    timerInterval = setInterval(() => { elapsedSec++; updateTimer(); }, 1000);

    buildBoard();
    buildTray();
}

function updateTimer() {
    const m = Math.floor(elapsedSec / 60), s = elapsedSec % 60;
    document.getElementById('puz-timer').textContent = m + ':' + String(s).padStart(2, '0');
}

// ─── Board ──────────────────────────────────────────────────────────────────
function buildBoard() {
    const { cols, rows } = puzzle;
    const cellPx = Math.floor(BOARD_PX / Math.max(cols, rows));
    pieceW = cellPx; pieceH = cellPx;
    boardW = pieceW * cols; boardH = pieceH * rows;
    tabSize = Math.max(4, Math.floor(Math.min(pieceW, pieceH) * TAB_RATIO));

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
    boardCtx.clearRect(0, 0, boardW, boardH);
    boardCtx.fillStyle = '#111';
    boardCtx.fillRect(0, 0, boardW, boardH);

    // Ghost grid
    boardCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    boardCtx.lineWidth = 1;
    for (let c = 0; c <= puzzle.cols; c++) {
        boardCtx.beginPath();
        boardCtx.moveTo(c * pieceW, 0); boardCtx.lineTo(c * pieceW, boardH); boardCtx.stroke();
    }
    for (let r = 0; r <= puzzle.rows; r++) {
        boardCtx.beginPath();
        boardCtx.moveTo(0, r * pieceH); boardCtx.lineTo(boardW, r * pieceH); boardCtx.stroke();
    }

    for (const p of puzzle.pieces) {
        if (p.placed) drawPieceOnBoard(p);
    }
    updateProgress();
}

function drawPieceOnBoard(p) {
    const cx = p.correctCol * pieceW;
    const cy = p.correctRow * pieceH;

    boardCtx.save();
    boardCtx.beginPath();
    jigsawPath(boardCtx, p, cx, cy, pieceW, pieceH, tabSize);
    boardCtx.clip();
    boardCtx.drawImage(sourceImage, 0, 0);
    boardCtx.restore();

    // Subtle golden outline
    boardCtx.save();
    boardCtx.beginPath();
    jigsawPath(boardCtx, p, cx, cy, pieceW, pieceH, tabSize);
    boardCtx.strokeStyle = 'rgba(244,162,97,0.35)';
    boardCtx.lineWidth = 1;
    boardCtx.stroke();
    boardCtx.restore();
}

function updateProgress() {
    const placed = puzzle.pieces.filter(p => p.placed).length;
    document.getElementById('puz-progress').textContent = `${placed} / ${puzzle.count} placed`;
}

// ─── Tray ───────────────────────────────────────────────────────────────────
function buildTray() {
    const tray = document.getElementById('puz-tray');
    tray.innerHTML = '';

    const pad = tabSize;
    const cw = pieceW + 2 * pad;
    const ch = pieceH + 2 * pad;

    for (const p of puzzle.pieces) {
        if (p.placed) continue;

        const c = document.createElement('canvas');
        c.width  = cw; c.height = ch;
        c.className = 'puz-piece';
        c.dataset.id = p.id;
        c.style.width  = cw + 'px';
        c.style.height = ch + 'px';
        c.title = `Piece ${p.id + 1}`;

        renderTrayPiece(c.getContext('2d'), p, pad, cw, ch);

        c.addEventListener('pointerdown', onPieceDown);
        tray.appendChild(c);
    }
}

function renderTrayPiece(tc, p, pad, cw, ch) {
    tc.clearRect(0, 0, cw, ch);

    tc.save();
    tc.beginPath();
    jigsawPath(tc, p, pad, pad, pieceW, pieceH, tabSize);
    tc.clip();
    // Map source region (with tab extension) to the full canvas
    tc.drawImage(sourceImage,
        p.correctCol * pieceW - pad, p.correctRow * pieceH - pad,
        pieceW + 2 * pad, pieceH + 2 * pad,
        0, 0, cw, ch
    );
    tc.restore();

    // Outline
    tc.save();
    tc.beginPath();
    jigsawPath(tc, p, pad, pad, pieceW, pieceH, tabSize);
    tc.strokeStyle = 'rgba(120,120,120,0.65)';
    tc.lineWidth = 1.5;
    tc.stroke();
    tc.restore();
}

// ─── Pointer drag ────────────────────────────────────────────────────────────
let dragPiece = null, dragFloat = null, dragOffX = 0, dragOffY = 0;

function onPieceDown(e) {
    e.preventDefault();
    const id = +e.currentTarget.dataset.id;
    dragPiece = puzzle.pieces.find(p => p.id === id);
    if (!dragPiece) return;

    const pad = tabSize;
    const cw = pieceW + 2 * pad, ch = pieceH + 2 * pad;

    // Create floating canvas
    const fl = document.createElement('canvas');
    fl.width = cw; fl.height = ch;
    Object.assign(fl.style, {
        position: 'fixed', left: '0', top: '0',
        pointerEvents: 'none', zIndex: '9999',
        width: cw + 'px', height: ch + 'px',
        opacity: '0.88', willChange: 'transform',
    });
    renderTrayPiece(fl.getContext('2d'), dragPiece, pad, cw, ch);
    document.body.appendChild(fl);
    dragFloat = fl;

    dragOffX = cw / 2;
    dragOffY = ch / 2;
    moveDrag(e.clientX, e.clientY);

    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.addEventListener('pointermove', onDragMove);
    e.currentTarget.addEventListener('pointerup',     onDragUp);
    e.currentTarget.addEventListener('pointercancel', onDragCancel);
}

function moveDrag(cx, cy) {
    if (!dragFloat) return;
    dragFloat.style.transform = `translate(${cx - dragOffX}px, ${cy - dragOffY}px)`;
}

function onDragMove(e) { moveDrag(e.clientX, e.clientY); }

function onDragUp(e) {
    cleanupDragListeners(e.currentTarget);
    if (!dragPiece) { removeDragFloat(); dragPiece = null; return; }

    const wrap = document.getElementById('puz-board-wrap');
    const rect  = wrap.getBoundingClientRect();
    const col = Math.floor((e.clientX - rect.left) / pieceW);
    const row = Math.floor((e.clientY - rect.top)  / pieceH);

    if (col >= 0 && col < puzzle.cols && row >= 0 && row < puzzle.rows) {
        const occupied = puzzle.pieces.find(p => p.placed && p.correctCol === col && p.correctRow === row);
        if (!occupied) {
            puzzle = placePiece(puzzle, dragPiece.id, col, row);
            drawBoard();
            buildTray();
            if (puzzle.solved) onSolved();
        }
    }

    removeDragFloat(); dragPiece = null;
}

function onDragCancel(e) {
    cleanupDragListeners(e.currentTarget);
    removeDragFloat(); dragPiece = null;
}

function removeDragFloat() {
    if (dragFloat) { dragFloat.remove(); dragFloat = null; }
}

function cleanupDragListeners(el) {
    el.removeEventListener('pointermove',   onDragMove);
    el.removeEventListener('pointerup',     onDragUp);
    el.removeEventListener('pointercancel', onDragCancel);
}

// ─── Solved ──────────────────────────────────────────────────────────────────
function onSolved() {
    clearInterval(timerInterval);
    const score = calcPuzzleScore(puzzle.count, elapsedSec);
    document.getElementById('puz-done-msg').textContent =
        `🎉 Solved in ${document.getElementById('puz-timer').textContent}! Score: ${score}`;
    boardCtx.drawImage(sourceImage, 0, 0);
    maybeUpdateHighScore(score);
}

function maybeUpdateHighScore(score) {
    if (!window.FIREBASE_READY) return;
    const ref = firebase.database().ref(FB_HS);
    ref.once('value', snap => {
        const v   = snap.val();
        const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
        if (score > cur) ref.set({ score: Math.min(score, 999999), username: String(myName).slice(0, 40) });
    });
}

if (window.FIREBASE_READY) {
    firebase.database().ref(FB_HS).on('value', snap => {
        const v = snap.val();
        if (!v) return;
        document.getElementById('hs-val').textContent  = Number.isFinite(v.score) ? v.score : '—';
        document.getElementById('hs-user').textContent = typeof v.username === 'string' ? v.username.slice(0, 40) : '—';
    });
}
