import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from '../App';

afterEach(() => {
    // Reset location.search after each test so URL param tests don't bleed over
    Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/', search: '', pathname: '/' },
        writable: true,
        configurable: true,
    });
});

// Map component is already mocked via setup.ts (maplibre-gl mock).
// We further mock the Map component itself to simplify App integration tests.
import type { LayerName } from '../types/geojson';

vi.mock('../components/Map', () => ({
    default: ({
        city,
        onFeatureClick,
        onLayerError,
        onOpenSidebar,
    }: {
        city?:           { name: string };
        onFeatureClick:  (f: unknown) => void;
        onLayerError:    (layer: LayerName, error: string | null) => void;
        onOpenSidebar:   () => void;
    }) => (
        <div data-testid="mock-map" data-city={city?.name ?? ''}>
            <button
                data-testid="trigger-feature"
                onClick={() => onFeatureClick({ layer: 'superfund', properties: { name: 'Test Site', nplStatus: 'NPL', address: '1 Main', city: 'Denver', state: 'CO' } })}
            />
            <button data-testid="trigger-error"        onClick={() => onLayerError('population', 'Census API unavailable')} />
            <button data-testid="trigger-error-clear"  onClick={() => onLayerError('population', null)} />
            <button data-testid="trigger-open-sidebar" onClick={() => onOpenSidebar()} />
        </div>
    ),
}));

vi.mock('../components/SavedLocations', () => ({
    default: ({ onRestore }: {
        onRestore: (city: { name: string; center: [number,number]; bbox: [number,number,number,number] }, layers: Set<LayerName>, year: number) => void;
    }) => (
        <button
            data-testid="trigger-restore"
            onClick={() => onRestore(
                { name: 'Denver, CO', center: [-104.99, 39.74], bbox: [-105.1, 39.6, -104.7, 39.9] },
                new Set<LayerName>(['neighborhoods']),
                2019,
            )}
        />
    ),
}));

describe('App', () => {
    it('renders sidebar and map', () => {
        render(<App />);
        expect(screen.getByText('The Locator')).toBeInTheDocument();
        expect(screen.getByTestId('mock-map')).toBeInTheDocument();
    });

    it('toggles a layer on when clicked', () => {
        render(<App />);
        const btn = screen.getByTitle('Census-designated district boundaries');
        expect(btn).not.toHaveClass('layer-btn--active');
        fireEvent.click(btn);
        expect(btn).toHaveClass('layer-btn--active');
    });

    it('toggles a layer off when clicked twice', () => {
        render(<App />);
        const btn = screen.getByTitle('Unified school district boundaries');
        fireEvent.click(btn);
        expect(btn).toHaveClass('layer-btn--active');
        fireEvent.click(btn);
        expect(btn).not.toHaveClass('layer-btn--active');
    });

    it('shows InfoPanel when map feature is clicked', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-feature'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        expect(screen.getByText('Test Site')).toBeInTheDocument();
    });

    it('closes InfoPanel when close button is clicked', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-feature'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Close'));
        expect(screen.queryByText('Superfund Site')).not.toBeInTheDocument();
    });

    it('clears active feature when layer is toggled', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-feature'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle('EPA CERCLIS contamination sites'));
        expect(screen.queryByText('Superfund Site')).not.toBeInTheDocument();
    });

    it('shows layer error when map reports one', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-error'));
        expect(screen.getByText('⚠ Unavailable')).toBeInTheDocument();
    });

    it('clears layer error when map reports null', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-error'));
        expect(screen.getByText('⚠ Unavailable')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('trigger-error-clear'));
        expect(screen.queryByText('⚠ Unavailable')).not.toBeInTheDocument();
    });

    it('clears layer error when layer is toggled', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('trigger-error'));
        expect(screen.getByText('⚠ Unavailable')).toBeInTheDocument();
        fireEvent.click(screen.getByTitle('Density per km² by census tract'));
        expect(screen.queryByText('⚠ Unavailable')).not.toBeInTheDocument();
    });

    it('opens sidebar when toggle button is clicked', () => {
        render(<App />);
        const sidebar = document.querySelector('.sidebar')!;
        expect(sidebar).not.toHaveClass('sidebar--open');
        fireEvent.click(screen.getByLabelText('Open sidebar'));
        expect(sidebar).toHaveClass('sidebar--open');
    });

    it('closes sidebar when toggle button is clicked again', () => {
        render(<App />);
        fireEvent.click(screen.getByLabelText('Open sidebar'));
        const sidebar = document.querySelector('.sidebar')!;
        expect(sidebar).toHaveClass('sidebar--open');
        fireEvent.click(screen.getByLabelText('Close sidebar'));
        expect(sidebar).not.toHaveClass('sidebar--open');
    });

    it('closes sidebar when backdrop is clicked', () => {
        render(<App />);
        fireEvent.click(screen.getByLabelText('Open sidebar'));
        const backdrop = document.querySelector('.sidebar-backdrop')!;
        expect(backdrop).toBeInTheDocument();
        fireEvent.click(backdrop);
        expect(document.querySelector('.sidebar-backdrop')).not.toBeInTheDocument();
    });

    it('opens sidebar when map calls onOpenSidebar', () => {
        render(<App />);
        const sidebar = document.querySelector('.sidebar')!;
        expect(sidebar).not.toHaveClass('sidebar--open');
        fireEvent.click(screen.getByTestId('trigger-open-sidebar'));
        expect(sidebar).toHaveClass('sidebar--open');
    });

    it('restores city and closes sidebar when handleRestore is called', () => {
        render(<App />);
        fireEvent.click(screen.getByLabelText('Open sidebar'));
        expect(document.querySelector('.sidebar')).toHaveClass('sidebar--open');
        fireEvent.click(screen.getByTestId('trigger-restore'));
        expect(document.querySelector('.sidebar')).not.toHaveClass('sidebar--open');
    });

    it('restores city from URL lat/lng params on mount', () => {
        Object.defineProperty(window, 'location', {
            value: {
                href:     'http://localhost/?lat=39.74&lng=-104.99&place=Denver%2C+CO&layers=neighborhoods&year=2019',
                search:   '?lat=39.74&lng=-104.99&place=Denver%2C+CO&layers=neighborhoods&year=2019',
                pathname: '/',
            },
            writable: true,
            configurable: true,
        });
        render(<App />);
        const map = screen.getByTestId('mock-map');
        expect(map.getAttribute('data-city')).toBe('Denver, CO');
    });

    it('restores city from URL lat/lng without a place name on mount', () => {
        Object.defineProperty(window, 'location', {
            value: {
                href:     'http://localhost/?lat=39.74&lng=-104.99&zoom=10',
                search:   '?lat=39.74&lng=-104.99&zoom=10',
                pathname: '/',
            },
            writable: true,
            configurable: true,
        });
        render(<App />);
        const map = screen.getByTestId('mock-map');
        expect(map.getAttribute('data-city')).toBe('Shared View');
    });
});
