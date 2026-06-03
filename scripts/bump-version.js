'use strict';

const { execSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const PKG = path.resolve(__dirname, '..', 'package.json');

// Read current branch name
let branch;
try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
} catch {
    console.error('Error: could not determine current git branch.');
    process.exit(1);
}

// Expect branch name like version/2.10.19
const match = branch.match(/^version\/(\d+\.\d+\.\d+)$/);
if (!match) {
    console.error(`Branch "${branch}" does not match version/X.Y.Z — nothing to bump.`);
    process.exit(1);
}

const newVersion = match[1];

// Update package.json
const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
const oldVersion = pkg.version;

if (oldVersion === newVersion) {
    console.log(`Version is already ${newVersion} — no change needed.`);
    process.exit(0);
}

pkg.version = newVersion;
writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Bumped version: ${oldVersion} → ${newVersion}`);

// Commit the change
try {
    execSync('git add package.json', { stdio: 'pipe' });
    execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });
} catch {
    console.error('Could not commit — package.json updated but not committed.');
    process.exit(1);
}
