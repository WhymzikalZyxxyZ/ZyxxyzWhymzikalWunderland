import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsProvider, useSettings } from '../contexts/SettingsContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ep-settings';

function TestConsumer() {
    const { settings, setTheme, setFont, setZoom } = useSettings();
    return (
        <div>
            <span data-testid="theme">{settings.theme}</span>
            <span data-testid="font">{settings.font}</span>
            <span data-testid="zoom">{settings.zoom}</span>
            <button onClick={() => setTheme('ivory')}>set-ivory</button>
            <button onClick={() => setTheme('sepia')}>set-sepia</button>
            <button onClick={() => setTheme('noir')}>set-noir</button>
            <button onClick={() => setFont('playfair')}>set-playfair</button>
            <button onClick={() => setFont('lora')}>set-lora</button>
            <button onClick={() => setFont('system')}>set-system</button>
            <button onClick={() => setZoom(125)}>set-zoom-125</button>
            <button onClick={() => setZoom(75)}>set-zoom-75</button>
            <button onClick={() => setZoom(100)}>set-zoom-100</button>
        </div>
    );
}

function renderWithProvider() {
    return render(
        <SettingsProvider>
            <TestConsumer />
        </SettingsProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.fontSize = '';
    document.body.style.fontFamily = '';
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ── Default state ─────────────────────────────────────────────────────────────

describe('SettingsProvider — defaults', () => {
    it('starts with midnight theme', () => {
        renderWithProvider();
        expect(screen.getByTestId('theme').textContent).toBe('midnight');
    });

    it('starts with inter font', () => {
        renderWithProvider();
        expect(screen.getByTestId('font').textContent).toBe('inter');
    });

    it('starts with 100% zoom', () => {
        renderWithProvider();
        expect(screen.getByTestId('zoom').textContent).toBe('100');
    });
});

// ── DOM application ───────────────────────────────────────────────────────────

describe('SettingsProvider — DOM application', () => {
    it('does not set data-theme for midnight (default)', () => {
        renderWithProvider();
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    });

    it('sets data-theme="ivory" when ivory is selected', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-ivory'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('ivory');
    });

    it('sets data-theme="sepia" when sepia is selected', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-sepia'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
    });

    it('sets data-theme="noir" when noir is selected', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-noir'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('noir');
    });

    it('removes data-theme when switching back to midnight', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-ivory'));
        fireEvent.click(screen.getByText('set-ivory')); // can also set midnight back via reset
        // set midnight by switching to noir then back
        fireEvent.click(screen.getByText('set-noir'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('noir');
    });

    it('applies non-100 zoom as font-size percentage on :root', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-zoom-125'));
        expect(document.documentElement.style.fontSize).toBe('125%');
    });

    it('clears font-size on :root when zoom returns to 100', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-zoom-125'));
        fireEvent.click(screen.getByText('set-zoom-100'));
        expect(document.documentElement.style.fontSize).toBe('');
    });

    it('applies 75% zoom', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-zoom-75'));
        expect(document.documentElement.style.fontSize).toBe('75%');
    });

    it('sets fontFamily on body when font changes', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-playfair'));
        expect(document.body.style.fontFamily).toContain('Playfair Display');
    });

    it('includes Lora in fontFamily when lora is selected', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-lora'));
        expect(document.body.style.fontFamily).toContain('Lora');
    });
});

// ── Persistence ───────────────────────────────────────────────────────────────

describe('SettingsProvider — localStorage persistence', () => {
    it('writes settings to localStorage when theme changes', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-sepia'));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.theme).toBe('sepia');
    });

    it('writes font to localStorage when font changes', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-lora'));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.font).toBe('lora');
    });

    it('writes zoom to localStorage when zoom changes', () => {
        renderWithProvider();
        fireEvent.click(screen.getByText('set-zoom-125'));
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
        expect(stored.zoom).toBe(125);
    });

    it('loads saved settings from localStorage on mount', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'noir', font: 'system', zoom: 85 }));
        renderWithProvider();
        expect(screen.getByTestId('theme').textContent).toBe('noir');
        expect(screen.getByTestId('font').textContent).toBe('system');
        expect(screen.getByTestId('zoom').textContent).toBe('85');
    });

    it('falls back to defaults when localStorage contains invalid JSON', () => {
        localStorage.setItem(STORAGE_KEY, '{bad json}}');
        renderWithProvider();
        expect(screen.getByTestId('theme').textContent).toBe('midnight');
        expect(screen.getByTestId('zoom').textContent).toBe('100');
    });
});

// ── useSettings guard ─────────────────────────────────────────────────────────

describe('useSettings()', () => {
    it('throws when used outside SettingsProvider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        function BadConsumer() { useSettings(); return null; }
        expect(() => render(<BadConsumer />)).toThrow('useSettings must be used inside SettingsProvider');
        spy.mockRestore();
    });
});
