import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Legend from '../components/Legend';
import type { LayerName } from '../types/geojson';

describe('Legend', () => {
    it('renders nothing when no layers are active', () => {
        const { container } = render(<Legend activeLayers={new Set<LayerName>()} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders population ramp when population is active', () => {
        render(<Legend activeLayers={new Set<LayerName>(['population'])} />);
        expect(screen.getByText('Population Density')).toBeInTheDocument();
        expect(document.querySelector('.legend-ramp-population')).toBeInTheDocument();
    });

    it('renders walkscore ramp with tick labels when walkscore is active', () => {
        render(<Legend activeLayers={new Set<LayerName>(['walkscore'])} />);
        expect(screen.getByText('Walkability Index')).toBeInTheDocument();
        expect(document.querySelector('.legend-ramp-walkscore')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('renders swatch item for counties', () => {
        render(<Legend activeLayers={new Set<LayerName>(['counties'])} />);
        expect(screen.getByText('Counties')).toBeInTheDocument();
        expect(document.querySelector('.legend-item--swatch')).toBeInTheDocument();
    });

    it('renders swatch item for transit', () => {
        render(<Legend activeLayers={new Set<LayerName>(['transit'])} />);
        expect(screen.getByText('Transit Stops')).toBeInTheDocument();
        expect(document.querySelector('.legend-swatch')).toBeInTheDocument();
    });

    it('renders multiple active layers', () => {
        render(<Legend activeLayers={new Set<LayerName>(['counties', 'population', 'walkscore'])} />);
        expect(screen.getByText('Counties')).toBeInTheDocument();
        expect(screen.getByText('Population Density')).toBeInTheDocument();
        expect(screen.getByText('Walkability Index')).toBeInTheDocument();
    });
});
