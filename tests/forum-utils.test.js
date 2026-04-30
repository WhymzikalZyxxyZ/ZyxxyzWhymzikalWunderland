'use strict';
const { ADJS, NOUNS, genUsername, escHtml, fmtTime } = require('../js/forum-utils');

// ── genUsername ──────────────────────────────────────────────────────────────
describe('genUsername', () => {
    test('matches Adj+Noun_NNN pattern', () => {
        for (let i = 0; i < 20; i++) {
            expect(genUsername()).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+_\d{3}$/);
        }
    });
    test('adjective part is from ADJS list', () => {
        for (let i = 0; i < 30; i++) {
            const name = genUsername();
            const adj  = ADJS.find(a => name.startsWith(a));
            expect(adj).toBeDefined();
        }
    });
    test('noun part is from NOUNS list', () => {
        for (let i = 0; i < 30; i++) {
            const name = genUsername();
            const noun = NOUNS.find(n => name.includes(n));
            expect(noun).toBeDefined();
        }
    });
    test('numeric suffix is between 100 and 999', () => {
        for (let i = 0; i < 20; i++) {
            const num = parseInt(genUsername().split('_')[1], 10);
            expect(num).toBeGreaterThanOrEqual(100);
            expect(num).toBeLessThanOrEqual(999);
        }
    });
    test('returns a string', () => {
        expect(typeof genUsername()).toBe('string');
    });
});

// ── escHtml ──────────────────────────────────────────────────────────────────
describe('escHtml', () => {
    test('escapes &', () => expect(escHtml('a&b')).toBe('a&amp;b'));
    test('escapes <', () => expect(escHtml('<tag>')).toBe('&lt;tag&gt;'));
    test('escapes >', () => expect(escHtml('x>y')).toBe('x&gt;y'));
    test('escapes "', () => expect(escHtml('"hi"')).toBe('&quot;hi&quot;'));
    test('escapes all special chars together', () => {
        expect(escHtml('<script>alert("x&y")</script>')).toBe(
            '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;'
        );
    });
    test('plain text is returned unchanged', () => {
        expect(escHtml('hello world')).toBe('hello world');
    });
    test('empty string returns empty string', () => {
        expect(escHtml('')).toBe('');
    });
});

// ── fmtTime ──────────────────────────────────────────────────────────────────
describe('fmtTime', () => {
    test('returns a string', () => {
        expect(typeof fmtTime(Date.now())).toBe('string');
    });
    test('non-empty result', () => {
        expect(fmtTime(Date.now()).length).toBeGreaterThan(0);
    });
    test('formats a known timestamp', () => {
        const ts  = new Date('2026-01-01T14:30:00').getTime();
        const str = fmtTime(ts);
        expect(str).toMatch(/\d{1,2}:\d{2}/);
    });
    test('different timestamps produce different strings', () => {
        const a = fmtTime(new Date('2026-01-01T09:00:00').getTime());
        const b = fmtTime(new Date('2026-01-01T22:00:00').getTime());
        expect(a).not.toBe(b);
    });
});
