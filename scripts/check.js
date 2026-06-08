'use strict';

// Runs every lint + test check that CI requires, in the same order.
// Usage:  npm run check
// Exit code mirrors the first failing step.
//
// Optional tools (skipped gracefully if not installed):
//   golangci-lint  — https://golangci-lint.run/usage/install/
//   ktlint         — https://github.com/pinterest/ktlint/releases

const { execSync, spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function run(label, cmd, cwd = ROOT) {
    console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 60 - label.length))}`);
    execSync(cmd, { cwd, stdio: 'inherit' });
}

function tryRun(label, cmd, cwd = ROOT) {
    console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 60 - label.length))}`);
    const tool = cmd.split(' ')[0];
    const probe = spawnSync(tool, ['--version'], { cwd, shell: true, encoding: 'utf8' });
    const notFound = probe.error || probe.status === null ||
        (probe.stderr || '').toLowerCase().includes('not recognized') ||
        (probe.stderr || '').toLowerCase().includes('not found') ||
        (probe.stdout || '').toLowerCase().includes('not recognized');
    if (notFound) {
        console.log(`  (skipped — ${tool} not found; install it to run this check locally)`);
        return;
    }
    execSync(cmd, { cwd, stdio: 'inherit' });
}

try {
    // ── Root: lint ────────────────────────────────────────────────────────────
    run('Lint JS', 'npm run lint:js');
    run('Lint CSS', 'npm run lint:css');
    run('Lint HTML', 'npm run lint:html');

    // ── Root: Jest ────────────────────────────────────────────────────────────
    run('Test (root Jest)', 'npm test');

    // ── Anonymail worker: vitest ──────────────────────────────────────────────
    run('Test anonymail/worker', 'npx vitest run', path.join(ROOT, 'anonymail/worker'));

    // ── The Locator worker: vitest ────────────────────────────────────────────
    run('Test the-locator/worker', 'npx vitest run', path.join(ROOT, 'the-locator/worker'));

    // ── The Locator client: tsc + vitest ──────────────────────────────────────
    run('Lint the-locator/client (tsc)', 'npx tsc --noEmit', path.join(ROOT, 'the-locator/client'));
    run('Test the-locator/client', 'npx vitest run', path.join(ROOT, 'the-locator/client'));

    // ── Go: golangci-lint (requires golangci-lint installed) ──────────────────
    tryRun('Lint Go (editor-service)', 'golangci-lint run ./...', path.join(ROOT, 'editor-service'));

    // ── Kotlin: ktlint (requires ktlint installed) ────────────────────────────
    tryRun('Lint Kotlin', 'ktlint --relative "kotlin/**/*.kt"', ROOT);

    console.log('\n✓ All checks passed.\n');
} catch {
    console.error('\n✗ Check failed — see output above.\n');
    process.exit(1);
}
