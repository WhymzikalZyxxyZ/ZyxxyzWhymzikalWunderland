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

    it('renders all 12 city buttons', () => {
        render(<CityPicker onSelect={vi.fn()} />);
        expect(screen.getAllByRole('button')).toHaveLength(12);
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
});
