'use strict';
const { S_COLS, S_ROWS, SNAKE_MAX_SCORE, snakePlaceFood, snakeTick, snakeChangeDirection } = require('../js/snake-engine');

// ── Constants ────────────────────────────────────────────────────────────────
test('S_COLS is 20', () => expect(S_COLS).toBe(20));
test('S_ROWS is 20', () => expect(S_ROWS).toBe(20));
test('SNAKE_MAX_SCORE is 10000', () => expect(SNAKE_MAX_SCORE).toBe(10000));

// ── snakePlaceFood ───────────────────────────────────────────────────────────
describe('snakePlaceFood', () => {
    test('returns a position within bounds', () => {
        const pos = snakePlaceFood([]);
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(S_COLS);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThan(S_ROWS);
    });
    test('never places food on the snake', () => {
        const board = [];
        for (let x = 0; x < S_COLS; x++)
            for (let y = 0; y < S_ROWS; y++)
                if (!(x === 0 && y === 0)) board.push({ x, y });
        const pos = snakePlaceFood(board);
        expect(pos).toEqual({ x: 0, y: 0 });
    });
    test('returns an object with x and y', () => {
        const pos = snakePlaceFood([{ x: 5, y: 5 }]);
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
    });
});

// ── snakeTick ────────────────────────────────────────────────────────────────
describe('snakeTick', () => {
    const RIGHT = { x: 1, y: 0 };
    const food  = { x: 15, y: 10 };

    function makeBoard() {
        return [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];
    }

    test('moves snake one step in direction', () => {
        const r = snakeTick(makeBoard(), RIGHT, RIGHT, food, 0, 150);
        expect(r.gameOver).toBe(false);
        expect(r.board[0]).toEqual({ x: 6, y: 5 });
    });
    test('tail is removed when no food eaten', () => {
        const r = snakeTick(makeBoard(), RIGHT, RIGHT, food, 0, 150);
        expect(r.board.length).toBe(3);
    });
    test('left wall collision ends game', () => {
        const board = [{ x: 0, y: 5 }, { x: 1, y: 5 }];
        const r = snakeTick(board, { x: -1, y: 0 }, { x: -1, y: 0 }, food, 0, 150);
        expect(r.gameOver).toBe(true);
    });
    test('right wall collision ends game', () => {
        const board = [{ x: S_COLS - 1, y: 5 }, { x: S_COLS - 2, y: 5 }];
        const r = snakeTick(board, RIGHT, RIGHT, food, 0, 150);
        expect(r.gameOver).toBe(true);
    });
    test('top wall collision ends game', () => {
        const board = [{ x: 5, y: 0 }, { x: 5, y: 1 }];
        const up = { x: 0, y: -1 };
        const r = snakeTick(board, up, up, food, 0, 150);
        expect(r.gameOver).toBe(true);
    });
    test('bottom wall collision ends game', () => {
        const board = [{ x: 5, y: S_ROWS - 1 }, { x: 5, y: S_ROWS - 2 }];
        const down = { x: 0, y: 1 };
        const r = snakeTick(board, down, down, food, 0, 150);
        expect(r.gameOver).toBe(true);
    });
    test('self collision ends game', () => {
        const board = [
            { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }
        ];
        const up = { x: 0, y: -1 };
        const r = snakeTick(board, up, up, { x: 15, y: 15 }, 0, 150);
        expect(r.gameOver).toBe(true);
    });
    test('eating food increases score by 10', () => {
        const board = [{ x: 4, y: 10 }, { x: 3, y: 10 }];
        const r = snakeTick(board, RIGHT, RIGHT, { x: 5, y: 10 }, 0, 150);
        expect(r.ate).toBe(true);
        expect(r.score).toBe(10);
    });
    test('eating food grows snake', () => {
        const board = [{ x: 4, y: 10 }, { x: 3, y: 10 }];
        const r = snakeTick(board, RIGHT, RIGHT, { x: 5, y: 10 }, 0, 150);
        expect(r.board.length).toBe(3);
    });
    test('eating food decreases tick speed', () => {
        const board = [{ x: 4, y: 10 }, { x: 3, y: 10 }];
        const r = snakeTick(board, RIGHT, RIGHT, { x: 5, y: 10 }, 0, 150);
        expect(r.tickMs).toBe(145);
    });
    test('tick speed does not go below 60', () => {
        const board = [{ x: 4, y: 10 }, { x: 3, y: 10 }];
        const r = snakeTick(board, RIGHT, RIGHT, { x: 5, y: 10 }, 0, 60);
        expect(r.tickMs).toBe(60);
    });
    test('uses nextDir not dir', () => {
        const board = makeBoard();
        const down = { x: 0, y: 1 };
        const r = snakeTick(board, RIGHT, down, food, 0, 150);
        expect(r.board[0]).toEqual({ x: 5, y: 6 });
    });
});

// ── snakeChangeDirection ─────────────────────────────────────────────────────
describe('snakeChangeDirection', () => {
    const RIGHT = { x: 1, y: 0 };
    const LEFT  = { x: -1, y: 0 };
    const UP    = { x: 0, y: -1 };
    const DOWN  = { x: 0, y: 1 };

    test('ArrowUp accepted when not moving down', () => {
        expect(snakeChangeDirection(RIGHT, RIGHT, 'ArrowUp')).toEqual(UP);
    });
    test('ArrowUp blocked when moving down', () => {
        expect(snakeChangeDirection(DOWN, DOWN, 'ArrowUp')).toEqual(DOWN);
    });
    test('ArrowDown accepted when not moving up', () => {
        expect(snakeChangeDirection(RIGHT, RIGHT, 'ArrowDown')).toEqual(DOWN);
    });
    test('ArrowDown blocked when moving up', () => {
        expect(snakeChangeDirection(UP, UP, 'ArrowDown')).toEqual(UP);
    });
    test('ArrowLeft accepted when not moving right', () => {
        expect(snakeChangeDirection(UP, UP, 'ArrowLeft')).toEqual(LEFT);
    });
    test('ArrowLeft blocked when moving right', () => {
        expect(snakeChangeDirection(RIGHT, RIGHT, 'ArrowLeft')).toEqual(RIGHT);
    });
    test('ArrowRight accepted when not moving left', () => {
        expect(snakeChangeDirection(UP, UP, 'ArrowRight')).toEqual(RIGHT);
    });
    test('ArrowRight blocked when moving left', () => {
        expect(snakeChangeDirection(LEFT, LEFT, 'ArrowRight')).toEqual(LEFT);
    });
    test('unknown key returns nextDir unchanged', () => {
        expect(snakeChangeDirection(RIGHT, UP, 'KeyA')).toEqual(UP);
    });
});
