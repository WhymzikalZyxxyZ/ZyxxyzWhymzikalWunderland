import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectCard } from '../components/ProjectCard';
import type { Project } from '../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
    return {
        id:              'proj-1',
        userId:          'user-1',
        seriesId:        null,
        seriesNumber:    null,
        title:           'The Crimson Quill',
        type:            'novel',
        genreId:         null,
        status:          'drafting',
        blurb:           null,
        summary:         null,
        targetWordCount: 80000,
        totalWords:      12000,
        coverKey:        null,
        mainCoverKey:    null,
        altCoverKeys:    '[]',
        pubType:         null,
        createdAt:       '2025-01-01T00:00:00Z',
        updatedAt:       '2025-06-01T00:00:00Z',
        ...overrides,
    };
}

function renderCard(project: Project, extra: { seriesName?: string; genreName?: string } = {}) {
    return render(
        <MemoryRouter>
            <ProjectCard project={project} {...extra} />
        </MemoryRouter>,
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProjectCard', () => {
    // ── Title & status ────────────────────────────────────────────────────────

    it('renders the project title', () => {
        renderCard(makeProject());
        expect(screen.getByText('The Crimson Quill')).toBeInTheDocument();
    });

    it('renders the StatusBadge with correct label for the project status', () => {
        renderCard(makeProject({ status: 'revising' }));
        expect(screen.getByText('Revising')).toBeInTheDocument();
    });

    it('renders a link to /projects/:id', () => {
        renderCard(makeProject({ id: 'proj-99' }));
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/projects/proj-99');
    });

    // ── Cover image ───────────────────────────────────────────────────────────

    it('renders a fallback icon when neither coverKey nor mainCoverKey is set', () => {
        renderCard(makeProject({ coverKey: null, mainCoverKey: null }));
        // The BookOpen icon is rendered inside a div, no <img> element
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders an <img> when coverKey is set and mainCoverKey is null', () => {
        renderCard(makeProject({ coverKey: 'covers/my-cover.jpg', mainCoverKey: null }));
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/api/files/covers/my-cover.jpg');
    });

    it('prefers mainCoverKey over coverKey when both are set', () => {
        renderCard(makeProject({
            coverKey:     'covers/original.jpg',
            mainCoverKey: 'covers/main.jpg',
        }));
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/api/files/covers/main.jpg');
    });

    it('uses mainCoverKey when only mainCoverKey is set (no coverKey)', () => {
        renderCard(makeProject({ coverKey: null, mainCoverKey: 'covers/main-only.jpg' }));
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/api/files/covers/main-only.jpg');
    });

    it('img alt text matches the project title', () => {
        renderCard(makeProject({ mainCoverKey: 'covers/x.jpg', title: 'Alt Text Book' }));
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Alt Text Book');
    });

    // ── Type label ────────────────────────────────────────────────────────────

    it('renders "Novel" for type=novel', () => {
        renderCard(makeProject({ type: 'novel' }));
        expect(screen.getByText('Novel')).toBeInTheDocument();
    });

    it('renders "Short Story" for type=short_story', () => {
        renderCard(makeProject({ type: 'short_story' }));
        expect(screen.getByText('Short Story')).toBeInTheDocument();
    });

    it('renders "Essay" for type=essay', () => {
        renderCard(makeProject({ type: 'essay' }));
        expect(screen.getByText('Essay')).toBeInTheDocument();
    });

    it('renders "Poetry" for type=poetry', () => {
        renderCard(makeProject({ type: 'poetry' }));
        expect(screen.getByText('Poetry')).toBeInTheDocument();
    });

    it('renders "Novella" for type=novella', () => {
        renderCard(makeProject({ type: 'novella' }));
        expect(screen.getByText('Novella')).toBeInTheDocument();
    });

    // ── Optional metadata ────────────────────────────────────────────────────

    it('renders the series name when provided', () => {
        renderCard(makeProject(), { seriesName: 'The Wunderland Chronicles' });
        expect(screen.getByText(/The Wunderland Chronicles/)).toBeInTheDocument();
    });

    it('renders series number alongside series name when seriesNumber is set', () => {
        renderCard(makeProject({ seriesNumber: 2 }), { seriesName: 'My Series' });
        expect(screen.getByText(/Book 2/)).toBeInTheDocument();
    });

    it('does NOT render series number text when seriesNumber is null', () => {
        renderCard(makeProject({ seriesNumber: null }), { seriesName: 'My Series' });
        expect(screen.queryByText(/Book/)).not.toBeInTheDocument();
    });

    it('renders the genre name when provided', () => {
        renderCard(makeProject(), { genreName: 'Dark Fantasy' });
        expect(screen.getByText('Dark Fantasy')).toBeInTheDocument();
    });

    it('does not render series or genre metadata when not provided', () => {
        renderCard(makeProject());
        expect(screen.queryByText(/Book/)).not.toBeInTheDocument();
        expect(screen.queryByText('Dark Fantasy')).not.toBeInTheDocument();
    });

    // ── Blurb ─────────────────────────────────────────────────────────────────

    it('renders the blurb text when present', () => {
        renderCard(makeProject({ blurb: 'A tale of ink and shadows.' }));
        expect(screen.getByText('A tale of ink and shadows.')).toBeInTheDocument();
    });

    it('does not render blurb section when blurb is null', () => {
        renderCard(makeProject({ blurb: null }));
        expect(screen.queryByText(/tale/)).not.toBeInTheDocument();
    });

    // ── Word count bar ────────────────────────────────────────────────────────

    it('renders the WordCountBar component (compact mode) with the project\'s word counts', () => {
        const { container } = renderCard(makeProject({ totalWords: 12000, targetWordCount: 80000 }));
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        // 12000/80000 = 15%
        expect(fill.style.width).toBe('15%');
    });

    it('uses 50000 as default targetWordCount when targetWordCount is null/undefined', () => {
        const project = makeProject({ totalWords: 25000, targetWordCount: null as unknown as number });
        const { container } = renderCard(project);
        const fill = container.querySelector('.wc-bar-fill') as HTMLElement;
        // 25000/50000 = 50%
        expect(fill.style.width).toBe('50%');
    });
});
