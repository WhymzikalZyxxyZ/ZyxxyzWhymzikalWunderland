import { useState } from 'react';
import { Link }     from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, BookMarked, BookOpen } from 'lucide-react';
import { api }             from '@/lib/api';
import type { Series, Project } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};

export function SeriesPage() {
    const qc = useQueryClient();

    const [creating, setCreating]       = useState(false);
    const [createForm, setCreateForm]   = useState({ name: '', description: '' });
    const [editId, setEditId]           = useState<string | null>(null);
    const [editForm, setEditForm]       = useState({ name: '', description: '' });
    const [deleteId, setDeleteId]       = useState<string | null>(null);

    const { data: seriesList = [], isLoading } = useQuery<Series[]>({
        queryKey: ['series'],
        queryFn:  () => api.get('/series'),
    });

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn:  () => api.get('/projects'),
    });

    const createMut = useMutation({
        mutationFn: (body: { name: string; description?: string }) =>
            api.post<Series>('/series', body),
        onSuccess: (s) => {
            qc.setQueryData<Series[]>(['series'], prev => [...(prev ?? []), s]);
            setCreating(false);
            setCreateForm({ name: '', description: '' });
        },
    });

    const patchMut = useMutation({
        mutationFn: ({ id, ...body }: { id: string; name: string; description?: string }) =>
            api.patch<Series>(`/series/${id}`, body),
        onSuccess: (s) => {
            qc.setQueryData<Series[]>(['series'], prev => prev?.map(x => x.id === s.id ? s : x) ?? []);
            setEditId(null);
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api.delete(`/series/${id}`),
        onSuccess: (_, id) => {
            qc.setQueryData<Series[]>(['series'], prev => prev?.filter(x => x.id !== id) ?? []);
            qc.invalidateQueries({ queryKey: ['projects'] });
            setDeleteId(null);
        },
    });

    function startEdit(s: Series) {
        setEditId(s.id);
        setEditForm({ name: s.name, description: s.description ?? '' });
    }

    function submitCreate() {
        const name = createForm.name.trim();
        if (!name) return;
        createMut.mutate({ name, description: createForm.description.trim() || undefined });
    }

    function submitEdit() {
        if (!editId) return;
        const name = editForm.name.trim();
        if (!name) return;
        patchMut.mutate({ id: editId, name, description: editForm.description.trim() || undefined });
    }

    if (isLoading) return (
        <div className="text-ep-muted text-center py-20">Gathering your worlds…</div>
    );

    const projectsBySeries = projects.reduce<Record<string, Project[]>>((acc, p) => {
        if (p.seriesId) (acc[p.seriesId] ??= []).push(p);
        return acc;
    }, {});

    const deleteTarget = seriesList.find(s => s.id === deleteId);

    return (
        <div className="max-w-2xl mx-auto space-y-6">

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-black text-2xl text-ep-text">Series</h1>
                    <p className="text-ep-muted text-sm mt-0.5">Your connected universes and multi-book arcs.</p>
                </div>
                {!creating && (
                    <button className="btn-primary py-2 px-4 text-sm" onClick={() => setCreating(true)}>
                        <Plus size={15} /> New Series
                    </button>
                )}
            </div>

            {/* Create form */}
            {creating && (
                <div className="bg-ep-surface border border-ep-rose/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-display font-bold text-ep-text">Name your new world</h2>
                        <button className="btn-ghost p-1.5" onClick={() => { setCreating(false); setCreateForm({ name: '', description: '' }); }}>
                            <X size={15} />
                        </button>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Series Name</label>
                        <input
                            className="input-base"
                            autoFocus
                            placeholder="e.g. The Ashwood Chronicles"
                            value={createForm.name}
                            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && submitCreate()}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">
                            Description <span className="normal-case text-ep-muted font-normal">(optional)</span>
                        </label>
                        <textarea
                            className="input-base resize-none"
                            rows={2}
                            placeholder="What ties these books together…"
                            value={createForm.description}
                            onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button className="btn-ghost flex-1" onClick={() => { setCreating(false); setCreateForm({ name: '', description: '' }); }}>
                            Cancel
                        </button>
                        <button
                            className="btn-primary flex-1"
                            disabled={!createForm.name.trim() || createMut.isPending}
                            onClick={submitCreate}
                        >
                            {createMut.isPending ? 'Creating…' : 'Create Series'}
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {seriesList.length === 0 && !creating && (
                <div className="text-center py-16">
                    <BookMarked size={40} className="text-ep-border mx-auto mb-4" />
                    <p className="text-ep-muted">No series yet — some stories span more than one book.</p>
                    <button className="btn-primary mt-5 py-2 px-5 text-sm" onClick={() => setCreating(true)}>
                        <Plus size={15} /> Start a Series
                    </button>
                </div>
            )}

            {/* Series cards */}
            <div className="space-y-4">
                {seriesList.map(s => {
                    const seriesProjects = (projectsBySeries[s.id] ?? [])
                        .slice()
                        .sort((a, b) => (a.seriesNumber ?? 9999) - (b.seriesNumber ?? 9999));
                    const isEditing = editId === s.id;

                    return (
                        <div key={s.id} className="bg-ep-surface border border-ep-border rounded-2xl p-5">
                            {isEditing ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Series Name</label>
                                        <input
                                            className="input-base"
                                            autoFocus
                                            value={editForm.name}
                                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && submitEdit()}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Description</label>
                                        <textarea
                                            className="input-base resize-none"
                                            rows={2}
                                            value={editForm.description}
                                            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button className="btn-ghost flex-1" onClick={() => setEditId(null)}>Cancel</button>
                                        <button
                                            className="btn-primary flex-1"
                                            disabled={!editForm.name.trim() || patchMut.isPending}
                                            onClick={submitEdit}
                                        >
                                            {patchMut.isPending ? 'Saving…' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="font-display font-bold text-lg text-ep-text">{s.name}</h2>
                                            {s.description && (
                                                <p className="text-ep-muted text-sm mt-1">{s.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                className="btn-ghost p-2"
                                                title="Edit series"
                                                onClick={() => startEdit(s)}
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                className="btn-ghost p-2 hover:text-ep-danger"
                                                title="Delete series"
                                                onClick={() => setDeleteId(s.id)}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {seriesProjects.length > 0 ? (
                                        <div className="mt-4">
                                            <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">
                                                {seriesProjects.length} {seriesProjects.length === 1 ? 'Book' : 'Books'}
                                            </p>
                                            <div className="space-y-1">
                                                {seriesProjects.map(p => (
                                                    <Link
                                                        key={p.id}
                                                        to={`/projects/${p.id}`}
                                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-ep-surface-2 transition-colors group"
                                                    >
                                                        {p.seriesNumber != null && (
                                                            <span className="text-xs text-ep-rose font-mono font-bold w-5 shrink-0 text-center">
                                                                #{p.seriesNumber}
                                                            </span>
                                                        )}
                                                        <BookOpen size={13} className="text-ep-muted shrink-0" />
                                                        <span className="text-sm text-ep-text group-hover:text-ep-rose transition-colors flex-1 truncate">
                                                            {p.title}
                                                        </span>
                                                        <span className="text-xs text-ep-muted shrink-0">{STATUS_LABEL[p.status] ?? p.status}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-ep-muted text-xs">
                                            No books assigned yet — open a project's Overview tab to place it in this series.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Delete confirmation modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Dissolve this series?</h3>
                        <p className="text-ep-muted text-sm mb-6">
                            <strong className="text-ep-text">{deleteTarget?.name}</strong> will be removed as a series.
                            The books inside won't be deleted — they'll simply be unbound from this arc.
                        </p>
                        <div className="flex gap-3">
                            <button className="btn-ghost flex-1" onClick={() => setDeleteId(null)}>Keep It</button>
                            <button
                                className="btn-danger flex-1"
                                disabled={deleteMut.isPending}
                                onClick={() => deleteMut.mutate(deleteId)}
                            >
                                {deleteMut.isPending ? 'Dissolving…' : 'Dissolve Series'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
