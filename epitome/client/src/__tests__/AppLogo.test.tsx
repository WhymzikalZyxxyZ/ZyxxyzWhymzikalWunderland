import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppLogo } from '../components/AppLogo';

describe('AppLogo', () => {
    it('renders "EPI" text', () => {
        render(<AppLogo />);
        expect(screen.getByText('EPI')).toBeInTheDocument();
    });

    it('renders "TOME" text', () => {
        render(<AppLogo />);
        expect(screen.getByText('TOME')).toBeInTheDocument();
    });

    it('applies small tracking class for size="sm"', () => {
        const { container } = render(<AppLogo size="sm" />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('text-xl');
        expect(wrapper.className).toContain('tracking-[0.25em]');
    });

    it('applies medium tracking class for size="md" (default)', () => {
        const { container } = render(<AppLogo />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('text-3xl');
        expect(wrapper.className).toContain('tracking-[0.3em]');
    });

    it('applies large tracking class for size="lg"', () => {
        const { container } = render(<AppLogo size="lg" />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('text-5xl');
        expect(wrapper.className).toContain('tracking-[0.35em]');
    });

    it('renders a <span> element', () => {
        const { container } = render(<AppLogo />);
        expect(container.firstChild?.nodeName).toBe('SPAN');
    });

    it('applies font-display and font-black classes', () => {
        const { container } = render(<AppLogo size="md" />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toContain('font-display');
        expect(wrapper.className).toContain('font-black');
    });
});
