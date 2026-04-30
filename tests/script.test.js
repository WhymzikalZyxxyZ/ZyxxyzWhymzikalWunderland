'use strict';

let navigateToPage;

beforeEach(() => {
    jest.resetModules();
    global.window = { location: { href: '' } };
    navigateToPage = require('../js/script').navigateToPage;
});

afterEach(() => {
    delete global.window;
});

describe('navigateToPage — blocked inputs', () => {
    test('null is ignored', () => {
        navigateToPage(null);
        expect(window.location.href).toBe('');
    });
    test('undefined is ignored', () => {
        navigateToPage(undefined);
        expect(window.location.href).toBe('');
    });
    test('non-string is ignored', () => {
        navigateToPage(42);
        expect(window.location.href).toBe('');
    });
    test('empty string is ignored', () => {
        navigateToPage('');
        expect(window.location.href).toBe('');
    });
    test('javascript: protocol is blocked', () => {
        navigateToPage('javascript:alert(1)');
        expect(window.location.href).toBe('');
    });
    test('JAVASCRIPT: (uppercase) is blocked', () => {
        navigateToPage('JAVASCRIPT:alert(1)');
        expect(window.location.href).toBe('');
    });
    test('data: protocol is blocked', () => {
        navigateToPage('data:text/html,<h1>bad</h1>');
        expect(window.location.href).toBe('');
    });
    test('vbscript: protocol is blocked', () => {
        navigateToPage('vbscript:MsgBox(1)');
        expect(window.location.href).toBe('');
    });
    test('protocol-relative URL (//) is blocked', () => {
        navigateToPage('//evil.com');
        expect(window.location.href).toBe('');
    });
    test('javascript: with leading whitespace is blocked', () => {
        navigateToPage('  javascript:alert(1)');
        expect(window.location.href).toBe('');
    });
});

describe('navigateToPage — allowed inputs', () => {
    test('relative path is navigated to', () => {
        navigateToPage('games.html');
        expect(window.location.href).toBe('games.html');
    });
    test('absolute path starting with / is allowed', () => {
        navigateToPage('/index.html');
        expect(window.location.href).toBe('/index.html');
    });
    test('../relative path is allowed', () => {
        navigateToPage('../index.html');
        expect(window.location.href).toBe('../index.html');
    });
});
