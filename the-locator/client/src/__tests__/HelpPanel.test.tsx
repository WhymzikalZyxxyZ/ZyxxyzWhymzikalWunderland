import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HelpPanel from '../components/HelpPanel';

describe('HelpPanel', () => {
    it('renders the headline', () => {
        render(<HelpPanel />);
        expect(screen.getByText('The surface is just the beginning.')).toBeInTheDocument();
    });

    it('renders usage instructions', () => {
        render(<HelpPanel />);
        expect(screen.getByText(/Search any address, city, or ZIP/)).toBeInTheDocument();
    });
});
