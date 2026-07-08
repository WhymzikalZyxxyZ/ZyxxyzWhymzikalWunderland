import { useQuery }      from '@tanstack/react-query';
import { Link }           from 'react-router-dom';
import { BookOpen, PenLine, Award, Clock, Layers, ArrowRight } from 'lucide-react';
import { api }            from '@/lib/api';
import { useAuth }        from '@/contexts/AuthContext';
import type { ProjectStats, Project } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};

export function Dashboard() {
    const { user } = useAuth();

    const { data: stats } = useQuery<ProjectStats>({
        queryKey: ['project-stats'],
        queryFn:  () => api.get('/projects/stats'),
    });

    const { data: projects } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn:  () => api.get('/projects'),
    });

    const recent = projects?.slice(0, 5) ?? [];

    const fmtWords = (n: number | undefined) =>
        n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Welcome */}
            <div className="relative overflow-hidden rounded-2xl bg-ep-surface border border-ep-border px-8 py-10 shadow-ep-card">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-ep-rose opacity-5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-ep-plum opacity-5 rounded-full blur-3xl" />
                </div>
                <p className="text-ep-text-dim text-sm uppercase tracking-widest font-semibold mb-2">Welcome back</p>
                <h1 className="font-display font-black text-4xl text-ep-text mb-1">
                    {user?.username}
                </h1>
                <p className="text-ep-muted text-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen size={20} />} label="Total Projects" value={String(stats?.total ?? 0)} />
                <StatCard icon={<PenLine  size={20} />} label="Total Words"    value={fmtWords(stats?.totalWords)} accent />
                <StatCard icon={<Clock    size={20} />} label="In Progress"    value={String((stats?.drafting ?? 0) + (stats?.revising ?? 0))} />
                <StatCard icon={<Award    size={20} />} label="Published"      value={String(stats?.published ?? 0)} />
            </div>

            {/* Status breakdown */}
            {stats && stats.total > 0 && (
                <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                    <h2 className="font-display font-bold text-lg text-ep-text mb-5">Project Pipeline</h2>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {(['concept', 'drafting', 'revising', 'querying', 'on_hold', 'published'] as const).map(s => (
                            <div key={s} className="text-center p-3 rounded-xl bg-ep-bg border border-ep-border">
                                <div className="text-2xl font-bold text-ep-text mb-1">
                                    {(stats as unknown as Record<string, number>)[s] ?? 0}
                                </div>
                                <span className={`badge badge-${s}`}>{STATUS_LABEL[s]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent projects */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display font-bold text-lg text-ep-text flex items-center gap-2">
                        <Layers size={18} className="text-ep-rose" /> Recent Projects
                    </h2>
                    <Link to="/projects" className="text-ep-rose text-sm hover:text-ep-champagne flex items-center gap-1 transition-colors">
                        All projects <ArrowRight size={14} />
                    </Link>
                </div>

                {recent.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-ep-border text-6xl mb-4 font-display font-black">✦</div>
                        <p className="text-ep-muted text-sm mb-4">No projects yet. Your story begins here.</p>
                        <Link to="/projects" className="btn-primary">
                            Start Your First Project
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recent.map(p => (
                            <Link
                                key={p.id}
                                to={`/projects/${p.id}`}
                                className="flex items-center justify-between p-4 rounded-xl bg-ep-bg border border-ep-border hover:border-ep-border-hi hover:bg-ep-surface-2 transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`badge badge-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                                    <span className="text-ep-text font-medium truncate group-hover:text-ep-rose transition-colors">
                                        {p.title}
                                    </span>
                                    <span className="text-ep-muted text-xs capitalize hidden sm:block">
                                        {p.type.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <span className="text-ep-text-dim text-sm">{fmtWords(p.totalWords)} words</span>
                                    <ArrowRight size={14} className="text-ep-border group-hover:text-ep-rose transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, accent }: {
    icon: React.ReactNode; label: string; value: string; accent?: boolean;
}) {
    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl p-5 shadow-ep-card">
            <div className={`mb-3 ${accent ? 'text-ep-champagne' : 'text-ep-rose'}`}>{icon}</div>
            <div className={`font-display font-black text-3xl mb-1 ${accent ? 'text-ep-champagne' : 'text-ep-text'}`}>
                {value}
            </div>
            <div className="text-ep-muted text-xs uppercase tracking-widest font-semibold">{label}</div>
        </div>
    );
}
