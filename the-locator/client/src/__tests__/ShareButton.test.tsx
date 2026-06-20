import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ShareButton from '../components/ShareButton';

describe('ShareButton', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'location', {
            value: { href: 'https://locator.zyxwonderland.xyz/?lat=39.7&lng=-104.9' },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the share button', () => {
        render(<ShareButton />);
        expect(screen.getByRole('button', { name: /share view/i })).toBeInTheDocument();
    });

    it('copies URL to clipboard and shows confirmation', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(<ShareButton />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByText(/Copied!/)).toBeInTheDocument());
        expect(writeText).toHaveBeenCalledWith(window.location.href);
    });

    it('confirmation fades after 2 seconds', async () => {
        vi.useFakeTimers();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(<ShareButton />);
        fireEvent.click(screen.getByRole('button'));

        // Flush the clipboard promise microtask so setCopied(true) fires
        await act(async () => { await Promise.resolve(); });
        expect(screen.getByText(/Copied!/)).toBeInTheDocument();

        // Advance past the 2-second reset timer
        await act(async () => { vi.advanceTimersByTime(2100); });
        expect(screen.getByText(/Share View/)).toBeInTheDocument();
    });
});
