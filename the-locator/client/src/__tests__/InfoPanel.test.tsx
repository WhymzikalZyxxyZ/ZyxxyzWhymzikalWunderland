import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InfoPanel from '../components/InfoPanel';

describe('InfoPanel', () => {
    it('shows neighborhood label and properties', () => {
        render(<InfoPanel
            feature={{ layer: 'neighborhoods', properties: { NAME: 'Capitol Hill', GEOID: '0801234', STUSAB: 'CO' } }}
            onClose={vi.fn()}
        />);
        expect(screen.getByText('Neighborhood')).toBeInTheDocument();
        expect(screen.getByText('Capitol Hill')).toBeInTheDocument();
        expect(screen.getByText('0801234')).toBeInTheDocument();
        expect(screen.getByText('CO')).toBeInTheDocument();
    });

    it('shows school district label and properties', () => {
        render(<InfoPanel
            feature={{ layer: 'schools', properties: { NAME: 'Denver USD 1', GEOID: '0800001', STUSAB: 'CO' } }}
            onClose={vi.fn()}
        />);
        expect(screen.getByText('School District')).toBeInTheDocument();
        expect(screen.getByText('Denver USD 1')).toBeInTheDocument();
    });

    it('shows superfund site properties', () => {
        render(<InfoPanel
            feature={{
                layer: 'superfund',
                properties: { name: 'Toxic Site', nplStatus: 'NPL', address: '123 Main', city: 'Denver', state: 'CO' },
            }}
            onClose={vi.fn()}
        />);
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        expect(screen.getByText('Toxic Site')).toBeInTheDocument();
        expect(screen.getByText('NPL')).toBeInTheDocument();
        expect(screen.getByText('123 Main')).toBeInTheDocument();
    });

    it('shows population properties with formatted number', () => {
        render(<InfoPanel
            feature={{
                layer: 'population',
                properties: { population: 12345, areaKm2: 2.5, densityPerKm2: 4938, acsYear: 2022, GEOID: '08031000100' },
            }}
            onClose={vi.fn()}
        />);
        expect(screen.getByText('Population Data')).toBeInTheDocument();
        expect(screen.getByText('12,345')).toBeInTheDocument();
        expect(screen.getByText('2022')).toBeInTheDocument();
        expect(screen.getByText('08031000100')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<InfoPanel
            feature={{ layer: 'neighborhoods', properties: { NAME: 'Test', GEOID: '1', STUSAB: 'TX' } }}
            onClose={onClose}
        />);
        fireEvent.click(screen.getByLabelText('Close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('omits Row when value is null', () => {
        render(<InfoPanel
            feature={{ layer: 'superfund', properties: { name: 'Site', nplStatus: null, address: null, city: null, state: null } }}
            onClose={vi.fn()}
        />);
        // Only "Site" label row should appear; null rows render nothing
        expect(screen.queryByText('Address')).toBeNull();
    });

    it('omits Row when value is empty string', () => {
        render(<InfoPanel
            feature={{ layer: 'superfund', properties: { name: 'Site', nplStatus: '', address: '', city: '', state: '' } }}
            onClose={vi.fn()}
        />);
        expect(screen.queryByText('Status')).toBeNull();
    });

    it('falls back to layer key for unknown layer type', () => {
        render(<InfoPanel
            feature={{ layer: 'unknown' as never, properties: { NAME: 'Test' } }}
            onClose={vi.fn()}
        />);
        // heading falls back to the layer name itself
        expect(screen.getByText('unknown')).toBeInTheDocument();
    });

    it('population panel omits population row when population is null', () => {
        render(<InfoPanel
            feature={{
                layer: 'population',
                properties: { population: null, areaKm2: 1, densityPerKm2: 0, acsYear: 2022, GEOID: '123' },
            }}
            onClose={vi.fn()}
        />);
        expect(screen.queryByText('Population')).toBeNull();
    });
});
