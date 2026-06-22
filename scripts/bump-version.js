'use strict';
/**
 * Version bump + changelog generator.
 *
 * Reads the current branch name (must be version/X.Y.Z), updates package.json
 * and the VERSION file, then generates a CHANGELOG.md entry from all conventional
 * commits since the last git tag.
 *
 * Conventional commit prefixes:
 *   feat:     → minor bump signal (noted in changelog)
 *   fix:      → patch bump signal
 *   perf:     → patch bump signal
 *   feat!:    → major bump signal
 *   chore: docs: test: ci: refactor: style: → no-bump (still logged)
 *
 * Usage:
 *   node scripts/bump-version.js
 */

const { execSync }                      = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const path                              = require('path');

const ROOT = path.resolve(__dirname, '..');
const PKG  = path.join(ROOT, 'package.json');
const VER  = path.join(ROOT, 'VERSION');
const CL   = path.join(ROOT, 'CHANGELOG.md');

// ── Read branch ───────────────────────────────────────────────────────────────
let branch;
try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { stdio: 'pipe' }).toString().trim();
} catch {
    console.error('Error: could not determine current git branch.');
    process.exit(1);
}

const match = branch.match(/^version\/(\d+\.\d+\.\d+)$/);
if (!match) {
    console.error(`Branch "${branch}" does not match version/X.Y.Z — nothing to bump.`);
    process.exit(1);
}
const newVersion = match[1];

// ── Update package.json ───────────────────────────────────────────────────────
const pkg        = JSON.parse(readFileSync(PKG, 'utf8'));
const oldVersion = pkg.version;
if (oldVersion !== newVersion) {
    pkg.version = newVersion;
    writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`package.json: ${oldVersion} → ${newVersion}`);
}

// ── Update VERSION file ───────────────────────────────────────────────────────
writeFileSync(VER, newVersion + '\n', 'utf8');
console.log(`VERSION: ${newVersion}`);

// ── Collect commits since last tag ────────────────────────────────────────────
let since = '';
try {
    since = execSync('git describe --tags --abbrev=0 2>/dev/null', { stdio: 'pipe' })
        .toString().trim();
} catch { /* no tags yet — use all commits */ }

const range    = since ? `${since}..HEAD` : 'HEAD';
const logLines = execSync(
    `git log ${range} --pretty=format:"%s" --no-merges`,
    { stdio: 'pipe' }
).toString().trim().split('\n').filter(Boolean);

// ── Categorise commits ────────────────────────────────────────────────────────
const CATEGORIES = [
    { key: 'breaking', label: 'Breaking Changes',  re: /^(feat|fix)!:|BREAKING CHANGE/i },
    { key: 'feat',     label: 'New Features',       re: /^feat(\(.+?\))?:/i              },
    { key: 'fix',      label: 'Bug Fixes',           re: /^fix(\(.+?\))?:/i               },
    { key: 'perf',     label: 'Performance',         re: /^perf(\(.+?\))?:/i              },
    { key: 'ci',       label: 'CI / Build',          re: /^(ci|build)(\(.+?\))?:/i        },
    { key: 'docs',     label: 'Documentation',       re: /^docs(\(.+?\))?:/i              },
    { key: 'other',    label: 'Other',               re: /.*/                             },
];

const buckets = Object.fromEntries(CATEGORIES.map(c => [c.key, []]));

for (const line of logLines) {
    const cat = CATEGORIES.find(c => c.re.test(line)) || CATEGORIES.at(-1);
    buckets[cat.key].push(line);
}

// ── Build changelog section ───────────────────────────────────────────────────
const date    = new Date().toISOString().slice(0, 10);
let section   = `## [${newVersion}] — ${date}\n\n`;
let hasContent = false;

for (const { key, label } of CATEGORIES) {
    if (!buckets[key].length) continue;
    section += `### ${label}\n\n`;
    for (const line of buckets[key]) section += `- ${line}\n`;
    section += '\n';
    hasContent = true;
}

if (!hasContent) section += '_No commits found in this range._\n\n';

// ── Prepend to CHANGELOG.md ───────────────────────────────────────────────────
const header   = `# Changelog\n\nAll notable changes follow [Conventional Commits](https://www.conventionalcommits.org/).\n\n`;
const existing = existsSync(CL) ? readFileSync(CL, 'utf8').replace(/^# Changelog[\s\S]*?\n\n/, '') : '';
writeFileSync(CL, header + section + existing, 'utf8');
console.log(`CHANGELOG.md updated (${logLines.length} commit(s) since ${since || 'beginning'})`);

// ── Stage and commit ──────────────────────────────────────────────────────────
try {
    execSync('git add package.json VERSION CHANGELOG.md', { stdio: 'pipe' });
    execSync(
        `git commit -m "chore: bump version to ${newVersion} and update changelog"`,
        { stdio: 'inherit' }
    );
    console.log('Committed version bump.');
} catch {
    console.error('Commit failed — files updated but not committed.');
    process.exit(1);
}
