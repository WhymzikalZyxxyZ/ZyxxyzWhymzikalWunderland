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

// Engine API surface expected:
//   G.newChessGame()            → game
//   G.chessLegalMoves(game)     → moves[]
//   G.chessApplyMove(game, mv)  → game
//   G.chessGetAiMove(game, d)   → move | null
//
// Perft: count leaf nodes at given depth (validates move generation correctness)
function perft(game, depth) {
    if (depth === 0) return 1n;
    const moves = G.chessLegalMoves ? G.chessLegalMoves(game) : game.legalMoves;
    if (depth === 1) return BigInt(moves.length);
    let nodes = 0n;
    for (const m of moves) {
        const next = G.chessApplyMove ? G.chessApplyMove(game, m) : G.applyMove(game, m);
        nodes += perft(next, depth - 1);
    }
    return nodes;
}

const results = [];
const isJson = process.argv.includes('--json');

if (!isJson) console.log('\nZyxxyz Chess Engine — JavaScript Benchmark\n' + '─'.repeat(55));

for (const pos of positions) {
    // Build game from FEN-like starting position (engine only supports start pos natively)
    // For non-startpos positions skip perft, run AI timing instead
    const game = G.newChessGame ? G.newChessGame() : G.chessNewGame();

    if (pos.id === 'startpos') {
        const t0    = performance.now();
        const nodes = perft(game, pos.depth);
        const ms    = performance.now() - t0;
        const nps   = Number(nodes) / (ms / 1000);
        const pass  = pos.expected_nodes === null || nodes === BigInt(pos.expected_nodes);

        const row = {
            id: pos.id, depth: pos.depth, nodes: Number(nodes),
            ms: Math.round(ms), nps: Math.round(nps),
            correct: pass, language: 'javascript',
        };
        results.push(row);
        if (!isJson) {
            const status = pass ? '✓' : '✗';
            console.log(`${status}  ${pos.description}`);
            console.log(`   nodes=${nodes}  time=${Math.round(ms)}ms  nps=${Math.round(nps).toLocaleString()}`);
            if (!pass) console.log(`   EXPECTED ${pos.expected_nodes}, GOT ${nodes}`);
        }
    } else {
        // AI move timing
        const t0   = performance.now();
        const move = G.chessGetAiMove ? G.chessGetAiMove(game, pos.depth)
                   : G.getAiMove     ? G.getAiMove(game)
                   : null;
        const ms   = performance.now() - t0;
        const row  = { id: pos.id, depth: pos.depth, ms: Math.round(ms), language: 'javascript' };
        results.push(row);
        if (!isJson) {
            const mv = move ? `${move.r},${move.c}→${move.tr},${move.tc}` : '(none)';
            console.log(`   ${pos.description}: ${Math.round(ms)}ms  move=${mv}`);
        }
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
