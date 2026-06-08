import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import SearchBar from '../components/SearchBar';

// Real timers — fake timers deadlock with RTL's waitFor polling.
// The 350 ms debounce fires for real; waitFor polls until the DOM updates.

function mockFetchWith(features: unknown[]) {
    global.fetch = vi.fn().mockResolvedValue({
        json: async () => ({ features }),
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('SearchBar', () => {
    it('renders the search input', () => {
        render(<SearchBar onSelect={vi.fn()} />);
        expect(screen.getByPlaceholderText('Search city or ZIP code…')).toBeInTheDocument();
    });

    it('shows suggestions after debounce when results returned', async () => {
        mockFetchWith([
            { place_name: 'Denver, CO', center: [-104.9, 39.7], bbox: [-105.1, 39.6, -104.7, 39.9] },
        ]);
        render(<SearchBar onSelect={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Denver' } });
        expect(await screen.findByText('Denver, CO', {}, { timeout: 2000 })).toBeInTheDocument();
    }, 5000);

    it('calls onSelect with city data when suggestion is clicked', async () => {
        const onSelect = vi.fn();
        mockFetchWith([
            { place_name: 'Austin, TX', center: [-97.7, 30.3], bbox: [-97.9, 30.1, -97.5, 30.5] },
        ]);
        render(<SearchBar onSelect={onSelect} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Austin' } });
        fireEvent.mouseDown(await screen.findByText('Austin, TX', {}, { timeout: 2000 }));
        expect(onSelect).toHaveBeenCalledWith({
            name:   'Austin, TX',
            center: [-97.7, 30.3],
            bbox:   [-97.9, 30.1, -97.5, 30.5],
        });
    }, 5000);

    it('sets input value to first part of place name on select', async () => {
        mockFetchWith([
            { place_name: 'Portland, OR, United States', center: [-122.6, 45.5], bbox: [-122.8, 45.4, -122.4, 45.6] },
        ]);
        render(<SearchBar onSelect={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Portland' } });
        fireEvent.mouseDown(await screen.findByText('Portland, OR, United States', {}, { timeout: 2000 }));
        expect(screen.getByRole('textbox')).toHaveValue('Portland');
    }, 5000);

    it('derives bbox from center when feature has no bbox', async () => {
        const onSelect = vi.fn();
        mockFetchWith([{ place_name: 'Smalltown, KS', center: [-98.0, 38.5] }]);
        render(<SearchBar onSelect={onSelect} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Small' } });
        fireEvent.mouseDown(await screen.findByText('Smalltown, KS', {}, { timeout: 2000 }));
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            bbox: [-98.5, 38.0, -97.5, 39.0],
        }));
    }, 5000);

    it('does not search when query is shorter than 2 chars', async () => {
        global.fetch = vi.fn();
        render(<SearchBar onSelect={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'D' } });
        await waitFor(() => {}, { timeout: 700 });
        expect(global.fetch).not.toHaveBeenCalled();
    }, 5000);

    it('closes suggestions on outside click', async () => {
        mockFetchWith([{ place_name: 'Denver, CO', center: [-104.9, 39.7], bbox: [-105.1, 39.6, -104.7, 39.9] }]);
        render(<SearchBar onSelect={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Denver' } });
        await screen.findByText('Denver, CO', {}, { timeout: 2000 });
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Denver, CO')).not.toBeInTheDocument();
    }, 5000);

    it('re-opens suggestions on input focus when results exist', async () => {
        mockFetchWith([{ place_name: 'Denver, CO', center: [-104.9, 39.7], bbox: [-105.1, 39.6, -104.7, 39.9] }]);
        render(<SearchBar onSelect={vi.fn()} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Denver' } });
        await screen.findByText('Denver, CO', {}, { timeout: 2000 });
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText('Denver, CO')).not.toBeInTheDocument();
        fireEvent.focus(input);
        expect(screen.getByText('Denver, CO')).toBeInTheDocument();
    }, 5000);

    it('clears suggestions on fetch error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('network error'));
        render(<SearchBar onSelect={vi.fn()} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Denver' } });
        // Wait for debounce to fire so the timer is consumed within this test.
        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 2000 });
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    }, 5000);

    it('debounces rapid typing — only one fetch call', async () => {
        global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ features: [] }) });
        render(<SearchBar onSelect={vi.fn()} />);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'D' } });
        fireEvent.change(input, { target: { value: 'De' } });
        fireEvent.change(input, { target: { value: 'Den' } });
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1), { timeout: 2000 });
    }, 5000);
});
