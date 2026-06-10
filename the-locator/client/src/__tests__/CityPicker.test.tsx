import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CityPicker from '../components/CityPicker';

describe('CityPicker', () => {
    it('renders the Quick select heading', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        expect(screen.getByText('Quick select')).toBeInTheDocument();
    });

    it('renders Tucson, AZ as a city button', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'Tucson, AZ' })).toBeInTheDocument();
    });

    it('renders 12 city buttons plus the custom-coords button', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        expect(screen.getAllByRole('button')).toHaveLength(13);
    });

    it('calls onSelect with correct data when Tucson is clicked', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'Tucson, AZ' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            name:   'Tucson, AZ',
            center: [-110.926, 32.220],
            bbox:   [-111.073, 32.059, -110.706, 32.372],
        }));
    });

    it('calls onSelect with correct data when New York is clicked', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'New York, NY' }));
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
            name:   'New York, NY',
            center: [-74.006, 40.713],
        }));
    });

    it('calls onSelect each time a different city is clicked', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'Chicago, IL' }));
        fireEvent.click(screen.getByRole('button', { name: 'Miami, FL' }));
        expect(onSelect).toHaveBeenCalledTimes(2);
        expect(onSelect.mock.calls[0][0].name).toBe('Chicago, IL');
        expect(onSelect.mock.calls[1][0].name).toBe('Miami, FL');
    });

    it('bbox values are ordered [west, south, east, north]', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: 'Denver, CO' }));
        const [west, south, east, north] = onSelect.mock.calls[0][0].bbox as number[];
        expect(west).toBeLessThan(east);
        expect(south).toBeLessThan(north);
    });

    // ── Custom lat/lon ─────────────────────────────────────────────────────────
    it('toggles the custom coords form when + Custom is clicked', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        expect(screen.queryByPlaceholderText('Latitude')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        expect(screen.getByPlaceholderText('Latitude')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Longitude')).toBeInTheDocument();
    });

    it('calls onSelect with a bbox around the entered coordinates', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.change(screen.getByPlaceholderText('Latitude'),  { target: { value: '40.7128' } });
        fireEvent.change(screen.getByPlaceholderText('Longitude'), { target: { value: '-74.0060' } });
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(onSelect).toHaveBeenCalledTimes(1);
        const result = onSelect.mock.calls[0][0];
        expect(result.center).toEqual([-74.006, 40.7128]);
        const [west, south, east, north] = result.bbox as number[];
        expect(west).toBeLessThan(east);
        expect(south).toBeLessThan(north);
    });

    it('shows an error for out-of-range latitude', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.change(screen.getByPlaceholderText('Latitude'),  { target: { value: '999' } });
        fireEvent.change(screen.getByPlaceholderText('Longitude'), { target: { value: '0' } });
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(screen.getByText(/Latitude must be/)).toBeInTheDocument();
    });

    it('shows an error for out-of-range longitude', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.change(screen.getByPlaceholderText('Latitude'),  { target: { value: '40' } });
        fireEvent.change(screen.getByPlaceholderText('Longitude'), { target: { value: '999' } });
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(screen.getByText(/Longitude must be/)).toBeInTheDocument();
    });

    it('closes the form and clears inputs after a valid submission', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.change(screen.getByPlaceholderText('Latitude'),  { target: { value: '34' } });
        fireEvent.change(screen.getByPlaceholderText('Longitude'), { target: { value: '-118' } });
        fireEvent.click(screen.getByRole('button', { name: 'Go' }));
        expect(screen.queryByPlaceholderText('Latitude')).not.toBeInTheDocument();
    });

    it('submits on Enter key in either input', () => {
        const onSelect = vi.fn();
        render(<CityPicker onSelect={onSelect} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.change(screen.getByPlaceholderText('Latitude'),  { target: { value: '34' } });
        fireEvent.change(screen.getByPlaceholderText('Longitude'), { target: { value: '-118' } });
        fireEvent.keyDown(screen.getByPlaceholderText('Longitude'), { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('closes the form on Escape key', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: '+ Custom' }));
        fireEvent.keyDown(screen.getByPlaceholderText('Latitude'), { key: 'Escape' });
        expect(screen.queryByPlaceholderText('Latitude')).not.toBeInTheDocument();
    });
});
