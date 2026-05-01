const S_COLS = 20, S_ROWS = 20, S_CELL = 20;
const SNAKE_MAX_SCORE = 10000;

function snakePlaceFood(board) {
    let pos;
    do {
        pos = { x: Math.floor(Math.random() * S_COLS), y: Math.floor(Math.random() * S_ROWS) };
    } while (board.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
}

function snakeTick(board, dir, nextDir, foodPos, score, tickMs) {
    const head = { x: board[0].x + nextDir.x, y: board[0].y + nextDir.y };

    if (head.x < 0 || head.x >= S_COLS || head.y < 0 || head.y >= S_ROWS) {
        return { gameOver: true };
    }
    if (board.some(s => s.x === head.x && s.y === head.y)) {
        return { gameOver: true };
    }

    const newBoard = [head, ...board];
    let newScore  = score;
    let newTickMs = tickMs;
    let newFood   = foodPos;
    let ate       = false;

    if (head.x === foodPos.x && head.y === foodPos.y) {
        ate       = true;
        newScore  = score + 10;
        newTickMs = Math.max(60, tickMs - 5);
        newFood   = snakePlaceFood(newBoard);
    } else {
        newBoard.pop();
    }

    return { gameOver: false, board: newBoard, dir: nextDir, foodPos: newFood, score: newScore, tickMs: newTickMs, ate };
}

function snakeChangeDirection(dir, nextDir, key) {
    switch (key) {
        case 'ArrowUp':    return dir.y !== 1  ? { x: 0,  y: -1 } : nextDir;
        case 'ArrowDown':  return dir.y !== -1 ? { x: 0,  y:  1 } : nextDir;
        case 'ArrowLeft':  return dir.x !== 1  ? { x: -1, y:  0 } : nextDir;
        case 'ArrowRight': return dir.x !== -1 ? { x:  1, y:  0 } : nextDir;
        default:           return nextDir;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { S_COLS, S_ROWS, S_CELL, SNAKE_MAX_SCORE, snakePlaceFood, snakeTick, snakeChangeDirection };
}
