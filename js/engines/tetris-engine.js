const COLS = 10, ROWS = 20, BLOCK = 30;
const MAX_SCORE = 9999999;

const COLORS = [
    null,
    '#00f0f0', '#f0f000', '#a000f0', '#00f000',
    '#f00000', '#0000f0', '#f0a000',
];

const SHAPES = [
    null,
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[2,2],[2,2]],
    [[0,3,0],[3,3,3],[0,0,0]],
    [[0,4,4],[4,4,0],[0,0,0]],
    [[5,5,0],[0,5,5],[0,0,0]],
    [[6,0,0],[6,6,6],[0,0,0]],
    [[0,0,7],[7,7,7],[0,0,0]],
];

function newBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function newPiece() {
    const id = Math.ceil(Math.random() * 7);
    const shape = SHAPES[id].map(r => [...r]);
    return { id, shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
}

function collides(board, p, dx, dy, shape) {
    if (dx    === undefined) dx    = 0;
    if (dy    === undefined) dy    = 0;
    if (shape === undefined) shape = p.shape;
    return shape.some((row, y) =>
        row.some((v, x) => {
            if (!v) return false;
            const nx = p.x + x + dx;
            const ny = p.y + y + dy;
            return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx]);
        })
    );
}

function rotateShape(shape) {
    return shape[0].map((_, i) => shape.map(r => r[i]).reverse());
}

function clearLines(board, score, lines, level) {
    let cleared = 0;
    const b = board.map(r => r.slice());
    for (let y = ROWS - 1; y >= 0; y--) {
        if (b[y].every(v => v)) {
            b.splice(y, 1);
            b.unshift(new Array(COLS).fill(0));
            cleared++;
            y++;
        }
    }
    const pts = [0, 100, 300, 500, 800];
    const newScore  = score + pts[Math.min(cleared, 4)] * level;
    const newLines  = lines + cleared;
    const newLevel  = Math.floor(newLines / 10) + 1;
    return { board: b, score: newScore, lines: newLines, level: newLevel, cleared };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { COLS, ROWS, BLOCK, COLORS, SHAPES, MAX_SCORE, newBoard, newPiece, collides, rotateShape, clearLines };
}
