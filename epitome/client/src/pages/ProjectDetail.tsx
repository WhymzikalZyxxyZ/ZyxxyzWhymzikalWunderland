import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link }          from 'react-router-dom';
import { ArrowLeft, PenLine, Plus, Trash2, FileText } from 'lucide-react';
import { useState } from 'react';
import { api }      from '@/lib/api';
import type { Project, Page } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};

export function ProjectDetail() {
    const { id }    = useParams<{ id: string }>();
    const navigate  = useNavigate();
    const qc        = useQueryClient();
    const [delPage, setDelPage] = useState<string | null>(null);

    const { data: project } = useQuery<Project>({
        queryKey: ['project', id],
        queryFn:  () => api.get(`/projects/${id}`),
        enabled:  !!id,
    });

    const { data: pages = [] } = useQuery<Page[]>({
        queryKey: ['pages', id],
        queryFn:  () => api.get(`/projects/${id}/pages`),
        enabled:  !!id,
    });

    const deletePage = useMutation({
        mutationFn: (pageId: string) => api.delete(`/projects/${id}/pages/${pageId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pages', id] });
            qc.invalidateQueries({ queryKey: ['project', id] });
            qc.invalidateQueries({ queryKey: ['project-stats'] });
            setDelPage(null);
        },
    });

    async function openToday() {
        try {
            const page = await api.post<Page>(`/projects/${id}/pages/today`, {});
            navigate(`/write/${id}/${page.id}`);
        } catch (err) {
            alert((err as Error).message ?? 'Could not open today\'s page. Please try again.');
        }
    }

    const fmtDate = (d: string) =>
        new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const preview = (html: string) =>
        html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);

    if (!project) return <div className="text-ep-muted text-center py-20">Loading…</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/projects" className="inline-flex items-center gap-1.5 text-ep-muted hover:text-ep-rose text-sm mb-6 transition-colors">
                <ArrowLeft size={14} /> Back to Projects
            </Link>

            {/* Project header */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 mb-6 shadow-ep-card">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`badge badge-${project.status}`}>{STATUS_LABEL[project.status]}</span>
                            <span className="text-ep-muted text-xs capitalize">{project.type.replace('_', ' ')}</span>
                        </div>
                        <h1 className="font-display font-black text-3xl text-ep-text mb-2">{project.title}</h1>
                        {project.blurb && <p className="text-ep-text-dim text-sm">{project.blurb}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-ep-rose font-display font-black text-2xl">
                            {project.totalWords >= 1000
                                ? `${(project.totalWords / 1000).toFixed(1)}k`
                                : project.totalWords}
                        </div>
                        <div className="text-ep-muted text-xs">words total</div>
                    </div>
                </div>

                {project.targetWordCount && (
                    <div className="mt-4">
                        <div className="wc-bar">
                            <div
                                className={`wc-bar-fill ${project.totalWords >= project.targetWordCount ? 'over' : ''}`}
                                style={{ width: `${Math.min(100, (project.totalWords / project.targetWordCount) * 100)}%` }}
                            />
                        </div>
                        <p className="text-ep-muted text-xs mt-1">
                            {Math.round((project.totalWords / project.targetWordCount) * 100)}% of {project.targetWordCount.toLocaleString()} word goal
                        </p>
                    </div>
                )}
            </div>

            {/* Pages */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display font-bold text-lg text-ep-text flex items-center gap-2">
                        <FileText size={18} className="text-ep-rose" />
                        Writing Sessions <span className="text-ep-muted font-normal text-base">({pages.length})</span>
                    </h2>
                    <button onClick={openToday} className="btn-primary py-1.5 px-3 text-sm">
                        <Plus size={14} /> Today's Page
                    </button>
                </div>

                {pages.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-ep-muted text-sm mb-4">No writing sessions yet.</p>
                        <button onClick={openToday} className="btn-primary">Open Today's Page</button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {[...pages].reverse().map(p => (
                            <div key={p.id} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-ep-bg border border-ep-border hover:border-ep-border-hi transition-all">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-ep-rose font-semibold text-sm">{fmtDate(p.pageDate)}</span>
                                        <span className="text-ep-muted text-xs">{p.wordCount} words</span>
                                    </div>
                                    {p.content && (
                                        <p className="text-ep-text-dim text-sm line-clamp-2 font-display">
                                            {preview(p.content)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button onClick={() => navigate(`/write/${id}/${p.id}`)} className="btn-ghost py-1.5 px-2.5 text-xs">
                                        <PenLine size={13} /> Edit
                                    </button>
                                    <button onClick={() => setDelPage(p.id)} className="btn-danger py-1.5 px-2.5 text-xs">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {delPage && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Delete Page?</h3>
                        <p className="text-ep-muted text-sm mb-6">This writing session will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button className="btn-ghost flex-1" onClick={() => setDelPage(null)}>Cancel</button>
                            <button className="btn-danger flex-1" onClick={() => deletePage.mutate(delPage)} disabled={deletePage.isPending}>
                                {deletePage.isPending ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
