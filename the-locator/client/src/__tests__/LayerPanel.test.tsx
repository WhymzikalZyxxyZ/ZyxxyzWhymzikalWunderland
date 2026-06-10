import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LayerPanel from '../components/LayerPanel';

describe('LayerPanel', () => {
    it('renders all four layer buttons', () => {
        render(<LayerPanel activeLayers={new Set()} onToggle={vi.fn()} />);
        expect(screen.getByText('Neighborhoods')).toBeInTheDocument();
        expect(screen.getByText('School Districts')).toBeInTheDocument();
        expect(screen.getByText('Superfund Sites')).toBeInTheDocument();
        expect(screen.getByText('Population')).toBeInTheDocument();
    });

    it('active layer button has active class', () => {
        render(<LayerPanel activeLayers={new Set(['neighborhoods'])} onToggle={vi.fn()} />);
        const btn = screen.getByTitle('Census-designated district boundaries');
        expect(btn).toHaveClass('layer-btn--active');
    });

    it('inactive layer button does not have active class', () => {
        render(<LayerPanel activeLayers={new Set()} onToggle={vi.fn()} />);
        const btn = screen.getByTitle('Census-designated district boundaries');
        expect(btn).not.toHaveClass('layer-btn--active');
    });

    it('calls onToggle with correct layer id on click', () => {
        const onToggle = vi.fn();
        render(<LayerPanel activeLayers={new Set()} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('School Districts'));
        expect(onToggle).toHaveBeenCalledWith('schools');
    });

    it('toggle indicator has "on" class when layer is active', () => {
        render(<LayerPanel activeLayers={new Set(['superfund'])} onToggle={vi.fn()} />);
        const btn = screen.getByTitle('EPA CERCLIS contamination sites');
        const toggle = btn.querySelector('.layer-toggle');
        expect(toggle).toHaveClass('on');
    });

    it('toggle indicator lacks "on" class when inactive', () => {
        render(<LayerPanel activeLayers={new Set()} onToggle={vi.fn()} />);
        const btn = screen.getByTitle('EPA CERCLIS contamination sites');
        const toggle = btn.querySelector('.layer-toggle');
        expect(toggle).not.toHaveClass('on');
    });

    it('calls onToggle for each layer button', () => {
        const onToggle = vi.fn();
        render(<LayerPanel activeLayers={new Set()} onToggle={onToggle} />);
        fireEvent.click(screen.getByText('Population'));
        expect(onToggle).toHaveBeenCalledWith('population');
    });

    it('shows error message when a layer has an error', () => {
        render(
            <LayerPanel
                activeLayers={new Set(['population'])}
                onToggle={vi.fn()}
                layerErrors={{ population: 'Population layer requires a Census API key — not configured on this server' }}
            />
        );
        expect(screen.getByText('⚠ Unavailable')).toBeInTheDocument();
    });

    it('shows error tooltip with full message', () => {
        render(
            <LayerPanel
                activeLayers={new Set(['population'])}
                onToggle={vi.fn()}
                layerErrors={{ population: 'Census API unavailable' }}
            />
        );
        expect(screen.getByTitle('Census API unavailable')).toBeInTheDocument();
    });

    it('does not show error when no layerErrors provided', () => {
        render(<LayerPanel activeLayers={new Set()} onToggle={vi.fn()} />);
        expect(screen.queryByText('⚠ Unavailable')).not.toBeInTheDocument();
    });
});
