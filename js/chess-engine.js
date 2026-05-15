'use strict';

// Piece constants (positive=white, negative=black)
const CH_EMPTY = 0;
const CH_PAWN = 1, CH_KNIGHT = 2, CH_BISHOP = 3, CH_ROOK = 4, CH_QUEEN = 5, CH_KING = 6;
const CH_WHITE = 1, CH_BLACK = -1;
const CH_MAX_SCORE = 9999;

// Material values (centipawns)
const MATERIAL = [0, 100, 320, 330, 500, 900, 20000];

// Piece-square tables (white's perspective, row 0=rank8, row 7=rank1)
const PST = {
    1: [ // pawn
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [ 50, 50, 50, 50, 50, 50, 50, 50],
        [ 10, 10, 20, 30, 30, 20, 10, 10],
        [  5,  5, 10, 25, 25, 10,  5,  5],
        [  0,  0,  0, 20, 20,  0,  0,  0],
        [  5, -5,-10,  0,  0,-10, -5,  5],
        [  5, 10, 10,-20,-20, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0],
    ],
    2: [ // knight
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50],
    ],
    3: [ // bishop
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20],
    ],
    4: [ // rook
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [  5, 10, 10, 10, 10, 10, 10,  5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [  0,  0,  0,  5,  5,  0,  0,  0],
    ],
    5: [ // queen
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20],
    ],
    6: [ // king (middlegame)
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20],
    ],
};

function newChessGame() {
    const board = [
        [-4,-2,-3,-5,-6,-3,-2,-4],
        [-1,-1,-1,-1,-1,-1,-1,-1],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 1, 1, 1, 1, 1, 1, 1, 1],
        [ 4, 2, 3, 5, 6, 3, 2, 4],
    ];
    return {
        board,
        turn:       CH_WHITE,
        castling:   { wK: true, wQ: true, bK: true, bQ: true },
        enPassant:  null,
        halfMove:   0,
        fullMove:   1,
        status:     'active',  // 'active'|'check'|'checkmate'|'stalemate'|'draw'
    };
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function abs(p)         { return p < 0 ? -p : p; }
function colorOf(p)     { return p > 0 ? CH_WHITE : CH_BLACK; }
function owns(p, color) { return p !== 0 && colorOf(p) === color; }
function enemy(p, color){ return p !== 0 && colorOf(p) !== color; }

// Raw pseudo-legal moves for a single piece (ignores check)
function rawMoves(board, r, c, ep, castling) {
    const piece = board[r][c];
    if (!piece) return [];
    const color = colorOf(piece);
    const type  = abs(piece);
    const moves = [];

    const push = (tr, tc, flags) => { if (inBounds(tr, tc)) moves.push({ r, c, tr, tc, ...(flags || {}) }); };
    const slide = (dr, dc) => {
        for (let s = 1; s < 8; s++) {
            const nr = r + dr * s, nc = c + dc * s;
            if (!inBounds(nr, nc) || owns(board[nr][nc], color)) break;
            moves.push({ r, c, tr: nr, tc: nc });
            if (board[nr][nc]) break;
        }
    };

    if (type === CH_PAWN) {
        const dir = color === CH_WHITE ? -1 : 1;
        const startRow = color === CH_WHITE ? 6 : 1;
        const promRow  = color === CH_WHITE ? 0 : 7;
        const nr = r + dir;
        if (inBounds(nr, c) && !board[nr][c]) {
            if (nr === promRow) {
                for (const pt of [CH_QUEEN, CH_ROOK, CH_BISHOP, CH_KNIGHT])
                    moves.push({ r, c, tr: nr, tc: c, promo: pt * color });
            } else {
                push(nr, c);
                if (r === startRow && !board[nr + dir][c])
                    moves.push({ r, c, tr: nr + dir, tc: c, double: true });
            }
        }
        for (const dc of [-1, 1]) {
            const ac = c + dc;
            if (!inBounds(nr, ac)) continue;
            if (enemy(board[nr][ac], color)) {
                if (nr === promRow) {
                    for (const pt of [CH_QUEEN, CH_ROOK, CH_BISHOP, CH_KNIGHT])
                        moves.push({ r, c, tr: nr, tc: ac, promo: pt * color });
                } else push(nr, ac);
            } else if (ep && ep.r === nr && ep.c === ac) {
                moves.push({ r, c, tr: nr, tc: ac, ep: true });
            }
        }
    } else if (type === CH_KNIGHT) {
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
            if (inBounds(r+dr, c+dc) && !owns(board[r+dr][c+dc], color))
                push(r+dr, c+dc);
    } else if (type === CH_BISHOP) {
        for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
    } else if (type === CH_ROOK) {
        for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
    } else if (type === CH_QUEEN) {
        for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) slide(dr, dc);
    } else if (type === CH_KING) {
        for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
            if (inBounds(r+dr,c+dc) && !owns(board[r+dr][c+dc], color)) push(r+dr, c+dc);
        // Castling
        if (castling) {
            const row = color === CH_WHITE ? 7 : 0;
            if (r === row && c === 4) {
                const kKey = color === CH_WHITE ? 'wK' : 'bK';
                const qKey = color === CH_WHITE ? 'wQ' : 'bQ';
                if (castling[kKey] && !board[row][5] && !board[row][6])
                    moves.push({ r, c, tr: row, tc: 6, castle: 'K' });
                if (castling[qKey] && !board[row][3] && !board[row][2] && !board[row][1])
                    moves.push({ r, c, tr: row, tc: 2, castle: 'Q' });
            }
        }
    }
    return moves;
}

function isSquareAttacked(board, r, c, byColor) {
    // Check if (r,c) is attacked by any piece of byColor
    // White pawns move up (decreasing row), so a white pawn at row+1 attacks row.
    const pDir = byColor === CH_WHITE ? 1 : -1;
    for (const dc of [-1, 1]) {
        const pr = r + pDir, pc = c + dc;
        if (inBounds(pr, pc) && board[pr][pc] === CH_PAWN * byColor) return true;
    }
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r+dr, nc = c+dc;
        if (inBounds(nr,nc) && board[nr][nc] === CH_KNIGHT * byColor) return true;
    }
    for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        for (let s = 1; s < 8; s++) {
            const nr = r+dr*s, nc = c+dc*s;
            if (!inBounds(nr,nc)) break;
            const p = board[nr][nc];
            if (p) { if ((abs(p)===CH_BISHOP||abs(p)===CH_QUEEN) && colorOf(p)===byColor) return true; break; }
        }
    }
    for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        for (let s = 1; s < 8; s++) {
            const nr = r+dr*s, nc = c+dc*s;
            if (!inBounds(nr,nc)) break;
            const p = board[nr][nc];
            if (p) { if ((abs(p)===CH_ROOK||abs(p)===CH_QUEEN) && colorOf(p)===byColor) return true; break; }
        }
    }
    for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nr = r+dr, nc = c+dc;
        if (inBounds(nr,nc) && board[nr][nc] === CH_KING * byColor) return true;
    }
    return false;
}

function findKing(board, color) {
    const king = CH_KING * color;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (board[r][c] === king) return { r, c };
    return null;
}

function isInCheck(board, color) {
    const k = findKing(board, color);
    return k ? isSquareAttacked(board, k.r, k.c, -color) : false;
}

function applyMove(state, move) {
    const board = state.board.map(row => row.slice());
    const { r, c, tr, tc } = move;

    // Handle en passant capture
    if (move.ep) {
        const capturedRow = r;  // captured pawn is on same row as moving pawn
        board[capturedRow][tc] = 0;
    }

    // Handle castling rook
    if (move.castle) {
        const row = r;
        if (move.castle === 'K') { board[row][5] = board[row][7]; board[row][7] = 0; }
        else                     { board[row][3] = board[row][0]; board[row][0] = 0; }
    }

    board[tr][tc] = move.promo !== undefined ? move.promo : board[r][c];
    board[r][c]   = 0;

    const castling = { ...state.castling };
    if (r === 7 && c === 4) { castling.wK = false; castling.wQ = false; }
    if (r === 0 && c === 4) { castling.bK = false; castling.bQ = false; }
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 0 && c === 0) castling.bQ = false;
    if (r === 0 && c === 7) castling.bK = false;

    const enPassant = move.double
        ? { r: r + (state.turn === CH_WHITE ? -1 : 1), c: tc }
        : null;

    const nextTurn = -state.turn;
    const halfMove = (abs(board[r][c]) === CH_PAWN || state.board[tr][tc]) ? 0 : state.halfMove + 1;
    const fullMove = state.turn === CH_BLACK ? state.fullMove + 1 : state.fullMove;

    return { board, turn: nextTurn, castling, enPassant, halfMove, fullMove, status: 'active' };
}

function getLegalMoves(state) {
    const pseudo = [];
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++)
            if (owns(state.board[r][c], state.turn))
                pseudo.push(...rawMoves(state.board, r, c, state.enPassant, state.castling));

    return pseudo.filter(m => {
        const next = applyMove(state, m);
        if (isInCheck(next.board, state.turn)) return false;
        // Validate castling: king must not pass through attacked square
        if (m.castle) {
            const row = m.r;
            const passTc = m.castle === 'K' ? 5 : 3;
            const tmpBoard = state.board.map(row => row.slice());
            tmpBoard[row][passTc] = tmpBoard[row][4]; tmpBoard[row][4] = 0;
            if (isInCheck(tmpBoard, state.turn)) return false;
            if (isInCheck(state.board, state.turn)) return false;
        }
        return true;
    });
}

function updateStatus(state) {
    const moves = getLegalMoves(state);
    if (moves.length) {
        const inCheck = isInCheck(state.board, state.turn);
        return { ...state, status: inCheck ? 'check' : 'active', legalMoves: moves };
    }
    if (isInCheck(state.board, state.turn)) return { ...state, status: 'checkmate', legalMoves: [] };
    return { ...state, status: 'stalemate', legalMoves: [] };
}

// ── Evaluation ────────────────────────────────────────────────────────────────

function pstValue(piece, r, c) {
    const type  = abs(piece);
    const color = colorOf(piece);
    const table = PST[type];
    if (!table) return 0;
    const row = color === CH_WHITE ? r : 7 - r;
    return color * table[row][c];
}

function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            score += colorOf(p) * MATERIAL[abs(p)] + pstValue(p, r, c);
        }
    return score;
}

// ── Move ordering (MVV-LVA: captures of high-value pieces first) ──────────────
function mvvLva(board, m) {
    const victim = board[m.tr][m.tc];
    return victim ? MATERIAL[abs(victim)] * 10 - MATERIAL[abs(board[m.r][m.c])] : 0;
}

function orderMoves(board, moves) {
    return moves.sort((a, b) => mvvLva(board, b) - mvvLva(board, a));
}

// ── Minimax ───────────────────────────────────────────────────────────────────

function minimax(state, depth, alpha, beta, maximizing) {
    const legalMoves = getLegalMoves(state);
    if (depth === 0 || !legalMoves.length) {
        if (!legalMoves.length) {
            if (isInCheck(state.board, state.turn))
                return maximizing ? -99999 : 99999;
            return 0; // stalemate
        }
        return evaluateBoard(state.board);
    }
    orderMoves(state.board, legalMoves);
    if (maximizing) {
        let best = -Infinity;
        for (const m of legalMoves) {
            best = Math.max(best, minimax(applyMove(state, m), depth-1, alpha, beta, false));
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const m of legalMoves) {
            best = Math.min(best, minimax(applyMove(state, m), depth-1, alpha, beta, true));
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

const CHESS_DEPTH_MAP = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4];

function getChessAIMove(state, difficulty) {
    const moves = getLegalMoves(state);
    if (!moves.length) return null;
    const d = CHESS_DEPTH_MAP[Math.max(0, Math.min(9, Math.floor(difficulty)))];
    if (d === 0) return moves[Math.floor(Math.random() * moves.length)];

    orderMoves(state.board, moves);
    const maximizing = state.turn === CH_WHITE;
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMove  = moves[0];
    for (const m of moves) {
        const s = minimax(applyMove(state, m), d - 1, -Infinity, Infinity, !maximizing);
        if (maximizing ? s > bestScore : s < bestScore) { bestScore = s; bestMove = m; }
    }
    return bestMove;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CH_WHITE, CH_BLACK, CH_EMPTY, CH_PAWN, CH_KNIGHT, CH_BISHOP,
        CH_ROOK, CH_QUEEN, CH_KING, CH_MAX_SCORE,
        newChessGame, getLegalMoves, applyMove, updateStatus,
        isInCheck, isSquareAttacked, findKing, evaluateBoard, getChessAIMove,
        rawMoves
    };
}
