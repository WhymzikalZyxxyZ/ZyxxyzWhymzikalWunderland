'use strict';

const PUZZLE_MIN_PIECES = 9;
const PUZZLE_MAX_PIECES = 420;

function gridDims(count) {
    const clamped = Math.max(PUZZLE_MIN_PIECES, Math.min(PUZZLE_MAX_PIECES, count));
    let bestCols = 3, bestRows = 3, bestDiff = Infinity;
    for (let c = 1; c <= Math.ceil(Math.sqrt(clamped)) + 1; c++) {
        const r = Math.round(clamped / c);
        if (r < 1) continue;
        const diff = Math.abs(c * r - clamped) + Math.abs(c - r);
        if (diff < bestDiff) { bestDiff = diff; bestCols = c; bestRows = r; }
    }
    return { cols: bestCols, rows: bestRows, count: bestCols * bestRows };
}

function generateConnectors(cols, rows) {
    const h = [], v = [];
    for (let r = 0; r < rows - 1; r++) {
        h[r] = [];
        for (let c = 0; c < cols; c++)
            h[r][c] = Math.random() < 0.5 ? 1 : -1;
    }
    for (let r = 0; r < rows; r++) {
        v[r] = [];
        for (let c = 0; c < cols - 1; c++)
            v[r][c] = Math.random() < 0.5 ? 1 : -1;
    }
    return { h, v };
}

function newPuzzle(requestedPieces) {
    const { cols, rows, count } = gridDims(requestedPieces);
    const { h, v } = generateConnectors(cols, rows);
    const pieces = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            pieces.push({
                id: r * cols + c,
                correctCol: c, correctRow: r,
                col: c, row: r, placed: false,
                // +1 = tab protrudes outward, -1 = blank indents inward, 0 = straight (border)
                top:    r === 0        ? 0 : -h[r-1][c],
                bottom: r === rows - 1 ? 0 :  h[r][c],
                left:   c === 0        ? 0 : -v[r][c-1],
                right:  c === cols - 1 ? 0 :  v[r][c],
            });
        }
    }
    return { cols, rows, count, pieces, solved: false, startTime: null, elapsed: 0 };
}

function shufflePuzzle(puzzle) {
    const positions = puzzle.pieces.map(p => ({ col: p.correctCol, row: p.correctRow }));
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const pieces = puzzle.pieces.map((p, i) => ({
        ...p, col: positions[i].col, row: positions[i].row, placed: false
    }));
    const alreadySolved = pieces.every(p => p.col === p.correctCol && p.row === p.correctRow);
    return { ...puzzle, pieces: alreadySolved ? shufflePuzzle({ ...puzzle, pieces }).pieces : pieces,
             solved: false, startTime: Date.now(), elapsed: 0 };
}

function placePiece(puzzle, pieceId, col, row) {
    const pieces = puzzle.pieces.map(p => {
        if (p.id !== pieceId) return p;
        const placed = p.correctCol === col && p.correctRow === row;
        return { ...p, col, row, placed };
    });
    const solved = pieces.every(p => p.placed);
    const elapsed = solved ? (Date.now() - (puzzle.startTime || Date.now())) / 1000 : puzzle.elapsed;
    return { ...puzzle, pieces, solved, elapsed };
}

function isPuzzleSolved(puzzle) {
    return puzzle.pieces.every(p => p.placed);
}

function calcPuzzleScore(pieces, elapsedSeconds) {
    const t = Math.max(1, elapsedSeconds);
    return Math.round((pieces * 1000) / t);
}

function puzzlePaletteGradients() {
    return [
        { type: 'linear', stops: ['#1a0050','#3d006e','#6b00b3','#9b00e0'] },
        { type: 'linear', stops: ['#002366','#0044cc','#3399ff','#99ccff'] },
        { type: 'linear', stops: ['#550000','#990000','#cc2200','#ff6655'] },
        { type: 'linear', stops: ['#1a0050','#550066','#aa0099','#dd44dd'] },
    ];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PUZZLE_MIN_PIECES, PUZZLE_MAX_PIECES,
        gridDims, generateConnectors, newPuzzle, shufflePuzzle,
        placePiece, isPuzzleSolved, calcPuzzleScore, puzzlePaletteGradients
    };
}
