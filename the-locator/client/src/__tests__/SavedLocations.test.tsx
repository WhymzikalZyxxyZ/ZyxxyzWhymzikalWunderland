import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SavedLocations from '../components/SavedLocations';
import type { LayerName } from '../types/geojson';

const city = {
    name:   'Denver, CO',
    center: [-104.9903, 39.7392] as [number, number],
    bbox:   [-105.1, 39.6, -104.7, 39.9] as [number, number, number, number],
    zoom:   12,
};

const defaultProps = {
    city,
    activeLayers:   new Set<LayerName>(['population']),
    populationYear: 2022,
    onRestore:      vi.fn(),
};

describe('SavedLocations', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('renders the Saved Views header', () => {
        render(<SavedLocations {...defaultProps} />);
        expect(screen.getByText('Saved Views')).toBeInTheDocument();
    });

    it('expands the panel on header click', () => {
        render(<SavedLocations {...defaultProps} />);
        fireEvent.click(screen.getByText('Saved Views'));
        expect(screen.getByText('+ Save current view')).toBeInTheDocument();
    });

    it('saves the current view when the save button is clicked', () => {
        render(<SavedLocations {...defaultProps} />);
        fireEvent.click(screen.getByText('Saved Views'));
        fireEvent.click(screen.getByText('+ Save current view'));
        expect(screen.getByText('Denver, CO')).toBeInTheDocument();
    });

    it('disable save button when no city is selected', () => {
        render(<SavedLocations {...defaultProps} city={null} />);
        fireEvent.click(screen.getByText('Saved Views'));
        expect(screen.getByText('+ Save current view')).toBeDisabled();
    });

    it('deletes a saved item when the delete button is clicked', () => {
        render(<SavedLocations {...defaultProps} />);
        fireEvent.click(screen.getByText('Saved Views'));
        fireEvent.click(screen.getByText('+ Save current view'));
        expect(screen.getByText('Denver, CO')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /delete denver/i }));
        expect(screen.queryByText('Denver, CO')).not.toBeInTheDocument();
    });

    it('calls onRestore with city, layers and year when item is clicked', () => {
        const onRestore = vi.fn();
        render(<SavedLocations {...defaultProps} onRestore={onRestore} />);
        fireEvent.click(screen.getByText('Saved Views'));
        fireEvent.click(screen.getByText('+ Save current view'));
        fireEvent.click(screen.getByText('Denver, CO'));
        expect(onRestore).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Denver, CO', center: city.center }),
            new Set(['population']),
            2022,
        );
    });
});
