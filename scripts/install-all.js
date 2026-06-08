'use strict';

// Installs dependencies for every sub-project that has its own package.json.
// Usage:  npm run install:all
// Run this once after cloning, then again whenever a sub-project adds a new dep.

const { execSync } = require('child_process');
const path         = require('path');

const ROOT = path.resolve(__dirname, '..');

const SUB_PROJECTS = [
    'anonymail/worker',
    'the-locator',
    'the-locator/worker',
    'the-locator/client',
];

for (const sub of SUB_PROJECTS) {
    const cwd = path.join(ROOT, sub);
    console.log(`\n── npm install  ${sub} ${'─'.repeat(Math.max(0, 50 - sub.length))}`);
    execSync('npm install', { cwd, stdio: 'inherit' });
}

console.log('\n✓ All sub-project dependencies installed.\n');
