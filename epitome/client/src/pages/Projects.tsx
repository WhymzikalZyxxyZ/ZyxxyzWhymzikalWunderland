import { useState, FormEvent }  from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate }           from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, X, BookOpen } from 'lucide-react';
import { api }                   from '@/lib/api';
import type { Project }          from '@/lib/types';

const PROJECT_TYPES    = ['novel', 'novella', 'short_story', 'essay', 'poetry'] as const;
const PROJECT_STATUSES = ['concept', 'drafting', 'revising', 'querying', 'on_hold', 'published'] as const;

const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};

const TYPE_LABEL: Record<string, string> = {
    novel: 'Novel', novella: 'Novella', short_story: 'Short Story',
    essay: 'Essay', poetry: 'Poetry',
};

export function Projects() {
    const navigate     = useNavigate();
    const qc           = useQueryClient();
    const [modal, setModal]       = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const { data: projects = [], isLoading } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn:  () => api.get('/projects'),
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

    const deleteMut = useMutation({
        mutationFn: (id: string) => api.delete(`/projects/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects'] });
            qc.invalidateQueries({ queryKey: ['project-stats'] });
            setDeleting(null);
        },
    });

    function handleEdit(projectId: string) {
        navigate(`/projects/${projectId}`);
    }

    const fmtWords = (n: number) =>
        n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="font-display font-black text-3xl text-ep-text mb-1">Projects</h1>
                    <p className="text-ep-muted text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setModal(true)} className="btn-primary">
                    <Plus size={16} /> New Project
                </button>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="text-ep-muted text-center py-20">Loading…</div>
            ) : projects.length === 0 ? (
                <div className="text-center py-24 bg-ep-surface border border-ep-border rounded-2xl">
                    <BookOpen size={48} className="text-ep-border mx-auto mb-4" />
                    <p className="text-ep-muted mb-2">No projects yet.</p>
                    <p className="text-ep-text-dim text-sm mb-6">Every great story starts with a single word.</p>
                    <button onClick={() => setModal(true)} className="btn-primary">
                        Create Your First Project
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {projects.map(p => (
                        <ProjectRow
                            key={p.id}
                            project={p}
                            onRead={() => navigate(`/projects/${p.id}`)}
                            onEdit={() => handleEdit(p.id)}
                            onDelete={() => setDeleting(p.id)}
                            fmtWords={fmtWords}
                        />
                    ))}
                </div>
            )}

            {/* Create modal */}
            {modal && <CreateModal onClose={() => setModal(false)} onSubmit={body => createMut.mutate(body)} busy={createMut.isPending} error={createMut.error?.message} />}

            {/* Delete confirm */}
            {deleting && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Delete Project?</h3>
                        <p className="text-ep-muted text-sm mb-6">
                            This will permanently delete the project and all its pages. This cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button className="btn-ghost flex-1" onClick={() => setDeleting(null)}>Cancel</button>
                            <button
                                className="btn-danger flex-1"
                                onClick={() => deleteMut.mutate(deleting)}
                                disabled={deleteMut.isPending}
                            >
                                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProjectRow({ project: p, onRead, onEdit, onDelete, fmtWords }: {
    project: Project;
    onRead: () => void;
    onEdit: () => void;
    onDelete: () => void;
    fmtWords: (n: number) => string;
}) {
    const pct = p.targetWordCount > 0 ? Math.min(100, (p.totalWords / p.targetWordCount) * 100) : 0;

    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl p-5 hover:border-ep-border-hi transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`badge badge-${p.status}`}>{STATUS_LABEL[p.status]}</span>
                        <span className="text-ep-muted text-xs capitalize">{TYPE_LABEL[p.type] ?? p.type}</span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-ep-text group-hover:text-ep-rose transition-colors truncate">
                        {p.title}
                    </h3>
                    {p.blurb && <p className="text-ep-text-dim text-sm mt-1 line-clamp-1">{p.blurb}</p>}

                    <div className="mt-3 flex items-center gap-4">
                        <span className="text-ep-rose font-semibold text-sm">{fmtWords(p.totalWords)} words</span>
                        {p.targetWordCount && (
                            <div className="flex-1 max-w-40">
                                <div className="wc-bar">
                                    <div className={`wc-bar-fill ${pct >= 100 ? 'over' : ''}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-ep-muted text-xs">{pct.toFixed(0)}% of {fmtWords(p.targetWordCount)}</span>
                            </div>
                        )}
                        <span className="text-ep-muted text-xs">
                            Updated {new Date(p.updatedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={onRead} className="btn-ghost" title="Read">
                        <Eye size={15} /> <span className="hidden sm:inline">Read</span>
                    </button>
                    <button onClick={onEdit} className="btn-ghost" title="Edit">
                        <Pencil size={15} /> <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button onClick={onDelete} className="btn-danger" title="Delete">
                        <Trash2 size={15} /> <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateModal({ onClose, onSubmit, busy, error }: {
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
            <div
                className="bg-ep-surface border border-ep-border rounded-2xl p-7 w-full max-w-md shadow-ep-glow"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-display font-bold text-xl text-ep-text">New Project</h2>
                    <button onClick={onClose} className="text-ep-muted hover:text-ep-text"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1.5">Title *</label>
                        <input className="input-base" value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled Work" required />
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

                    {error && (
                        <p className="text-ep-danger text-sm bg-ep-danger/10 border border-ep-danger/25 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary flex-1" disabled={busy}>
                            {busy ? 'Creating…' : 'Create & Write'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
