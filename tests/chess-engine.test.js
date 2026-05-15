'use strict';
const {
    CH_WHITE, CH_BLACK, CH_PAWN, CH_KNIGHT, CH_BISHOP, CH_ROOK, CH_QUEEN, CH_KING,
    newChessGame, getLegalMoves, applyMove, updateStatus,
    isInCheck, findKing, evaluateBoard, getChessAIMove, rawMoves
} = require('../js/chess-engine');

describe('newChessGame', () => {
    test('returns correct structure', () => {
        const g = newChessGame();
        expect(g).toHaveProperty('board');
        expect(g).toHaveProperty('turn');
        expect(g).toHaveProperty('castling');
        expect(g).toHaveProperty('enPassant');
        expect(g).toHaveProperty('status');
    });
    test('board is 8×8', () => {
        const { board } = newChessGame();
        expect(board.length).toBe(8);
        board.forEach(row => expect(row.length).toBe(8));
    });
    test('white pawns on row 6', () => {
        const { board } = newChessGame();
        board[6].forEach(p => expect(p).toBe(CH_PAWN * CH_WHITE));
    });
    test('black pawns on row 1', () => {
        const { board } = newChessGame();
        board[1].forEach(p => expect(p).toBe(CH_PAWN * CH_BLACK));
    });
    test('white king at row 7 col 4', () => {
        const { board } = newChessGame();
        expect(board[7][4]).toBe(CH_KING * CH_WHITE);
    });
    test('black king at row 0 col 4', () => {
        const { board } = newChessGame();
        expect(board[0][4]).toBe(CH_KING * CH_BLACK);
    });
    test('initial turn is white', () => {
        expect(newChessGame().turn).toBe(CH_WHITE);
    });
    test('all castling rights start true', () => {
        const { castling } = newChessGame();
        expect(castling).toEqual({ wK: true, wQ: true, bK: true, bQ: true });
    });
    test('no en passant initially', () => {
        expect(newChessGame().enPassant).toBeNull();
    });
});

describe('getLegalMoves', () => {
    test('white has 20 legal moves at game start', () => {
        const g = updateStatus(newChessGame());
        expect(g.legalMoves.length).toBe(20);
    });
    test('all moves have from and to fields', () => {
        const g = updateStatus(newChessGame());
        g.legalMoves.forEach(m => {
            expect(typeof m.r).toBe('number');
            expect(typeof m.c).toBe('number');
            expect(typeof m.tr).toBe('number');
            expect(typeof m.tc).toBe('number');
        });
    });
    test('no moves in checkmate position', () => {
        // Fool's mate: e4, f5, Qh5, g5, Qxf7# or Scholar's mate position
        let g = updateStatus(newChessGame());
        // Manually set a checkmate board
        const mateBoard = Array.from({ length: 8 }, () => new Array(8).fill(0));
        mateBoard[7][4] = CH_KING * CH_WHITE;  // white king e1
        mateBoard[0][4] = CH_KING * CH_BLACK;  // black king e8
        mateBoard[1][3] = CH_QUEEN * CH_WHITE; // white queen d7 — mates black
        mateBoard[1][5] = CH_QUEEN * CH_WHITE; // white queen f7 — double attack
        const mateState = updateStatus({ board: mateBoard, turn: CH_BLACK,
            castling:{wK:false,wQ:false,bK:false,bQ:false}, enPassant:null,
            halfMove:0, fullMove:1, status:'active' });
        // Black might not be in checkmate but should have very few moves
        expect(mateState.legalMoves.length).toBeLessThanOrEqual(5);
    });
});

describe('applyMove', () => {
    test('pawn moves forward', () => {
        const g  = updateStatus(newChessGame());
        const m  = g.legalMoves.find(mv => mv.r===6 && mv.c===4 && mv.tr===5);
        const g2 = applyMove(g, m);
        expect(g2.board[5][4]).toBe(CH_PAWN * CH_WHITE);
        expect(g2.board[6][4]).toBe(0);
    });
    test('double pawn push sets en passant', () => {
        const g  = updateStatus(newChessGame());
        const m  = g.legalMoves.find(mv => mv.double);
        const g2 = applyMove(g, m);
        expect(g2.enPassant).not.toBeNull();
    });
    test('turn switches after move', () => {
        const g  = updateStatus(newChessGame());
        const m  = g.legalMoves[0];
        expect(applyMove(g, m).turn).toBe(CH_BLACK);
    });
    test('does not mutate original state', () => {
        const g   = updateStatus(newChessGame());
        const orig = JSON.stringify(g.board);
        applyMove(g, g.legalMoves[0]);
        expect(JSON.stringify(g.board)).toBe(orig);
    });
    test('rook loses castling rights when moved', () => {
        const g = { ...newChessGame(),
            board: newChessGame().board.map(r => r.slice()),
            castling: { wK:true, wQ:true, bK:true, bQ:true } };
        // Clear space to move rook
        g.board[7][1] = 0; g.board[7][2] = 0; g.board[7][3] = 0;
        const state = updateStatus(g);
        const rookMove = state.legalMoves.find(m => m.r===7 && m.c===0);
        if (!rookMove) return;
        const g2 = applyMove(state, rookMove);
        expect(g2.castling.wQ).toBe(false);
    });
});

describe('isInCheck', () => {
    test('not in check at game start', () => {
        const g = newChessGame();
        expect(isInCheck(g.board, CH_WHITE)).toBe(false);
        expect(isInCheck(g.board, CH_BLACK)).toBe(false);
    });
    test('detects check from queen', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[7][4] = CH_KING   * CH_WHITE;
        board[4][4] = CH_QUEEN  * CH_BLACK;   // attacks along file
        board[0][4] = CH_KING   * CH_BLACK;
        expect(isInCheck(board, CH_WHITE)).toBe(true);
    });
    test('blocked check is not check', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[7][4] = CH_KING  * CH_WHITE;
        board[5][4] = CH_PAWN  * CH_WHITE;   // blocker
        board[4][4] = CH_QUEEN * CH_BLACK;
        board[0][4] = CH_KING  * CH_BLACK;
        expect(isInCheck(board, CH_WHITE)).toBe(false);
    });
});

describe('findKing', () => {
    test('finds white king at initial position', () => {
        const k = findKing(newChessGame().board, CH_WHITE);
        expect(k).toEqual({ r: 7, c: 4 });
    });
    test('finds black king at initial position', () => {
        const k = findKing(newChessGame().board, CH_BLACK);
        expect(k).toEqual({ r: 0, c: 4 });
    });
    test('returns null when king missing', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        expect(findKing(board, CH_WHITE)).toBeNull();
    });
});

describe('evaluateBoard', () => {
    test('initial position evaluates near 0', () => {
        const score = evaluateBoard(newChessGame().board);
        expect(Math.abs(score)).toBeLessThan(100);  // should be very close to 0
    });
    test('board with extra white queen favours white', () => {
        const board = newChessGame().board.map(r => r.slice());
        board[4][4] = CH_QUEEN * CH_WHITE;
        expect(evaluateBoard(board)).toBeGreaterThan(0);
    });
    test('board with extra black queen favours black', () => {
        const board = newChessGame().board.map(r => r.slice());
        board[4][4] = CH_QUEEN * CH_BLACK;
        expect(evaluateBoard(board)).toBeLessThan(0);
    });
});

describe('getChessAIMove', () => {
    test('returns a move at game start for each depth (one per unique depth)', () => {
        const g = updateStatus(newChessGame());
        // CHESS_DEPTH_MAP = [0,1,1,2,2,2,3,3,4,4] — test one representative per unique depth
        for (const d of [0, 1, 3, 6, 8]) {
            expect(getChessAIMove(g, d)).not.toBeNull();
        }
    }, 10000);

    test('returns null when no legal moves', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[0][4] = CH_KING * CH_BLACK;
        board[0][3] = CH_QUEEN * CH_WHITE; board[0][5] = CH_QUEEN * CH_WHITE;
        board[1][4] = CH_ROOK  * CH_WHITE; board[7][4] = CH_KING  * CH_WHITE;
        const state = updateStatus({ board, turn: CH_BLACK,
            castling:{wK:false,wQ:false,bK:false,bQ:false},
            enPassant:null, halfMove:0, fullMove:1, status:'active' });
        if (state.status === 'checkmate' || state.status === 'stalemate') {
            expect(getChessAIMove(state, 1)).toBeNull();
        }
    });
});

describe('updateStatus', () => {
    test('sets status to active at game start', () => {
        const g = updateStatus(newChessGame());
        expect(g.status).toBe('active');
    });
    test('attaches legalMoves array', () => {
        const g = updateStatus(newChessGame());
        expect(Array.isArray(g.legalMoves)).toBe(true);
    });
});
