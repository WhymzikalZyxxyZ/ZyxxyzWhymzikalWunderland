'use strict';
const { COLS, ROWS, MAX_SCORE, SHAPES, newBoard, newPiece, collides, rotateShape, clearLines } = require('../js/tetris-engine');

// ── Constants ────────────────────────────────────────────────────────────────
test('COLS is 10', () => expect(COLS).toBe(10));
test('ROWS is 20', () => expect(ROWS).toBe(20));
test('MAX_SCORE is 9999999', () => expect(MAX_SCORE).toBe(9999999));

// ── newBoard ─────────────────────────────────────────────────────────────────
describe('newBoard', () => {
    test('returns ROWS rows', () => expect(newBoard().length).toBe(ROWS));
    test('each row has COLS cells', () => newBoard().forEach(r => expect(r.length).toBe(COLS)));
    test('all cells are 0', () => newBoard().forEach(r => r.forEach(v => expect(v).toBe(0))));
    test('returns independent rows', () => {
        const b = newBoard();
        b[0][0] = 9;
        expect(b[1][0]).toBe(0);
    });
});

// ── newPiece ─────────────────────────────────────────────────────────────────
describe('newPiece', () => {
    test('has id between 1 and 7', () => {
        for (let i = 0; i < 20; i++) {
            const p = newPiece();
            expect(p.id).toBeGreaterThanOrEqual(1);
            expect(p.id).toBeLessThanOrEqual(7);
        }
    });
    test('shape matches SHAPES[id]', () => {
        for (let i = 0; i < 20; i++) {
            const p = newPiece();
            expect(p.shape).toEqual(SHAPES[p.id]);
        }
    });
    test('x is centred on board', () => {
        const p = newPiece();
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(COLS);
    });
    test('y starts at 0', () => expect(newPiece().y).toBe(0));
    test('shape is a copy, not the original array', () => {
        const p = newPiece();
        p.shape[0][0] = 99;
        expect(SHAPES[p.id][0][0]).not.toBe(99);
    });
});

// ── rotateShape ──────────────────────────────────────────────────────────────
describe('rotateShape', () => {
    test('rotates a 2×2 shape correctly', () => {
        const shape = [[1, 2], [3, 4]];
        expect(rotateShape(shape)).toEqual([[3, 1], [4, 2]]);
    });
    test('rotates a 3×3 shape correctly', () => {
        const shape = [[1,2,3],[4,5,6],[7,8,9]];
        expect(rotateShape(shape)).toEqual([[7,4,1],[8,5,2],[9,6,3]]);
    });
    test('four rotations returns to original for square', () => {
        const shape = [[2,2],[2,2]];
        let s = shape;
        for (let i = 0; i < 4; i++) s = rotateShape(s);
        expect(s).toEqual(shape);
    });
    test('four rotations returns to original for L-piece', () => {
        const shape = SHAPES[7].slice(0, 2).map(r => [...r]);
        let s = SHAPES[7].map(r => [...r]);
        for (let i = 0; i < 4; i++) s = rotateShape(s);
        expect(s[0]).toEqual(SHAPES[7][0]);
    });
});

// ── collides ─────────────────────────────────────────────────────────────────
describe('collides', () => {
    let board;
    beforeEach(() => { board = newBoard(); });

    test('no collision on empty board in centre', () => {
        const p = { shape: [[1]], x: 5, y: 5 };
        expect(collides(board, p)).toBe(false);
    });
    test('left wall collision', () => {
        const p = { shape: [[1]], x: -1, y: 5 };
        expect(collides(board, p)).toBe(true);
    });
    test('right wall collision', () => {
        const p = { shape: [[1]], x: COLS, y: 5 };
        expect(collides(board, p)).toBe(true);
    });
    test('bottom floor collision', () => {
        const p = { shape: [[1]], x: 5, y: ROWS };
        expect(collides(board, p)).toBe(true);
    });
    test('collision with locked block', () => {
        board[5][5] = 1;
        const p = { shape: [[1]], x: 5, y: 5 };
        expect(collides(board, p)).toBe(true);
    });
    test('no collision with 0-cells in shape', () => {
        const p = { shape: [[0, 1]], x: -1, y: 5 };
        expect(collides(board, p)).toBe(false);
    });
    test('dx offset causes wall hit', () => {
        const p = { shape: [[1]], x: 0, y: 5 };
        expect(collides(board, p, -1)).toBe(true);
    });
    test('dy offset causes floor hit', () => {
        const p = { shape: [[1]], x: 5, y: ROWS - 1 };
        expect(collides(board, p, 0, 1)).toBe(true);
    });
    test('custom shape parameter used instead of p.shape', () => {
        const p = { shape: [[0]], x: 5, y: 5 };
        const alt = [[1]];
        board[5][5] = 1;
        expect(collides(board, p, 0, 0, alt)).toBe(true);
    });
    test('piece entirely above board (y < 0) does not collide', () => {
        const p = { shape: [[1]], x: 5, y: -1 };
        expect(collides(board, p)).toBe(false);
    });
});

// ── clearLines ───────────────────────────────────────────────────────────────
describe('clearLines', () => {
    let board;
    beforeEach(() => { board = newBoard(); });

    test('no full rows — board unchanged, score unchanged', () => {
        board[19][0] = 1;
        const r = clearLines(board, 100, 5, 1);
        expect(r.cleared).toBe(0);
        expect(r.score).toBe(100);
        expect(r.lines).toBe(5);
        expect(r.level).toBe(1);
    });
    test('clears one full row, updates score', () => {
        board[19] = new Array(COLS).fill(1);
        const r = clearLines(board, 0, 0, 1);
        expect(r.cleared).toBe(1);
        expect(r.score).toBe(100);
        expect(r.lines).toBe(1);
        expect(r.board[19]).toEqual(new Array(COLS).fill(0));
    });
    test('clears two full rows, score uses 300×level', () => {
        board[18] = new Array(COLS).fill(1);
        board[19] = new Array(COLS).fill(1);
        const r = clearLines(board, 0, 0, 2);
        expect(r.cleared).toBe(2);
        expect(r.score).toBe(600);
    });
    test('four rows cleared (tetris) gives 800×level', () => {
        for (let y = 16; y <= 19; y++) board[y] = new Array(COLS).fill(1);
        const r = clearLines(board, 0, 0, 1);
        expect(r.cleared).toBe(4);
        expect(r.score).toBe(800);
    });
    test('level increases every 10 lines', () => {
        board[19] = new Array(COLS).fill(1);
        const r = clearLines(board, 0, 9, 1);
        expect(r.level).toBe(2);
    });
    test('does not mutate original board', () => {
        const original = board[19].slice();
        board[19] = new Array(COLS).fill(1);
        clearLines(board, 0, 0, 1);
        expect(board[19]).toEqual(new Array(COLS).fill(1));
    });
    test('top row is filled with zeros after clear', () => {
        board[19] = new Array(COLS).fill(1);
        const r = clearLines(board, 0, 0, 1);
        expect(r.board[0]).toEqual(new Array(COLS).fill(0));
    });
});
