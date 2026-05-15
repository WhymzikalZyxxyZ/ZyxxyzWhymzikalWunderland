'use strict';

// ── Direction constants (mirrored from daedalus.html) ────────────────────────
const N = 1, S = 2, E = 4, W = 8;
const OPP  = { [N]: S, [S]: N, [E]: W, [W]: E };
const DR   = { [N]: -1, [S]: 1, [E]: 0,  [W]: 0  };
const DC   = { [N]: 0,  [S]: 0, [E]: 1,  [W]: -1 };
const DIRS = [N, S, E, W];

// ── Level configs (mirrored from daedalus.html) ──────────────────────────────
const LEVELS = [
    { rows:  9, cols:  9, fog: 0, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 11, cols: 11, fog: 0, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 13, cols: 13, fog: 0, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 15, cols: 15, fog: 0, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 17, cols: 17, fog: 0, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 19, cols: 19, fog: 5, nEnemies: 0, speed: 0,   braid: 0    },
    { rows: 21, cols: 21, fog: 5, nEnemies: 1, speed: 650, braid: 0.55 },
    { rows: 23, cols: 23, fog: 4, nEnemies: 2, speed: 540, braid: 0.65 },
    { rows: 25, cols: 25, fog: 4, nEnemies: 3, speed: 470, braid: 0.75 },
    { rows: 29, cols: 29, fog: 3, nEnemies: 4, speed: 410, braid: 0.85 },
];

// ── Maze generation (iterative DFS) ─────────────────────────────────────────
function generateMaze(rows, cols) {
    const grid = Array.from({length: rows}, () => new Array(cols).fill(N | S | E | W));
    const vis  = Array.from({length: rows}, () => new Array(cols).fill(false));
    const stk  = [[0, 0]];
    vis[0][0]  = true;
    while (stk.length) {
        const [r, c] = stk[stk.length - 1];
        const nbrs   = DIRS.filter(d => {
            const nr = r + DR[d], nc = c + DC[d];
            return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !vis[nr][nc];
        });
        if (!nbrs.length) { stk.pop(); continue; }
        const d  = nbrs[Math.floor(Math.random() * nbrs.length)];
        const nr = r + DR[d], nc = c + DC[d];
        grid[r][c]   &= ~d;
        grid[nr][nc] &= ~OPP[d];
        vis[nr][nc]   = true;
        stk.push([nr, nc]);
    }
    return grid;
}

// ── Maze braiding (mirrored from daedalus.html) ──────────────────────────────
function braidMaze(grid, rows, cols, factor) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const passages = DIRS.filter(d => !(grid[r][c] & d));
            if (passages.length !== 1) continue;
            if (Math.random() > factor) continue;
            const walls = DIRS.filter(d => {
                if (!(grid[r][c] & d)) return false;
                const nr = r + DR[d], nc = c + DC[d];
                return nr >= 0 && nr < rows && nc >= 0 && nc < cols;
            });
            if (!walls.length) continue;
            const deadEndWalls = walls.filter(d => {
                const nr = r + DR[d], nc = c + DC[d];
                return DIRS.filter(dd => !(grid[nr][nc] & dd)).length === 1;
            });
            const candidates = deadEndWalls.length ? deadEndWalls : walls;
            const d  = candidates[Math.floor(Math.random() * candidates.length)];
            const nr = r + DR[d], nc = c + DC[d];
            grid[r][c]   &= ~d;
            grid[nr][nc] &= ~OPP[d];
        }
    }
}

// ── BFS: shortest path length from (0,0) to (exitR,exitC), or -1 ────────────
function shortestPath(grid, rows, cols, exitR, exitC) {
    const dist = Array.from({length: rows}, () => new Array(cols).fill(-1));
    dist[0][0] = 0;
    const q = [[0, 0]];
    while (q.length) {
        const [r, c] = q.shift();
        if (r === exitR && c === exitC) return dist[r][c];
        for (const d of DIRS) {
            if (grid[r][c] & d) continue; // wall
            const nr = r + DR[d], nc = c + DC[d];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (dist[nr][nc] !== -1) continue;
            dist[nr][nc] = dist[r][c] + 1;
            q.push([nr, nc]);
        }
    }
    return -1; // unreachable
}

// ── Tests ────────────────────────────────────────────────────────────────────
const SAMPLES = 50;

describe('Daedalus maze — solvability across all levels', () => {
    LEVELS.forEach((cfg, idx) => {
        const label = `Level ${idx + 1} (${cfg.rows}x${cfg.cols}, braid=${cfg.braid})`;

        test(`${label} — all ${SAMPLES} generated mazes are solvable`, () => {
            const exitR = cfg.rows - 1, exitC = cfg.cols - 1;
            for (let i = 0; i < SAMPLES; i++) {
                const grid = generateMaze(cfg.rows, cfg.cols);
                if (cfg.braid > 0) braidMaze(grid, cfg.rows, cfg.cols, cfg.braid);
                const dist = shortestPath(grid, cfg.rows, cfg.cols, exitR, exitC);
                expect(dist).toBeGreaterThan(0);
            }
        });

        test(`${label} — shortest path is at least ${cfg.rows + cfg.cols - 2} moves`, () => {
            const exitR = cfg.rows - 1, exitC = cfg.cols - 1;
            const minPossible = cfg.rows + cfg.cols - 2; // Manhattan distance lower bound
            for (let i = 0; i < SAMPLES; i++) {
                const grid = generateMaze(cfg.rows, cfg.cols);
                if (cfg.braid > 0) braidMaze(grid, cfg.rows, cfg.cols, cfg.braid);
                const dist = shortestPath(grid, cfg.rows, cfg.cols, exitR, exitC);
                expect(dist).toBeGreaterThanOrEqual(minPossible);
            }
        });
    });
});
