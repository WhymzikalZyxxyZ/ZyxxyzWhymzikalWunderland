import { useState, FormEvent }  from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link }     from 'react-router-dom';
import {
    BookOpen, PenLine, Award, Clock, Plus, ArrowRight,
    BarChart3, DollarSign, CheckCircle2, Circle, X,
} from 'lucide-react';
import { api }          from '@/lib/api';
import { useAuth }      from '@/contexts/AuthContext';
import { StatusBadge }  from '@/components/StatusBadge';
import type { ProjectStats, Project, Chapter, Commission } from '@/lib/types';

type Tab = 'projects' | 'drafting' | 'new-chapter' | 'marketing' | 'sales';

const TABS: { id: Tab; label: string }[] = [
    { id: 'projects',    label: 'Projects'      },
    { id: 'drafting',    label: 'Drafting'      },
    { id: 'new-chapter', label: '+ New Chapter' },
    { id: 'marketing',   label: 'Marketing'     },
    { id: 'sales',       label: 'Production'    },
];

const PROJECT_TYPES    = ['novel', 'novella', 'short_story', 'essay', 'poetry'] as const;
const PROJECT_STATUSES = ['concept', 'drafting', 'revising', 'querying', 'on_hold', 'published'] as const;
const TYPE_LABEL: Record<string, string> = {
    novel: 'Novel', novella: 'Novella', short_story: 'Short Story', essay: 'Essay', poetry: 'Poetry',
};
const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};

export function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const qc       = useQueryClient();
    const [tab, setTab]     = useState<Tab>('projects');
    const [modal, setModal] = useState(false);

    const { data: stats }            = useQuery<ProjectStats>({ queryKey: ['project-stats'], queryFn: () => api.get('/projects/stats') });
    const { data: projects = [], isLoading: projLoading } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => api.get('/projects') });
    const { data: chapters = [] }    = useQuery<Chapter[]>({
        queryKey: ['all-chapters'],
        queryFn:  () => api.get('/chapters'),
        enabled:  tab === 'drafting',
    });
    const { data: commissions = [] } = useQuery<Commission[]>({
        queryKey: ['all-commissions'],
        queryFn:  () => api.get('/commissions'),
        enabled:  tab === 'sales',
    });

    const createMut = useMutation({
        mutationFn: (body: object) => api.post<{ project: Project }>('/projects', body),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['projects'] });
            qc.invalidateQueries({ queryKey: ['project-stats'] });
            setModal(false);
            navigate(`/projects/${data.project.id}`);
        },
    });

    const fmtWords = (n: number | undefined) =>
        n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome */}
            <div className="relative overflow-hidden rounded-2xl bg-ep-surface border border-ep-border px-8 py-8 shadow-ep-card">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-ep-rose opacity-5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-12 -left-12 w-56 h-56 bg-ep-plum opacity-5 rounded-full blur-3xl" />
                </div>
                <p className="text-ep-text-dim text-xs uppercase tracking-widest font-semibold mb-1.5">Welcome back</p>
                <h1 className="font-display font-black text-4xl text-ep-text">{user?.username}</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<BookOpen size={18} />} label="Projects"   value={String(stats?.total ?? 0)} />
                <StatCard icon={<PenLine  size={18} />} label="Total Words" value={fmtWords(stats?.totalWords)} accent />
                <StatCard icon={<Clock    size={18} />} label="In Progress" value={String((stats?.drafting ?? 0) + (stats?.revising ?? 0))} />
                <StatCard icon={<Award    size={18} />} label="Published"   value={String(stats?.published ?? 0)} />
            </div>

            {/* Tabbed workspace */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl overflow-hidden shadow-ep-card">
                <div className="flex border-b border-ep-border overflow-x-auto scrollbar-none">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px shrink-0 ${
                                tab === t.id
                                    ? 'border-ep-rose text-ep-rose bg-ep-bg/50'
                                    : 'border-transparent text-ep-muted hover:text-ep-text'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {tab === 'projects' && (
                        <ProjectsTab
                            projects={projects}
                            loading={projLoading}
                            fmtWords={fmtWords}
                            onNew={() => setModal(true)}
                        />
                    )}
                    {tab === 'drafting' && (
                        <DraftingTab chapters={chapters} projectMap={projectMap} navigate={navigate} />
                    )}
                    {tab === 'new-chapter' && (
                        <NewChapterTab projects={projects} navigate={navigate} qc={qc} />
                    )}
                    {tab === 'marketing' && (
                        <MarketingTab projects={projects} navigate={navigate} />
                    )}
                    {tab === 'sales' && (
                        <SalesTab commissions={commissions} projectMap={projectMap} />
                    )}
                </div>
            </div>

            {modal && (
                <CreateProjectModal
                    onClose={() => setModal(false)}
                    onSubmit={body => createMut.mutate(body)}
                    busy={createMut.isPending}
                    error={createMut.error?.message}
                />
            )}
        </div>
    );
}

// ── Projects tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ projects, loading, fmtWords, onNew }: {
    projects: Project[]; loading: boolean;
    fmtWords: (n: number) => string; onNew: () => void;
}) {
    const navigate = useNavigate();
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <p className="text-ep-muted text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                <button onClick={onNew} className="btn-primary py-1.5 px-3 text-sm">
                    <Plus size={14} /> New Project
                </button>
            </div>
            {loading ? (
                <p className="text-ep-muted text-sm text-center py-8">Loading…</p>
            ) : projects.length === 0 ? (
                <div className="text-center py-12">
                    <BookOpen size={40} className="text-ep-border mx-auto mb-3" />
                    <p className="text-ep-muted text-sm mb-4">No projects yet. Your story begins here.</p>
                    <button onClick={onNew} className="btn-primary">Start Your First Project</button>
                </div>
            ) : (
                <div className="space-y-2">
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => navigate(`/projects/${p.id}`)}
                            className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-ep-bg border border-ep-border hover:border-ep-border-hi hover:bg-ep-surface-2 transition-all group text-left"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <StatusBadge status={p.status} />
                                <div className="min-w-0">
                                    <p className="text-ep-text font-medium truncate group-hover:text-ep-rose transition-colors">{p.title}</p>
                                    <p className="text-ep-muted text-xs">{TYPE_LABEL[p.type] ?? p.type}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <span className="text-ep-text-dim text-sm">{fmtWords(p.totalWords)} words</span>
                                <ArrowRight size={14} className="text-ep-border group-hover:text-ep-rose transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Drafting tab ──────────────────────────────────────────────────────────────

function DraftingTab({ chapters, projectMap, navigate }: {
    chapters: Chapter[];
    projectMap: Record<string, Project>;
    navigate: ReturnType<typeof useNavigate>;
}) {
    if (chapters.length === 0) {
        return (
            <div className="text-center py-12">
                <PenLine size={40} className="text-ep-border mx-auto mb-3" />
                <p className="text-ep-muted text-sm">No chapters yet.</p>
                <p className="text-ep-text-dim text-xs mt-1">Use the New Chapter tab to start writing.</p>
            </div>
        );
    }

    const grouped: Record<string, Chapter[]> = {};
    for (const ch of chapters) {
        (grouped[ch.projectId] ??= []).push(ch);
    }

    return (
        <div className="space-y-6">
            {Object.entries(grouped).map(([projectId, chs]) => {
                const project = projectMap[projectId];
                return (
                    <div key={projectId}>
                        <div className="flex items-center justify-between mb-2">
                            <Link
                                to={`/projects/${projectId}`}
                                className="font-display font-bold text-ep-text hover:text-ep-rose transition-colors"
                            >
                                {project?.title ?? 'Unknown Project'}
                            </Link>
                            <span className="text-ep-muted text-xs">
                                {chs.reduce((s, c) => s + c.wordCount, 0).toLocaleString()} words across {chs.length} chapter{chs.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {[...chs].sort((a, b) => a.chapterNumber - b.chapterNumber).map(ch => (
                                <div key={ch.id} className="flex items-center gap-3 p-3 rounded-xl bg-ep-bg border border-ep-border hover:border-ep-border-hi transition-all">
                                    <span className="text-ep-rose text-xs font-bold w-8 shrink-0">Ch {ch.chapterNumber}</span>
                                    <span className="text-ep-text text-sm flex-1 truncate">{ch.title ?? <em className="text-ep-muted">Untitled</em>}</span>
                                    <span className="text-ep-muted text-xs shrink-0">{ch.wordCount.toLocaleString()} words</span>
                                    <button
                                        onClick={() => navigate(`/write/${ch.projectId}/${ch.id}`)}
                                        className="btn-ghost py-1 px-2.5 text-xs shrink-0"
                                    >
                                        <PenLine size={12} /> Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── New Chapter tab ───────────────────────────────────────────────────────────

function NewChapterTab({ projects, navigate, qc }: {
    projects: Project[];
    navigate: ReturnType<typeof useNavigate>;
    qc: ReturnType<typeof useQueryClient>;
}) {
    const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
    const [title, setTitle]         = useState('');

    const createMut = useMutation({
        mutationFn: ({ pid, title }: { pid: string; title?: string }) =>
            api.post<Chapter>(`/projects/${pid}/chapters`, { title: title || undefined }),
        onSuccess: (chapter) => {
            qc.invalidateQueries({ queryKey: ['chapters', chapter.projectId] });
            qc.invalidateQueries({ queryKey: ['all-chapters'] });
            navigate(`/write/${chapter.projectId}/${chapter.id}`);
        },
    });

    if (projects.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-ep-muted text-sm mb-4">Create a project first before adding chapters.</p>
                <Link to="/projects" className="btn-primary">Go to Projects</Link>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto py-6">
            <h3 className="font-display font-bold text-xl text-ep-text mb-6">Start a New Chapter</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Project *</label>
                    <select
                        className="input-base"
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">
                        Chapter Title <span className="font-normal normal-case text-ep-muted">(optional)</span>
                    </label>
                    <input
                        className="input-base"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. The First Night"
                        onKeyDown={e => e.key === 'Enter' && projectId && createMut.mutate({ pid: projectId, title: title || undefined })}
                    />
                </div>
                <button
                    className="btn-primary w-full"
                    disabled={!projectId || createMut.isPending}
                    onClick={() => createMut.mutate({ pid: projectId, title: title || undefined })}
                >
                    {createMut.isPending ? 'Creating…' : 'Start Writing'}
                </button>
                {createMut.error && (
                    <p className="text-ep-danger text-sm">{createMut.error.message}</p>
                )}
            </div>
        </div>
    );
}

// ── Marketing tab ─────────────────────────────────────────────────────────────

function MarketingTab({ projects, navigate }: {
    projects: Project[];
    navigate: ReturnType<typeof useNavigate>;
}) {
    if (projects.length === 0) {
        return (
            <div className="text-center py-12">
                <BarChart3 size={40} className="text-ep-border mx-auto mb-3" />
                <p className="text-ep-muted text-sm">No projects yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {projects.map(p => (
                <div
                    key={p.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-ep-bg border border-ep-border"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <StatusBadge status={p.status} />
                        <span className="text-ep-text font-medium truncate">{p.title}</span>
                    </div>
                    <button
                        onClick={() => navigate(`/projects/${p.id}?tab=marketing`)}
                        className="btn-ghost py-1.5 px-3 text-xs shrink-0"
                    >
                        Marketing <ArrowRight size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}

// ── Sales tab ─────────────────────────────────────────────────────────────────

function SalesTab({ commissions, projectMap }: {
    commissions: Commission[];
    projectMap: Record<string, Project>;
}) {
    const fmtAmount = (cents: number | null) =>
        cents == null ? '—' : `$${(cents / 100).toFixed(2)}`;

    if (commissions.length === 0) {
        return (
            <div className="text-center py-12">
                <DollarSign size={40} className="text-ep-border mx-auto mb-3" />
                <p className="text-ep-muted text-sm">No commissions tracked yet.</p>
                <p className="text-ep-text-dim text-xs mt-1">Open a project to add commissions.</p>
            </div>
        );
    }

    const pending = commissions.filter(c => !c.done);
    const done    = commissions.filter(c =>  c.done);
    const total   = pending.reduce((s, c) => s + (c.amountCents ?? 0), 0);

    return (
        <div className="space-y-6">
            {total > 0 && (
                <div className="bg-ep-bg border border-ep-border rounded-xl p-4 flex items-center justify-between">
                    <span className="text-ep-muted text-sm">Outstanding</span>
                    <span className="text-ep-champagne font-display font-bold text-xl">{fmtAmount(total)}</span>
                </div>
            )}
            {pending.length > 0 && (
                <CommissionSection title={`Active (${pending.length})`} rows={pending} projectMap={projectMap} fmtAmount={fmtAmount} />
            )}
            {done.length > 0 && (
                <CommissionSection title={`Completed (${done.length})`} rows={done} projectMap={projectMap} fmtAmount={fmtAmount} dim />
            )}
        </div>
    );
}

function CommissionSection({ title, rows, projectMap, fmtAmount, dim }: {
    title: string;
    rows: Commission[];
    projectMap: Record<string, Project>;
    fmtAmount: (c: number | null) => string;
    dim?: boolean;
}) {
    return (
        <div>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dim ? 'text-ep-muted' : 'text-ep-text-dim'}`}>{title}</p>
            <div className="space-y-2">
                {rows.map(c => (
                    <div key={c.id} className={`p-3 rounded-xl border ${dim ? 'bg-ep-bg/50 border-ep-border opacity-60' : 'bg-ep-bg border-ep-border'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    {c.done
                                        ? <CheckCircle2 size={13} className="text-ep-muted shrink-0" />
                                        : <Circle       size={13} className="text-ep-rose shrink-0" />
                                    }
                                    <span className="text-ep-text text-sm font-medium truncate">{c.who}</span>
                                    <span className="text-ep-champagne text-xs font-semibold shrink-0">{fmtAmount(c.amountCents)}</span>
                                </div>
                                <p className="text-ep-text-dim text-xs pl-5 line-clamp-1">{c.description}</p>
                                {c.deadline && (
                                    <p className="text-ep-muted text-xs pl-5 mt-0.5">Due {c.deadline}</p>
                                )}
                            </div>
                            <Link
                                to={`/projects/${c.projectId}`}
                                className="text-ep-muted text-xs hover:text-ep-rose shrink-0 transition-colors"
                            >
                                {projectMap[c.projectId]?.title ?? '—'}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Shared components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }: {
    icon: React.ReactNode; label: string; value: string; accent?: boolean;
}) {
    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl p-5 shadow-ep-card">
            <div className={`mb-3 ${accent ? 'text-ep-champagne' : 'text-ep-rose'}`}>{icon}</div>
            <div className={`font-display font-black text-3xl mb-1 ${accent ? 'text-ep-champagne' : 'text-ep-text'}`}>{value}</div>
            <div className="text-ep-muted text-xs uppercase tracking-widest font-semibold">{label}</div>
        </div>
    );
}

function CreateProjectModal({ onClose, onSubmit, busy, error }: {
    onClose: () => void;
    onSubmit: (body: object) => void;
    busy: boolean;
    error?: string;
}) {
    const [title,  setTitle]  = useState('');
    const [type,   setType]   = useState('novel');
    const [status, setStatus] = useState('drafting');
    const [target, setTarget] = useState('');

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        onSubmit({ title, type, status, targetWordCount: target ? parseInt(target) : undefined });
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-7 w-full max-w-md shadow-ep-glow" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-xl text-ep-text">New Project</h2>
                    <button onClick={onClose} className="text-ep-muted hover:text-ep-text transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Title *</label>
                        <input className="input-base" value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled Work" required autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Type *</label>
                            <select className="input-base" value={type} onChange={e => setType(e.target.value)}>
                                {PROJECT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Status</label>
                            <select className="input-base" value={status} onChange={e => setStatus(e.target.value)}>
                                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Target Word Count</label>
                        <input className="input-base" type="number" min="1" value={target} onChange={e => setTarget(e.target.value)} placeholder="e.g. 80000" />
                    </div>
                    {error && <p className="text-ep-danger text-sm bg-ep-danger/10 border border-ep-danger/25 rounded-lg px-3 py-2">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary flex-1" disabled={busy}>
                            {busy ? 'Creating…' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

