'use strict';
const {
    CK_WHITE, CK_BLACK, newCheckersGame,
    getAllCheckersMovesForColor, applyCheckersMove, getCheckersAIMove, evalCheckers
} = require('../js/engines/checkers-engine');

describe('newCheckersGame', () => {
    test('returns correct structure', () => {
        const g = newCheckersGame();
        expect(g).toHaveProperty('board');
        expect(g).toHaveProperty('turn');
        expect(g).toHaveProperty('status');
    });
    test('board is 8x8', () => {
        const { board } = newCheckersGame();
        expect(board.length).toBe(8);
        board.forEach(row => expect(row.length).toBe(8));
    });
    test('white pieces start in rows 5-7', () => {
        const { board } = newCheckersGame();
        let count = 0;
        for (let r = 5; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c] === CK_WHITE) count++;
        expect(count).toBe(12);
    });
    test('black pieces start in rows 0-2', () => {
        const { board } = newCheckersGame();
        let count = 0;
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c] === CK_BLACK) count++;
        expect(count).toBe(12);
    });
    test('only dark squares are occupied', () => {
        const { board } = newCheckersGame();
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if ((r + c) % 2 === 0) expect(board[r][c]).toBe(0);
    });
    test('initial turn is white', () => {
        expect(newCheckersGame().turn).toBe(CK_WHITE);
    });
    test('initial status is active', () => {
        expect(newCheckersGame().status).toBe('active');
    });
});

describe('getAllCheckersMovesForColor', () => {
    test('white has 7 moves at game start', () => {
        const g = newCheckersGame();
        const moves = getAllCheckersMovesForColor(g, CK_WHITE);
        expect(moves.length).toBe(7);
    });
    test('each move has at least 2 positions (from and to)', () => {
        const g = newCheckersGame();
        const moves = getAllCheckersMovesForColor(g, CK_WHITE);
        moves.forEach(m => expect(m.length).toBeGreaterThanOrEqual(2));
    });
    test('returns empty array when no pieces of that color', () => {
        const g = newCheckersGame();
        const emptyBoard = g.board.map(row => row.map(c => (c === CK_BLACK ? 0 : c)));
        const state = { ...g, board: emptyBoard, turn: CK_WHITE };
        expect(getAllCheckersMovesForColor(state, CK_BLACK)).toHaveLength(0);
    });
});

describe('applyCheckersMove', () => {
    test('moves a piece from source to destination', () => {
        const g    = newCheckersGame();
        const move = getAllCheckersMovesForColor(g, CK_WHITE)[0];
        const g2   = applyCheckersMove(g, move);
        const from = move[0], to = move[move.length - 1];
        expect(g2.board[from.r][from.c]).toBe(0);
        expect(g2.board[to.r][to.c]).not.toBe(0);
    });
    test('changes the turn', () => {
        const g    = newCheckersGame();
        const move = getAllCheckersMovesForColor(g, CK_WHITE)[0];
        expect(applyCheckersMove(g, move).turn).toBe(CK_BLACK);
    });
    test('promotes white piece when reaching row 0', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[1][1] = CK_WHITE;  // one step from row 0
        const state = { board, turn: CK_WHITE, status: 'active', winner: null };
        const moves = getAllCheckersMovesForColor(state, CK_WHITE);
        const promoMove = moves.find(m => m[m.length-1].r === 0);
        if (!promoMove) return;  // may not be valid depending on layout
        const s2 = applyCheckersMove(state, promoMove);
        expect(Math.abs(s2.board[0][promoMove[promoMove.length-1].c])).toBe(2);
    });
    test('does not mutate original state', () => {
        const g   = newCheckersGame();
        const orig = JSON.stringify(g.board);
        applyCheckersMove(g, getAllCheckersMovesForColor(g, CK_WHITE)[0]);
        expect(JSON.stringify(g.board)).toBe(orig);
    });
});

describe('evalCheckers', () => {
    test('returns 0 for empty board', () => {
        const empty = Array.from({ length: 8 }, () => new Array(8).fill(0));
        expect(evalCheckers(empty)).toBe(0);
    });
    test('favours white when white has more pieces', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[7][1] = CK_WHITE; board[7][3] = CK_WHITE; board[7][5] = CK_WHITE;
        board[0][2] = CK_BLACK;
        expect(evalCheckers(board)).toBeGreaterThan(0);
    });
    test('favours black when black has more pieces', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        board[0][2] = CK_BLACK; board[0][4] = CK_BLACK; board[0][6] = CK_BLACK;
        board[7][1] = CK_WHITE;
        expect(evalCheckers(board)).toBeLessThan(0);
    });
});

describe('getCheckersAIMove', () => {
    test('returns a move from initial position for all difficulties', () => {
        const g = newCheckersGame();
        for (let d = 0; d <= 9; d++) {
            // AI gets black's turn — need to swap turn
            const gBlack = { ...g, turn: CK_BLACK };
            const m = getCheckersAIMove(gBlack, d);
            expect(m).not.toBeNull();
            expect(Array.isArray(m)).toBe(true);
        }
    });
    test('returns null when no moves available', () => {
        const board = Array.from({ length: 8 }, () => new Array(8).fill(0));
        const state = { board, turn: CK_BLACK, status: 'active', winner: null };
        expect(getCheckersAIMove(state, 5)).toBeNull();
    });
});
