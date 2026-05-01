'use strict';
const {
    PUZZLE_MIN_PIECES, PUZZLE_MAX_PIECES,
    gridDims, newPuzzle, shufflePuzzle, placePiece, isPuzzleSolved, calcPuzzleScore,
    puzzlePaletteGradients
} = require('../js/puzzle-engine');

describe('gridDims', () => {
    test('returns cols and rows for 9', () => {
        const { cols, rows, count } = gridDims(9);
        expect(cols).toBeGreaterThan(0);
        expect(rows).toBeGreaterThan(0);
        expect(count).toBeGreaterThanOrEqual(9);
    });
    test('clamps below minimum', () => {
        const { count } = gridDims(1);
        expect(count).toBeGreaterThanOrEqual(PUZZLE_MIN_PIECES);
    });
    test('clamps above maximum', () => {
        const { count } = gridDims(9999);
        expect(count).toBeLessThanOrEqual(PUZZLE_MAX_PIECES + 20);
    });
    test('returns square-ish grid for 25', () => {
        const { cols, rows } = gridDims(25);
        expect(Math.abs(cols - rows)).toBeLessThanOrEqual(2);
    });
    test('count equals cols × rows', () => {
        const { cols, rows, count } = gridDims(36);
        expect(count).toBe(cols * rows);
    });
});

describe('newPuzzle', () => {
    test('creates correct piece count', () => {
        const p = newPuzzle(25);
        expect(p.count).toBe(p.pieces.length);
    });
    test('all pieces have correctCol and correctRow', () => {
        const p = newPuzzle(16);
        for (const piece of p.pieces) {
            expect(piece.correctCol).toBeGreaterThanOrEqual(0);
            expect(piece.correctRow).toBeGreaterThanOrEqual(0);
        }
    });
    test('all pieces start unplaced', () => {
        const p = newPuzzle(16);
        expect(p.pieces.every(pc => !pc.placed)).toBe(true);
    });
    test('solved is false initially', () => {
        expect(newPuzzle(9).solved).toBe(false);
    });
    test('unique ids', () => {
        const p    = newPuzzle(20);
        const ids  = p.pieces.map(pc => pc.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('shufflePuzzle', () => {
    test('preserves piece count', () => {
        const p  = newPuzzle(25);
        const sp = shufflePuzzle(p);
        expect(sp.pieces.length).toBe(p.pieces.length);
    });
    test('sets startTime', () => {
        const sp = shufflePuzzle(newPuzzle(25));
        expect(typeof sp.startTime).toBe('number');
    });
    test('pieces are not all in correct position (almost always)', () => {
        const p  = newPuzzle(25);
        const sp = shufflePuzzle(p);
        const allCorrect = sp.pieces.every(pc => pc.col===pc.correctCol && pc.row===pc.correctRow);
        expect(allCorrect).toBe(false);
    });
    test('does not mutate original puzzle', () => {
        const p = newPuzzle(25);
        const origPos = p.pieces.map(pc => ({ col: pc.col, row: pc.row }));
        shufflePuzzle(p);
        const stillSame = p.pieces.every((pc,i) => pc.col===origPos[i].col && pc.row===origPos[i].row);
        expect(stillSame).toBe(true);
    });
});

describe('placePiece', () => {
    test('marks piece as placed when position is correct', () => {
        const p  = shufflePuzzle(newPuzzle(16));
        const pc = p.pieces[0];
        const p2 = placePiece(p, pc.id, pc.correctCol, pc.correctRow);
        const updated = p2.pieces.find(x => x.id === pc.id);
        expect(updated.placed).toBe(true);
    });
    test('does not mark placed when position is wrong', () => {
        const p  = shufflePuzzle(newPuzzle(16));
        const pc = p.pieces[0];
        const wrongCol = (pc.correctCol + 1) % p.cols;
        const p2 = placePiece(p, pc.id, wrongCol, pc.correctRow);
        const updated = p2.pieces.find(x => x.id === pc.id);
        expect(updated.placed).toBe(false);
    });
    test('detects solved when all placed', () => {
        let p = newPuzzle(9);
        for (const pc of p.pieces) {
            p = placePiece(p, pc.id, pc.correctCol, pc.correctRow);
        }
        expect(p.solved).toBe(true);
    });
});

describe('isPuzzleSolved', () => {
    test('false for new puzzle', () => expect(isPuzzleSolved(newPuzzle(9))).toBe(false));
    test('true when all pieces placed', () => {
        let p = newPuzzle(9);
        p = { ...p, pieces: p.pieces.map(pc => ({ ...pc, placed: true })) };
        expect(isPuzzleSolved(p)).toBe(true);
    });
});

describe('calcPuzzleScore', () => {
    test('higher pieces = higher score given same time', () => {
        expect(calcPuzzleScore(100, 60)).toBeGreaterThan(calcPuzzleScore(25, 60));
    });
    test('shorter time = higher score given same pieces', () => {
        expect(calcPuzzleScore(25, 30)).toBeGreaterThan(calcPuzzleScore(25, 120));
    });
    test('zero seconds does not cause division by zero', () => {
        expect(() => calcPuzzleScore(25, 0)).not.toThrow();
        expect(calcPuzzleScore(25, 0)).toBeGreaterThan(0);
    });
    test('returns integer', () => {
        const s = calcPuzzleScore(36, 45);
        expect(Number.isInteger(s)).toBe(true);
    });
});

describe('puzzlePaletteGradients', () => {
    test('returns an array', () => expect(Array.isArray(puzzlePaletteGradients())).toBe(true));
    test('has at least 2 entries', () => expect(puzzlePaletteGradients().length).toBeGreaterThanOrEqual(2));
});
