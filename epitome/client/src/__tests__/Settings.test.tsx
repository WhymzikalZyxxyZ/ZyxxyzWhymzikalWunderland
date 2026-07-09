import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsProvider } from '../contexts/SettingsContext';
import { Settings } from '../pages/Settings';

function renderSettings() {
    return render(
        <SettingsProvider>
            <Settings />
        </SettingsProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.fontSize = '';
    document.body.style.fontFamily = '';
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('Settings page — rendering', () => {
    it('renders the Atelier heading', () => {
        renderSettings();
        expect(screen.getByRole('heading', { name: /atelier/i })).toBeInTheDocument();
    });

    it('renders all four theme options', () => {
        renderSettings();
        expect(screen.getByText('Midnight')).toBeInTheDocument();
        expect(screen.getByText('Ivory')).toBeInTheDocument();
        expect(screen.getByText('Sépia')).toBeInTheDocument();
        expect(screen.getByText('Noir')).toBeInTheDocument();
    });

    it('renders all four font options', () => {
        renderSettings();
        expect(screen.getByText('Inter')).toBeInTheDocument();
        expect(screen.getByText('Playfair Display')).toBeInTheDocument();
        expect(screen.getByText('Lora')).toBeInTheDocument();
        expect(screen.getByText('System Default')).toBeInTheDocument();
    });

    it('renders all six zoom level buttons', () => {
        renderSettings();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('100% (Default)')).toBeInTheDocument();
        expect(screen.getByText('115%')).toBeInTheDocument();
        expect(screen.getByText('125%')).toBeInTheDocument();
        expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('renders the Reset button', () => {
        renderSettings();
        expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('renders the section headings', () => {
        renderSettings();
        expect(screen.getByText('Atmosphere')).toBeInTheDocument();
        expect(screen.getByText('Typeface')).toBeInTheDocument();
        expect(screen.getByText('Scale')).toBeInTheDocument();
    });
});

// ── Interactions ──────────────────────────────────────────────────────────────

describe('Settings page — interactions', () => {
    it('applies ivory theme to the DOM when Ivory is clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Ivory'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('ivory');
    });

    it('applies sepia theme when Sépia is clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Sépia'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
    });

    it('applies noir theme when Noir is clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Noir'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('noir');
    });

    it('sets Playfair Display font on body when clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Playfair Display'));
        expect(document.body.style.fontFamily).toContain('Playfair Display');
    });

    it('sets 125% zoom on :root when 125% is clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('125%'));
        expect(document.documentElement.style.fontSize).toBe('125%');
    });

    it('sets 75% zoom on :root when 75% is clicked', () => {
        renderSettings();
        fireEvent.click(screen.getByText('75%'));
        expect(document.documentElement.style.fontSize).toBe('75%');
    });

    it('resets theme, font, and zoom to defaults when Reset is clicked', () => {
        renderSettings();
        // Set non-default values first
        fireEvent.click(screen.getByText('Ivory'));
        fireEvent.click(screen.getByText('Playfair Display'));
        fireEvent.click(screen.getByText('125%'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('ivory');
        expect(document.documentElement.style.fontSize).toBe('125%');
        // Now reset
        fireEvent.click(screen.getByRole('button', { name: /reset/i }));
        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(document.documentElement.style.fontSize).toBe('');
        expect(document.body.style.fontFamily).toContain('Inter');
    });

    it('persists theme selection to localStorage', () => {
        renderSettings();
        fireEvent.click(screen.getByText('Sépia'));
        const stored = JSON.parse(localStorage.getItem('ep-settings')!);
        expect(stored.theme).toBe('sepia');
    });

    it('persists zoom selection to localStorage', () => {
        renderSettings();
        fireEvent.click(screen.getByText('150%'));
        const stored = JSON.parse(localStorage.getItem('ep-settings')!);
        expect(stored.zoom).toBe(150);
    });
});
