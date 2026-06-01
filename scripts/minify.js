'use strict';

const { execSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, ext, results = []) {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry === '.git') continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
            walk(full, ext, results);
        } else if (full.endsWith(ext) && !full.endsWith('.min' + ext)) {
            results.push(full);
        }
    }
    return results;
}

let ok = 0, fail = 0;

const jsDirs = [
    path.join(ROOT, 'js'),
    path.join(ROOT, 'anonymail', 'worker', 'public', 'js'),
];
for (const dir of jsDirs) {
    for (const f of walk(dir, '.js')) {
        try {
            execSync(`npx terser "${f}" --compress --mangle -o "${f}"`, { stdio: 'pipe' });
            ok++;
        } catch {
            console.warn('terser skip:', path.relative(ROOT, f));
            fail++;
        }
    }
}

const cssDirs = [
    path.join(ROOT, 'css'),
    path.join(ROOT, 'anonymail', 'worker', 'public', 'css'),
];
for (const dir of cssDirs) {
    for (const f of walk(dir, '.css')) {
        try {
            execSync(`npx cleancss "${f}" -o "${f}"`, { stdio: 'pipe' });
            ok++;
        } catch {
            console.warn('cleancss skip:', path.relative(ROOT, f));
            fail++;
        }
    }
}

console.log(`Minified ${ok} file(s)${fail ? `, skipped ${fail}` : ''}.`);
