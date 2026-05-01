'use strict';
const { SULTRY_ADJS, SULTRY_NOUNS, USERNAME_KEY, USERNAME_RE,
        genUsername, getOrCreateUsername, setUsername } = require('../js/username-gen');

describe('genUsername', () => {
    test('returns a string', () => {
        expect(typeof genUsername()).toBe('string');
    });
    test('matches expected pattern', () => {
        for (let i = 0; i < 20; i++) expect(genUsername()).toMatch(USERNAME_RE);
    });
    test('uses words from SULTRY_ADJS and SULTRY_NOUNS', () => {
        const u = genUsername();
        const [word] = u.split('_');
        const hasAdj  = SULTRY_ADJS.some(a => word.startsWith(a));
        const hasNoun = SULTRY_NOUNS.some(n => word.endsWith(n));
        expect(hasAdj || hasNoun).toBe(true);
    });
    test('suffix is a 3-digit number', () => {
        const u = genUsername();
        const suffix = u.split('_').pop();
        expect(suffix.length).toBe(3);
        expect(Number.isFinite(+suffix)).toBe(true);
    });
    test('is random — generates different names', () => {
        const names = new Set(Array.from({ length: 30 }, () => genUsername()));
        expect(names.size).toBeGreaterThan(5);
    });
});

describe('USERNAME_RE', () => {
    test('accepts valid username', () => {
        expect(USERNAME_RE.test('VelvetSiren_123')).toBe(true);
    });
    test('rejects username without suffix', () => {
        expect(USERNAME_RE.test('VelvetSiren')).toBe(false);
    });
    test('rejects username with 2-digit suffix', () => {
        expect(USERNAME_RE.test('VelvetSiren_12')).toBe(false);
    });
    test('rejects username with spaces', () => {
        expect(USERNAME_RE.test('Velvet Siren_123')).toBe(false);
    });
});

describe('getOrCreateUsername', () => {
    const localStorageMock = (() => {
        let store = {};
        return {
            getItem:    k => store[k] ?? null,
            setItem:    (k,v) => { store[k] = v; },
            removeItem: k => { delete store[k]; },
            clear:      () => { store = {}; },
        };
    })();

    beforeEach(() => {
        global.localStorage = localStorageMock;
        localStorageMock.clear();
    });

    test('generates a username when none stored', () => {
        const u = getOrCreateUsername();
        expect(USERNAME_RE.test(u)).toBe(true);
    });
    test('stores generated username', () => {
        getOrCreateUsername();
        const stored = localStorageMock.getItem(USERNAME_KEY);
        expect(stored).not.toBeNull();
        expect(USERNAME_RE.test(stored)).toBe(true);
    });
    test('returns existing valid username', () => {
        localStorageMock.setItem(USERNAME_KEY, 'VelvetSiren_123');
        expect(getOrCreateUsername()).toBe('VelvetSiren_123');
    });
    test('replaces invalid stored username', () => {
        localStorageMock.setItem(USERNAME_KEY, 'invalid!!');
        const u = getOrCreateUsername();
        expect(USERNAME_RE.test(u)).toBe(true);
    });
});

describe('setUsername', () => {
    beforeEach(() => {
        global.localStorage = { setItem: jest.fn() };
    });
    test('throws on invalid format', () => {
        expect(() => setUsername('bad')).toThrow();
    });
    test('does not throw on valid format', () => {
        expect(() => setUsername('VelvetSiren_123')).not.toThrow();
    });
});

describe('Word lists', () => {
    test('SULTRY_ADJS has at least 20 entries', () => {
        expect(SULTRY_ADJS.length).toBeGreaterThanOrEqual(20);
    });
    test('SULTRY_NOUNS has at least 20 entries', () => {
        expect(SULTRY_NOUNS.length).toBeGreaterThanOrEqual(20);
    });
    test('no duplicates in SULTRY_ADJS', () => {
        expect(new Set(SULTRY_ADJS).size).toBe(SULTRY_ADJS.length);
    });
    test('no duplicates in SULTRY_NOUNS', () => {
        expect(new Set(SULTRY_NOUNS).size).toBe(SULTRY_NOUNS.length);
    });
});
