import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Library, CalendarDays, Settings, LogOut } from 'lucide-react';
import { AppLogo }  from './AppLogo';
import { useAuth }  from '@/contexts/AuthContext';

export function Layout() {
    const { pathname }      = useLocation();
    const { user, logout }  = useAuth();
    const navigate          = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/auth');
    }

    return (
        <div className="min-h-screen flex flex-col bg-ep-bg">
            <header className="bg-ep-surface border-b border-ep-border sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <AppLogo size="sm" />
                    </Link>

                    <nav className="flex items-center gap-1">
                        <NavLink to="/"         label="Dashboard" icon={<LayoutDashboard size={16} />} active={pathname === '/'} />
                        <NavLink to="/projects" label="Projects"  icon={<BookOpen size={16} />}        active={pathname.startsWith('/projects')} />
                        <NavLink to="/series"   label="Series"    icon={<Library size={16} />}         active={pathname.startsWith('/series')} />
                        <NavLink to="/events"   label="Events"    icon={<CalendarDays size={16} />}    active={pathname.startsWith('/events')} />
                        <NavLink to="/settings" label="Atelier"   icon={<Settings size={16} />}         active={pathname.startsWith('/settings')} />
                    </nav>

                    <div className="flex items-center gap-3">
                        <span className="text-ep-text-dim text-xs hidden sm:block">{user?.username}</span>
                        <button onClick={handleLogout} className="btn-ghost py-1.5 px-3 text-xs" title="Sign out">
                            <LogOut size={13} /> <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}

function NavLink({ to, label, icon, active }: { to: string; label: string; icon: React.ReactNode; active: boolean }) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                active
                    ? 'bg-ep-surface-2 text-ep-rose'
                    : 'text-ep-muted hover:text-ep-text hover:bg-ep-surface-2'
            }`}
        >
            {icon}
            {label}
        </Link>
    );
}
