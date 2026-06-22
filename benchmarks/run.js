#!/usr/bin/env node
'use strict';
/**
 * Chess engine benchmark — JavaScript implementation.
 * Runs the shared JS engine against the standard position suite and reports
 * nodes/second for perft and AI move-selection timings.
 *
 * Usage:
 *   node benchmarks/run.js              # run all positions
 *   node benchmarks/run.js --json       # emit machine-readable JSON
 */

const { performance } = require('perf_hooks');
const path = require('path');
const positions = require('./positions.json');

// Load the shared JS chess engine (CommonJS-compatible export expected)
// The engine file uses 'use strict' and assigns to module.exports or globalThis.
const enginePath = path.resolve(__dirname, '../js/engines/chess-engine.js');
const G = {};
require('fs').readFileSync(enginePath, 'utf8')
    .replace(/^'use strict';?\n?/m, '')
    .split('\n')
    .join('\n');
// Evaluate engine in a local scope so we can grab exports
const vm = require('vm');
const ctx = vm.createContext(G);
vm.runInContext(require('fs').readFileSync(enginePath, 'utf8'), ctx);

// Engine API (js/engines/chess-engine.js):
//   G.newChessGame()            → game
//   G.getLegalMoves(game)       → moves[]
//   G.applyMove(game, mv)       → game
//   G.getChessAIMove(game)      → move | null

// Perft: count leaf nodes at given depth (validates move generation correctness)
function perft(game, depth) {
    if (depth === 0) return 1n;
    const moves = G.getLegalMoves(game);
    if (depth === 1) return BigInt(moves.length);
    let nodes = 0n;
    for (const m of moves) {
        nodes += perft(G.applyMove(game, m), depth - 1);
    }
    return nodes;
}

const results = [];
const isJson = process.argv.includes('--json');

if (!isJson) console.log('\nZyxxyz Chess Engine — JavaScript Benchmark\n' + '─'.repeat(55));

// The JS engine starts from the standard position only (no FEN loading).
// Only run startpos perft — the correctness gate for move generation.
const perftPositions = positions.filter(p => p.id === 'startpos');

for (const pos of perftPositions) {
    const game  = G.newChessGame();
    const t0    = performance.now();
    const nodes = perft(game, pos.depth);
    const ms    = performance.now() - t0;
    const nps   = Number(nodes) / (ms / 1000);
    const pass  = nodes === BigInt(pos.expected_nodes);

    results.push({
        id: pos.id, depth: pos.depth, nodes: Number(nodes),
        ms: Math.round(ms), nps: Math.round(nps),
        correct: pass, language: 'javascript',
    });

    if (!isJson) {
        const status = pass ? '✓' : '✗';
        console.log(`${status}  ${pos.description}`);
        console.log(`   nodes=${nodes}  time=${Math.round(ms)}ms  nps=${Math.round(nps).toLocaleString()}`);
        if (!pass) console.log(`   EXPECTED ${pos.expected_nodes}, GOT ${nodes}`);
    }
}

if (isJson) {
    console.log(JSON.stringify(results, null, 2));
} else {
    console.log('\n' + '─'.repeat(55));
    const perftRow = results.find(r => r.id === 'startpos');
    if (perftRow) {
        console.log(`Perft(4) NPS: ${perftRow.nps?.toLocaleString() ?? 'n/a'}`);
        console.log(`Correct:      ${perftRow.correct ? 'YES' : 'NO — move generation bug!'}`);
        if (!perftRow.correct) process.exit(1);
    }
}
