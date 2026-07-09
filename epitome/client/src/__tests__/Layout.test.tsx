import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';

// ── Mock AuthContext ──────────────────────────────────────────────────────────

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user:    { userId: 'u1', username: 'testwriter', createdAt: '' },
        loading: false,
        login:   vi.fn(),
        signup:  vi.fn(),
        logout:  mockLogout,
    }),
}));

// ── Render helper ─────────────────────────────────────────────────────────────

function renderLayout(initialPath = '/') {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/"        element={<div>Dashboard Content</div>} />
                    <Route path="/projects" element={<div>Projects Content</div>} />
                    <Route path="/auth"    element={<div>Auth Page</div>} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Layout', () => {
    it('renders the EPI TOME logo', () => {
        renderLayout();
        expect(screen.getByText('EPI')).toBeInTheDocument();
        expect(screen.getByText('TOME')).toBeInTheDocument();
    });

    it('renders the Dashboard nav link', () => {
        renderLayout();
        expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    });

    it('renders the Projects nav link', () => {
        renderLayout();
        expect(screen.getByRole('link', { name: /Projects/ })).toBeInTheDocument();
    });

    it('renders the username in the header', () => {
        renderLayout();
        expect(screen.getByText('testwriter')).toBeInTheDocument();
    });

    it('renders the Sign Out button', () => {
        renderLayout();
        expect(screen.getByTitle('Sign out')).toBeInTheDocument();
    });

    it('calls logout and navigates to /auth when Sign Out is clicked', async () => {
        renderLayout();
        fireEvent.click(screen.getByTitle('Sign out'));
        expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('renders the Outlet (child route content)', () => {
        renderLayout('/');
        expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });

    it('applies active style to Dashboard link when on "/"', () => {
        renderLayout('/');
        const dashLink = screen.getByRole('link', { name: /Dashboard/ });
        expect(dashLink.className).toContain('text-ep-rose');
    });

    it('applies active style to Projects link when on "/projects"', () => {
        renderLayout('/projects');
        const projLink = screen.getByRole('link', { name: /Projects/ });
        expect(projLink.className).toContain('text-ep-rose');
    });

    it('applies inactive style to Dashboard link when on "/projects"', () => {
        renderLayout('/projects');
        const dashLink = screen.getByRole('link', { name: /Dashboard/ });
        expect(dashLink.className).toContain('text-ep-muted');
    });

    it('Dashboard link has href "/"', () => {
        renderLayout();
        const dashLink = screen.getByRole('link', { name: /Dashboard/ });
        expect(dashLink).toHaveAttribute('href', '/');
    });

    it('Projects link has href "/projects"', () => {
        renderLayout();
        const projLink = screen.getByRole('link', { name: /Projects/ });
        expect(projLink).toHaveAttribute('href', '/projects');
    });
});
