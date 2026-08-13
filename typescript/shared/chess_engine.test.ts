import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, applyMove, getLegalMoves, ChessStatus, P, K, R } from './chess_engine.js';

// ── Board setup ──────────────────────────────────────────────────────────────

test('initial board corners are rooks', () => {
    const g = newGame();
    assert.equal(g.board[0][0], -R);
    assert.equal(g.board[0][7], -R);
    assert.equal(g.board[7][0], R);
    assert.equal(g.board[7][7], R);
});

test('white to move first', () => {
    assert.equal(newGame().turn, 1);
});

test('initial status is active', () => {
    assert.equal(newGame().status, ChessStatus.ACTIVE);
});

test('initial legal move count is 20', () => {
    assert.equal(newGame().legalMoves.length, 20);
});

// ── Apply move ───────────────────────────────────────────────────────────────

test('e4 places pawn and clears source', () => {
    const g = newGame();
    const m = g.legalMoves.find(m => m.r === 6 && m.c === 4 && m.tr === 4)!;
    const g2 = applyMove(g, m);
    assert.equal(g2.board[4][4], P);
    assert.equal(g2.board[6][4], 0);
});

test('e4 sets en passant square', () => {
    const g = newGame();
    const m = g.legalMoves.find(m => m.r === 6 && m.c === 4 && m.tr === 4)!;
    const g2 = applyMove(g, m);
    assert.equal(g2.epR, 5);
    assert.equal(g2.epC, 4);
});

test('turn flips after move', () => {
    const g = newGame();
    assert.equal(applyMove(g, g.legalMoves[0]).turn, -1);
});

test('full move increments after black moves', () => {
    let g = newGame();
    g = applyMove(g, g.legalMoves.find(m => m.r === 6 && m.c === 4 && m.tr === 4)!);
    g = applyMove(g, g.legalMoves.find(m => m.r === 1 && m.c === 4 && m.tr === 3)!);
    assert.equal(g.fullMove, 2);
});

test('half move resets on pawn move', () => {
    const g = newGame();
    assert.equal(applyMove(g, g.legalMoves[0]).halfMove, 0);
});

// Regression: applyMove computed the capture check against the already-
// mutated post-move board, so the destination square was never empty and
// halfMove silently reset to 0 on every move — breaking the fifty-move-rule
// clock. See commit history for details.
test('half move increments on non-pawn non-capture', () => {
    const g = newGame();
    const m = g.legalMoves.find(m => m.r === 7 && m.c === 1)!; // Nb1
    const g2 = applyMove(g, m);
    assert.equal(g2.halfMove, 1);
});

// ── Castling ─────────────────────────────────────────────────────────────────

test('white kingside castle moves king and rook', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill(0));
    board[7][4] = K; board[7][7] = R; board[0][4] = -K;
    const legalMoves = getLegalMoves(board, 1, true, false, false, false, -1, -1);
    const g = { board, turn: 1, wK: true, wQ: false, bK: false, bQ: false,
                epR: -1, epC: -1, halfMove: 0, fullMove: 1,
                status: ChessStatus.ACTIVE, legalMoves };
    const castle = g.legalMoves.find(m => m.castle === 'K')!;
    const g2 = applyMove(g, castle);
    assert.equal(g2.board[7][6], K);
    assert.equal(g2.board[7][5], R);
    assert.equal(g2.board[7][7], 0);
});
