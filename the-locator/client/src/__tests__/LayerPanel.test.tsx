import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LayerPanel from '../components/LayerPanel';
import type { LayerName } from '../types/geojson';

const defaultProps = {
    activeLayers:   new Set<LayerName>(),
    onToggle:       vi.fn(),
    populationYear: 2022,
    onYearChange:   vi.fn(),
};

describe('LayerPanel', () => {
    it('renders all six layer buttons', () => {
        render(<LayerPanel {...defaultProps} />);
        expect(screen.getByText('Neighborhoods')).toBeInTheDocument();
        expect(screen.getByText('School Districts')).toBeInTheDocument();
        expect(screen.getByText('City Limits')).toBeInTheDocument();
        expect(screen.getByText('Superfund Sites')).toBeInTheDocument();
        expect(screen.getByText('Population')).toBeInTheDocument();
        expect(screen.getByText('Walkability')).toBeInTheDocument();
    });

    it('active layer button has active class', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['neighborhoods'])} />);
        const btn = screen.getByTitle('Census-designated district boundaries');
        expect(btn).toHaveClass('layer-btn--active');
    });

    it('inactive layer button does not have active class', () => {
        render(<LayerPanel {...defaultProps} />);
        const btn = screen.getByTitle('Census-designated district boundaries');
        expect(btn).not.toHaveClass('layer-btn--active');
    });

    it('calls onToggle with correct layer id on click', () => {
        const onToggle = vi.fn();
        render(<LayerPanel {...defaultProps} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('School Districts'));
        expect(onToggle).toHaveBeenCalledWith('schools');
    });

    it('toggle indicator has "on" class when layer is active', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['superfund'])} />);
        const btn = screen.getByTitle('EPA CERCLIS contamination sites');
        const toggle = btn.querySelector('.layer-toggle');
        expect(toggle).toHaveClass('on');
    });

    it('toggle indicator lacks "on" class when inactive', () => {
        render(<LayerPanel {...defaultProps} />);
        const btn = screen.getByTitle('EPA CERCLIS contamination sites');
        const toggle = btn.querySelector('.layer-toggle');
        expect(toggle).not.toHaveClass('on');
    });

    it('calls onToggle for population layer button', () => {
        const onToggle = vi.fn();
        render(<LayerPanel {...defaultProps} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('Population'));
        expect(onToggle).toHaveBeenCalledWith('population');
    });

    it('shows year selector when population layer is active', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['population'])} />);
        expect(screen.getByLabelText('ACS year')).toBeInTheDocument();
    });

    it('shows year selector when cities layer is active and population is not', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['cities'])} />);
        expect(screen.getByLabelText('ACS year')).toBeInTheDocument();
    });

    it('shows only one year selector when both population and cities are active', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['population', 'cities'])} />);
        expect(screen.getAllByLabelText('ACS year')).toHaveLength(1);
    });

    it('hides year selector when population layer is inactive', () => {
        render(<LayerPanel {...defaultProps} />);
        expect(screen.queryByLabelText('ACS year')).not.toBeInTheDocument();
    });

    it('year selector shows the current populationYear as selected', () => {
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['population'])} populationYear={2019} />);
        const select = screen.getByLabelText('ACS year') as HTMLSelectElement;
        expect(select.value).toBe('2019');
    });

    it('calls onYearChange when a new year is selected', () => {
        const onYearChange = vi.fn();
        render(<LayerPanel {...defaultProps} activeLayers={new Set<LayerName>(['population'])} onYearChange={onYearChange} />);
        fireEvent.change(screen.getByLabelText('ACS year'), { target: { value: '2015' } });
        expect(onYearChange).toHaveBeenCalledWith(2015);
    });

    it('shows error message when a layer has an error', () => {
        render(
            <LayerPanel
                {...defaultProps}
                activeLayers={new Set<LayerName>(['population'])}
                layerErrors={{ population: 'Population layer requires a Census API key — not configured on this server' }}
            />
        );
        expect(screen.getByText('⚠ Unavailable')).toBeInTheDocument();
    });

    it('shows error tooltip with full message', () => {
        render(
            <LayerPanel
                {...defaultProps}
                activeLayers={new Set<LayerName>(['population'])}
                layerErrors={{ population: 'Census API unavailable' }}
            />
        );
        expect(screen.getByTitle('Census API unavailable')).toBeInTheDocument();
    });

    it('does not show error when no layerErrors provided', () => {
        render(<LayerPanel {...defaultProps} />);
        expect(screen.queryByText('⚠ Unavailable')).not.toBeInTheDocument();
    });
});
