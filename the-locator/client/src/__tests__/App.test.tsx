import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Map component is already mocked via setup.ts (maplibre-gl mock).
// We further mock the Map component itself to simplify App integration tests.
vi.mock('../components/Map', () => ({
    default: ({ onFeatureClick }: { onFeatureClick: (f: unknown) => void }) => (
        <div
            data-testid="mock-map"
            onClick={() => onFeatureClick({ layer: 'superfund', properties: { name: 'Test Site', nplStatus: 'NPL', address: '1 Main', city: 'Denver', state: 'CO' } })}
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
        fireEvent.click(screen.getByTestId('mock-map'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        expect(screen.getByText('Test Site')).toBeInTheDocument();
    });

    it('closes InfoPanel when close button is clicked', () => {
        render(<App />);
        fireEvent.click(screen.getByTestId('mock-map'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Close'));
        expect(screen.queryByText('Superfund Site')).not.toBeInTheDocument();
    });

    it('clears active feature when layer is toggled', () => {
        render(<App />);
        // Show a feature
        fireEvent.click(screen.getByTestId('mock-map'));
        expect(screen.getByText('Superfund Site')).toBeInTheDocument();
        // Toggle any layer — should clear the feature panel
        fireEvent.click(screen.getByTitle('EPA CERCLIS contamination sites'));
        expect(screen.queryByText('Superfund Site')).not.toBeInTheDocument();
    });
});
