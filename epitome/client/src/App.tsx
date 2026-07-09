import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider }                from '@tanstack/react-query';
import { AuthProvider, useAuth }    from '@/contexts/AuthContext';
import { SettingsProvider }         from '@/contexts/SettingsContext';
import { Layout }                   from '@/components/Layout';
import { Auth }                   from '@/pages/Auth';
import { Dashboard }              from '@/pages/Dashboard';
import { Projects }               from '@/pages/Projects';
import { ProjectDetail }          from '@/pages/ProjectDetail';
import { SeriesPage }             from '@/pages/SeriesPage';
import { EventsPage }             from '@/pages/EventsPage';
import { WritingPad }             from '@/pages/WritingPad';
import { Settings }               from '@/pages/Settings';

const qc = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
    return (
        <QueryClientProvider client={qc}>
            <AuthProvider>
                <SettingsProvider>
                    <BrowserRouter>
                        <AppRoutes />
                    </BrowserRouter>
                </SettingsProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen bg-ep-bg flex items-center justify-center">
            <div className="text-ep-muted text-sm animate-pulse">Loading…</div>
        </div>
    );

    if (!user) return (
        <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="*"    element={<Navigate to="/auth" replace />} />
        </Routes>
    );

    return (
        <Routes>
            {/* Full-screen writing pad — no nav chrome */}
            <Route path="/write/:projectId/:chapterId" element={<WritingPad />} />

            {/* Shell with nav */}
            <Route element={<Layout />}>
                <Route index                 element={<Dashboard />} />
                <Route path="/projects"      element={<Projects />} />
                <Route path="/projects/:id"  element={<ProjectDetail />} />
                <Route path="/series"        element={<SeriesPage />} />
                <Route path="/events"        element={<EventsPage />} />
                <Route path="/settings"      element={<Settings />} />
                <Route path="/auth"          element={<Navigate to="/" replace />} />
                <Route path="*"              element={<NotFound />} />
            </Route>
        </Routes>
    );
}

function NotFound() {
    return (
        <div className="text-center py-32">
            <div className="font-display text-7xl font-black text-ep-border mb-4">404</div>
            <p className="text-ep-muted">This page doesn't exist.</p>
        </div>
    );
}

export { Outlet };
