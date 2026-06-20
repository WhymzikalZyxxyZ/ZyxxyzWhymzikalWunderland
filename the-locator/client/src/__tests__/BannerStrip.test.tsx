import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import BannerStrip from '../components/BannerStrip';

const STORAGE_KEY = 'locator-banner-dismissed';

describe('BannerStrip', () => {
    beforeEach(() => {
        localStorage.removeItem(STORAGE_KEY);
    });

    it('renders the banner when not previously dismissed', () => {
        render(<BannerStrip />);
        expect(screen.getByRole('note')).toBeInTheDocument();
    });

    it('contains the headline text', () => {
        render(<BannerStrip />);
        expect(screen.getByText(/We know a great deal/)).toBeInTheDocument();
    });

    it('does not render when previously dismissed', () => {
        localStorage.setItem(STORAGE_KEY, '1');
        render(<BannerStrip />);
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('dismisses and hides when the X button is clicked', () => {
        render(<BannerStrip />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
        expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('persists dismissed state to localStorage on dismiss', () => {
        render(<BannerStrip />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
        expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    });
});
