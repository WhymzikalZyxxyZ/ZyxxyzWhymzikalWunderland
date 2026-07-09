import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordCountBar } from '../components/WordCountBar';

describe('WordCountBar', () => {
    // ── Progress bar width ──────────────────────────────────────────────────────

    it('renders the progress fill with correct width percentage', () => {
        const { container } = render(<WordCountBar current={500} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('50%');
    });

    it('renders 0% width when current is 0 and target is positive', () => {
        const { container } = render(<WordCountBar current={0} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });

    it('renders 100% width when current equals target', () => {
        const { container } = render(<WordCountBar current={1000} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('100%');
    });

    it('caps width at 100% when current exceeds target (overflow case)', () => {
        const { container } = render(<WordCountBar current={1500} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('100%');
    });

    it('renders 0% width when target is 0 to avoid division by zero', () => {
        const { container } = render(<WordCountBar current={0} target={0} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });

    it('also renders 0% when current is positive but target is 0', () => {
        const { container } = render(<WordCountBar current={500} target={0} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('0%');
    });

    // ── "over" class ─────────────────────────────────────────────────────────────

    it('adds "over" class to fill when current exceeds target', () => {
        const { container } = render(<WordCountBar current={1001} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill).toHaveClass('over');
    });

    it('does not add "over" class when current equals target', () => {
        const { container } = render(<WordCountBar current={1000} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill).not.toHaveClass('over');
    });

    it('does not add "over" class when current is below target', () => {
        const { container } = render(<WordCountBar current={500} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill).not.toHaveClass('over');
    });

    // ── showNumbers (default true) ────────────────────────────────────────────────

    it('shows the current and target numbers by default', () => {
        render(<WordCountBar current={500} target={1000} />);
        expect(screen.getByText('500')).toBeInTheDocument();
        expect(screen.getByText('/ 1,000')).toBeInTheDocument();
    });

    it('hides number labels when showNumbers is false', () => {
        render(<WordCountBar current={500} target={1000} showNumbers={false} />);
        expect(screen.queryByText('500')).not.toBeInTheDocument();
    });

    // ── compact layout ────────────────────────────────────────────────────────────

    it('applies "flex items-center gap-2" wrapper class in compact mode', () => {
        const { container } = render(<WordCountBar current={500} target={1000} compact />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper).toHaveClass('flex');
        expect(wrapper).toHaveClass('items-center');
    });

    it('does not apply flex wrapper class in non-compact mode', () => {
        const { container } = render(<WordCountBar current={500} target={1000} />);
        const wrapper = container.firstChild as HTMLElement;
        expect(wrapper.className).toBe('');
    });

    it('renders the compact fraction text in compact mode', () => {
        const { container } = render(<WordCountBar current={500} target={1000} compact />);
        // Compact mode renders a <span> with the current word count
        const spans = container.querySelectorAll('span');
        const texts = Array.from(spans).map(s => s.textContent);
        expect(texts.some(t => t?.includes('500'))).toBe(true);
    });

    it('uses w-24 bar class in compact mode', () => {
        const { container } = render(<WordCountBar current={500} target={1000} compact />);
        const bar = container.querySelector('.wc-bar') as HTMLElement;
        expect(bar).toHaveClass('w-24');
    });

    it('uses w-full bar class in non-compact mode', () => {
        const { container } = render(<WordCountBar current={500} target={1000} />);
        const bar = container.querySelector('.wc-bar') as HTMLElement;
        expect(bar).toHaveClass('w-full');
    });

    // ── large numbers ─────────────────────────────────────────────────────────────

    it('formats large numbers with locale separators', () => {
        render(<WordCountBar current={80000} target={100000} />);
        expect(screen.getByText('80,000')).toBeInTheDocument();
        expect(screen.getByText('/ 100,000')).toBeInTheDocument();
    });

    it('calculates percentage correctly for partial progress (25%)', () => {
        const { container } = render(<WordCountBar current={250} target={1000} />);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        expect(fill.style.width).toBe('25%');
    });
});
