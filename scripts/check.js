'use strict';

// Runs every lint + test check that CI requires, in the same order.
// Usage:  npm run check
// Exit code mirrors the first failing step.

const { execSync } = require('child_process');
const path         = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(label, cmd, cwd = ROOT) {
    console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 60 - label.length))}`);
    execSync(cmd, { cwd, stdio: 'inherit' });
}

try {
    // ── Root: lint ────────────────────────────────────────────────────────────
    run('Lint JS',   'npm run lint:js');
    run('Lint CSS',  'npm run lint:css');
    run('Lint HTML', 'npm run lint:html');

    // ── Root: Jest ────────────────────────────────────────────────────────────
    run('Test (root Jest)', 'npm test');

    // ── Anonymail worker: vitest ──────────────────────────────────────────────
    run('Test anonymail/worker', 'npx vitest run', path.join(ROOT, 'anonymail/worker'));

    // ── The Locator worker: vitest ────────────────────────────────────────────
    run('Test the-locator/worker', 'npx vitest run', path.join(ROOT, 'the-locator/worker'));

    // ── The Locator client: tsc + vitest ──────────────────────────────────────
    run('Lint the-locator/client (tsc)', 'npx tsc --noEmit',  path.join(ROOT, 'the-locator/client'));
    run('Test the-locator/client',       'npx vitest run',    path.join(ROOT, 'the-locator/client'));

    console.log('\n✓ All checks passed.\n');
} catch {
    console.error('\n✗ Check failed — see output above.\n');
    process.exit(1);
}
