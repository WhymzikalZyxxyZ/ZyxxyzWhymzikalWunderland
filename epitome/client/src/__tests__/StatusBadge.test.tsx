import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/StatusBadge';
import type { ProjectStatus } from '../lib/types';

describe('StatusBadge', () => {
    const CASES: { status: ProjectStatus; label: string }[] = [
        { status: 'concept',   label: 'Concept'   },
        { status: 'drafting',  label: 'Drafting'  },
        { status: 'revising',  label: 'Revising'  },
        { status: 'querying',  label: 'Querying'  },
        { status: 'on_hold',   label: 'On Hold'   },
        { status: 'published', label: 'Published' },
    ];

    for (const { status, label } of CASES) {
        it(`renders the "${label}" label for status "${status}"`, () => {
            render(<StatusBadge status={status} />);
            expect(screen.getByText(label)).toBeInTheDocument();
        });

        it(`applies the CSS class "badge-${status}" for status "${status}"`, () => {
            render(<StatusBadge status={status} />);
            const badge = screen.getByText(label);
            expect(badge).toHaveClass(`badge-${status}`);
        });

        it(`renders a <span> element for status "${status}"`, () => {
            render(<StatusBadge status={status} />);
            const badge = screen.getByText(label);
            expect(badge.tagName.toLowerCase()).toBe('span');
        });
    }

    it('always applies the base "badge" class alongside the status-specific class', () => {
        render(<StatusBadge status="drafting" />);
        const badge = screen.getByText('Drafting');
        expect(badge).toHaveClass('badge');
        expect(badge).toHaveClass('badge-drafting');
    });
});
