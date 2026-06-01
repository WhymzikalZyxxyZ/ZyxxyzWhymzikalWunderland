'use strict';

// Board: 8×8 array. Only dark squares used (col+row odd).
// 0=empty, 1=white man, 2=white king, -1=black man, -2=black king
const CK_WHITE = 1, CK_BLACK = -1;
const CK_MAX_SCORE = 9999;

function newCheckersGame() {
    const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 8; c++)
            if ((r + c) % 2 === 1) board[r][c] = CK_BLACK;
    for (let r = 5; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if ((r + c) % 2 === 1) board[r][c] = CK_WHITE;
    return { board, turn: CK_WHITE, status: 'active', winner: null };
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function colorOf(p)   { return p > 0 ? CK_WHITE : CK_BLACK; }
function ownsPiece(piece, color) { return piece !== 0 && colorOf(piece) === color; }

// dirs: white moves up (dr=-1), black moves down (dr=+1); kings both
function pieceDirs(piece) {
    if (piece === CK_WHITE)  return [[-1, -1], [-1, 1]];
    if (piece === CK_BLACK)  return [[ 1, -1], [ 1, 1]];
    return [[-1,-1],[-1,1],[1,-1],[1,1]];  // king
}

// Returns all jump sequences from (r,c) as arrays of destination squares
function getJumps(board, r, c, visited) {
    const piece   = board[r][c];
    if (!piece) return [];
    const color   = colorOf(piece);
    const dirs    = pieceDirs(piece);
    const results = [];
    for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc;  // middle (captured)
        const lr = r + 2 * dr, lc = c + 2 * dc;  // landing
        if (!inBounds(lr, lc)) continue;
        const mid = board[mr][mc];
        if (!mid || colorOf(mid) === color) continue;
        const key = `${lr},${lc}`;
        if (visited.has(key)) continue;
        // Simulate jump to find further jumps
        const nb = board.map(row => row.slice());
        nb[lr][lc] = nb[r][c]; nb[r][c] = 0; nb[mr][mc] = 0;
        // Promote if applicable
        if (lr === 0 && nb[lr][lc] === CK_WHITE) nb[lr][lc] = 2;
        if (lr === 7 && nb[lr][lc] === CK_BLACK) nb[lr][lc] = -2;
        const further = getJumps(nb, lr, lc, new Set([...visited, key]));
        if (further.length) {
            for (const f of further) results.push([{ r, c }, { r: lr, c: lc }, ...f.slice(1)]);
        } else {
            results.push([{ r, c }, { r: lr, c: lc }]);
        }
    }
    return results;
}

// Returns all legal moves for the given color (mandatory capture enforced)
function getAllCheckersMovesForColor(state, color) {
    const { board } = state;
    const jumps = [], quiets = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!ownsPiece(piece, color)) continue;
            const pjumps = getJumps(board, r, c, new Set([`${r},${c}`]));
            jumps.push(...pjumps);
            if (!pjumps.length) {
                for (const [dr, dc] of pieceDirs(piece)) {
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc) && !board[nr][nc])
                        quiets.push([{ r, c }, { r: nr, c: nc }]);
                }
            }
        }
    }
    return jumps.length ? jumps : quiets;
}

function applyCheckersMove(state, move) {
    const board = state.board.map(row => row.slice());
    const from  = move[0], to = move[move.length - 1];

    board[to.r][to.c] = board[from.r][from.c];
    board[from.r][from.c] = 0;

    // Remove captured pieces
    for (let i = 0; i < move.length - 1; i++) {
        const mr = (move[i].r + move[i+1].r) / 2;
        const mc = (move[i].c + move[i+1].c) / 2;
        if (Number.isInteger(mr) && Number.isInteger(mc)) board[mr][mc] = 0;
    }

    // Promotion
    if (to.r === 0 && board[to.r][to.c] === CK_WHITE) board[to.r][to.c] = 2;
    if (to.r === 7 && board[to.r][to.c] === CK_BLACK) board[to.r][to.c] = -2;

    const nextTurn = -state.turn;
    const nextMoves = getAllCheckersMovesForColor({ board, turn: nextTurn }, nextTurn);
    let status = 'active', winner = null;
    if (!nextMoves.length) {
        status = 'finished';
        winner = state.turn;
    }
    return { board, turn: nextTurn, status, winner };
}

// Simple material evaluation: men=1, kings=2, positional bonus
function evalCheckers(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const val = Math.abs(p) === 2 ? 3 : 1;
            // Slight advancement bonus for men
            const adv = Math.abs(p) === 1 ? (p > 0 ? (7 - r) * 0.05 : r * 0.05) : 0;
            score += colorOf(p) * (val + adv);
        }
    }
    return score;
}

function minimaxCheckers(state, depth, alpha, beta, maximizing) {
    const moves = getAllCheckersMovesForColor(state, state.turn);
    if (depth === 0 || state.status !== 'active') return evalCheckers(state.board);

    if (maximizing) {
        let best = -Infinity;
        for (const m of moves) {
            best = Math.max(best, minimaxCheckers(applyCheckersMove(state, m), depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of moves) {
            best = Math.min(best, minimaxCheckers(applyCheckersMove(state, m), depth - 1, alpha, beta, true));
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

const CK_DEPTH_MAP = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5];

function getCheckersAIMove(state, difficulty) {
    const moves = getAllCheckersMovesForColor(state, state.turn);
    if (!moves.length) return null;
    const d = CK_DEPTH_MAP[Math.max(0, Math.min(9, Math.floor(difficulty)))];
    if (d === 0) return moves[Math.floor(Math.random() * moves.length)];

    const maximizing = state.turn === CK_WHITE;
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMove  = moves[0];
    for (const m of moves) {
        const s = minimaxCheckers(applyCheckersMove(state, m), d - 1,
                                  -Infinity, Infinity, !maximizing);
        if (maximizing ? s > bestScore : s < bestScore) { bestScore = s; bestMove = m; }
    }
    return bestMove;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CK_WHITE, CK_BLACK, CK_MAX_SCORE,
        newCheckersGame, getAllCheckersMovesForColor, applyCheckersMove,
        getCheckersAIMove, evalCheckers
    };
}
