import { useState, useEffect, useRef, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, PenLine, Plus, Trash2, X, BookOpen, Upload,
    CheckCircle2, Circle, FileText, Users, BarChart3, Calendar,
    BookMarked, Star, Image, ChevronDown, ChevronRight,
} from 'lucide-react';
import { StatusBadge }  from '@/components/StatusBadge';
import { WordCountBar } from '@/components/WordCountBar';
import { api }          from '@/lib/api';
import type {
    Project, Chapter, Character, CharacterImage, Commission,
    CompTitle, Publishing, PublishingSize, Distribution, ProjectArt, Series,
    InventoryListing, SalesRecord,
} from '@/lib/types';

type Tab = 'overview' | 'drafting' | 'characters' | 'marketing' | 'inventory' | 'publishing';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: 'Overview',   icon: <BookOpen   size={14} /> },
    { id: 'drafting',   label: 'Drafting',   icon: <PenLine    size={14} /> },
    { id: 'characters', label: 'Characters', icon: <Users      size={14} /> },
    { id: 'marketing',  label: 'Marketing',  icon: <BarChart3  size={14} /> },
    { id: 'inventory',  label: 'Inventory',  icon: <Calendar   size={14} /> },
    { id: 'publishing', label: 'Publishing', icon: <BookMarked size={14} /> },
];

const STATUS_LABEL: Record<string, string> = {
    concept: 'Concept', drafting: 'Drafting', revising: 'Revising',
    querying: 'Querying', on_hold: 'On Hold', published: 'Published',
};
const TYPE_LABEL: Record<string, string> = {
    novel: 'Novel', novella: 'Novella', short_story: 'Short Story', essay: 'Essay', poetry: 'Poetry',
};

export function ProjectDetail() {
    const { id }            = useParams<{ id: string }>();
    const navigate          = useNavigate();
    const qc                = useQueryClient();
    const [searchParams]    = useSearchParams();
    const initialTab        = (searchParams.get('tab') as Tab | null) ?? 'overview';
    const [tab, setTab]     = useState<Tab>(initialTab);
    const [showCommissions, setShowCommissions] = useState(false);
    const headerCoverRef    = useRef<HTMLInputElement>(null);
    const [headerUploading, setHeaderUploading] = useState(false);

    async function uploadHeaderCover(file: File) {
        setHeaderUploading(true);
        try {
            const fd  = new FormData(); fd.append('file', file);
            const res = await fetch(`/api/uploads/projects/${id}/cover`, { method: 'POST', body: fd, credentials: 'include' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Upload failed (${res.status})`);
            qc.invalidateQueries({ queryKey: ['project', id] });
        } finally {
            setHeaderUploading(false);
            if (headerCoverRef.current) headerCoverRef.current.value = '';
        }
    }

    const { data: project, isLoading } = useQuery<Project>({
        queryKey: ['project', id],
        queryFn:  () => api.get(`/projects/${id}`),
        enabled:  !!id,
    });

    if (isLoading) return <div className="text-ep-muted text-center py-20">Fetching your project…</div>;
    if (!project)  return <div className="text-ep-muted text-center py-20">This project slipped away — or never existed.</div>;

    const coverKey = project.mainCoverKey ?? project.coverKey;
    const coverUrl = coverKey ? `/api/files/${coverKey}` : null;

    return (
        <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-1.5 text-ep-muted hover:text-ep-rose text-sm mb-6 transition-colors">
                <ArrowLeft size={14} /> Back to Dashboard
            </Link>

            {/* Project header */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 mb-6 shadow-ep-card">
                <div className="flex items-start gap-5">
                    {/* Cover thumbnail — click to upload */}
                    <input
                        ref={headerCoverRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && uploadHeaderCover(e.target.files[0])}
                    />
                    <button
                        onClick={() => headerCoverRef.current?.click()}
                        disabled={headerUploading}
                        title="Upload cover"
                        className="w-20 h-28 rounded-xl bg-ep-border flex items-center justify-center shrink-0 overflow-hidden shadow-md relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ep-rose"
                    >
                        {coverUrl
                            ? <img src={coverUrl} alt={project.title} className="w-full h-full object-cover" />
                            : <BookOpen size={24} className="text-ep-muted" />
                        }
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                            {headerUploading
                                ? <span className="text-white text-xs font-semibold">…</span>
                                : <Upload size={18} className="text-white" />
                            }
                        </div>
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={project.status} />
                            <span className="text-ep-muted text-xs">{TYPE_LABEL[project.type] ?? project.type}</span>
                        </div>
                        <h1 className="font-display font-black text-3xl text-ep-text mb-1 leading-tight">{project.title}</h1>
                        {project.blurb && <p className="text-ep-text-dim text-sm line-clamp-2">{project.blurb}</p>}

                        {project.targetWordCount > 0 && (
                            <div className="mt-3">
                                <WordCountBar current={project.totalWords} target={project.targetWordCount} compact />
                                <p className="text-ep-muted text-xs mt-1">
                                    {project.totalWords.toLocaleString()} / {project.targetWordCount.toLocaleString()} words
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowCommissions(true)}
                        className="btn-ghost py-1.5 px-3 text-xs shrink-0"
                    >
                        <DollarSign size={13} /> Commissions
                    </button>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-0.5 bg-ep-bg border border-ep-border rounded-xl p-1 mb-6 overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-1 justify-center ${
                            tab === t.id
                                ? 'bg-ep-surface text-ep-rose shadow-sm border border-ep-border'
                                : 'text-ep-muted hover:text-ep-text'
                        }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="space-y-4">
                {tab === 'overview'   && <OverviewTab   project={project} id={id!} qc={qc} />}
                {tab === 'drafting'   && <DraftingTab   project={project} id={id!} navigate={navigate} qc={qc} />}
                {tab === 'characters' && <CharactersTab id={id!} qc={qc} />}
                {tab === 'marketing'  && <MarketingTab  id={id!} qc={qc} />}
                {tab === 'inventory'  && <InventoryTab  project={project} id={id!} qc={qc} />}
                {tab === 'publishing' && <PublishingTab project={project} id={id!} qc={qc} />}
            </div>

            {showCommissions && (
                <CommissionsModal id={id!} qc={qc} onClose={() => setShowCommissions(false)} />
            )}
        </div>
    );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ project, id, qc }: { project: Project; id: string; qc: ReturnType<typeof useQueryClient> }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm]       = useState({
        title:           project.title,
        type:            project.type,
        status:          project.status,
        blurb:           project.blurb ?? '',
        targetWordCount: project.targetWordCount ?? 50000,
        seriesId:        project.seriesId ?? '',
        seriesNumber:    project.seriesNumber ?? ('' as number | ''),
    });
    const coverInputRef    = useRef<HTMLInputElement>(null);
    const artInputRef      = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const { data: art = [] } = useQuery<ProjectArt[]>({
        queryKey: ['art', id],
        queryFn:  () => api.get(`/uploads/projects/${id}/art`),
    });

    const { data: seriesList = [] } = useQuery<Series[]>({
        queryKey: ['series'],
        queryFn:  () => api.get('/series'),
    });

    const patchMut = useMutation({
        mutationFn: (body: object) => api.patch<Project>(`/projects/${id}`, body),
        onSuccess: (p) => {
            qc.setQueryData(['project', id], p);
            setEditing(false);
        },
    });

    const [uploadError, setUploadError] = useState<string | null>(null);

    async function uploadCover(file: File) {
        setUploading(true); setUploadError(null);
        try {
            const fd  = new FormData(); fd.append('file', file);
            const res = await fetch(`/api/uploads/projects/${id}/cover`, { method: 'POST', body: fd, credentials: 'include' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Upload failed (${res.status})`);
            qc.invalidateQueries({ queryKey: ['project', id] });
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : "The upload didn't make it through — please try again.");
        } finally { setUploading(false); }
    }

    async function uploadArt(file: File) {
        setUploading(true); setUploadError(null);
        try {
            const fd  = new FormData(); fd.append('file', file);
            const res = await fetch(`/api/uploads/projects/${id}/art`, { method: 'POST', body: fd, credentials: 'include' });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Upload failed (${res.status})`);
            qc.invalidateQueries({ queryKey: ['art', id] });
        } catch (e) {
            setUploadError(e instanceof Error ? e.message : "The upload didn't make it through — please try again.");
        } finally { setUploading(false); }
    }

    async function deleteArt(artId: string) {
        const res = await fetch(`/api/uploads/projects/${id}/art/${artId}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) qc.invalidateQueries({ queryKey: ['art', id] });
    }

    function useAsMainCover(storageKey: string) {
        patchMut.mutate({ mainCoverKey: storageKey });
    }

    const PROJECT_TYPES    = ['novel', 'novella', 'short_story', 'essay', 'poetry'] as const;
    const PROJECT_STATUSES = ['concept', 'drafting', 'revising', 'querying', 'on_hold', 'published'] as const;

    return (
        <div className="space-y-4">
            {/* Metadata card */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-lg text-ep-text">Project Info</h2>
                    <button onClick={() => setEditing(!editing)} className="btn-ghost py-1.5 px-3 text-xs">
                        {editing ? 'Cancel' : 'Edit'}
                    </button>
                </div>

                {editing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Title</label>
                            <input className="input-base" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Type</label>
                                <select className="input-base" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof form.type }))}>
                                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Status</label>
                                <select className="input-base" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                                    {PROJECT_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Target Word Count</label>
                            <input className="input-base" type="number" min="1" value={form.targetWordCount || ''} onChange={e => setForm(f => ({ ...f, targetWordCount: parseInt(e.target.value) || 0 }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Blurb</label>
                            <textarea className="input-base min-h-20 resize-y" value={form.blurb} onChange={e => setForm(f => ({ ...f, blurb: e.target.value }))} placeholder="A short marketing description…" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Series</label>
                                <select
                                    className="input-base"
                                    value={form.seriesId}
                                    onChange={e => setForm(f => ({ ...f, seriesId: e.target.value, seriesNumber: e.target.value ? f.seriesNumber : '' }))}
                                >
                                    <option value="">— None —</option>
                                    {seriesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            {form.seriesId && (
                                <div>
                                    <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Book #</label>
                                    <input
                                        className="input-base"
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 1"
                                        value={form.seriesNumber}
                                        onChange={e => setForm(f => ({ ...f, seriesNumber: parseInt(e.target.value) || '' }))}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button className="btn-ghost flex-1" onClick={() => setEditing(false)}>Cancel</button>
                            <button
                                className="btn-primary flex-1"
                                disabled={patchMut.isPending}
                                onClick={() => patchMut.mutate({
                                    ...form,
                                    seriesId:     form.seriesId     || null,
                                    seriesNumber: form.seriesNumber !== '' ? Number(form.seriesNumber) : null,
                                })}
                            >
                                {patchMut.isPending ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <dl className="space-y-2 text-sm">
                        <InfoRow label="Type"   value={TYPE_LABEL[project.type] ?? project.type} />
                        <InfoRow label="Status" value={STATUS_LABEL[project.status] ?? project.status} />
                        {project.targetWordCount > 0 && <InfoRow label="Word Goal" value={project.targetWordCount.toLocaleString()} />}
                        {project.seriesId && (() => {
                            const s = seriesList.find(x => x.id === project.seriesId);
                            return s ? (
                                <InfoRow
                                    label="Series"
                                    value={project.seriesNumber != null ? `${s.name} #${project.seriesNumber}` : s.name}
                                />
                            ) : null;
                        })()}
                        {project.blurb && <InfoRow label="Blurb" value={project.blurb} multiline />}
                    </dl>
                )}
            </div>

            {/* Cover & Art */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-bold text-lg text-ep-text">Cover & Art</h2>
                    <div className="flex gap-2">
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                        <button className="btn-ghost py-1.5 px-3 text-xs" onClick={() => coverInputRef.current?.click()} disabled={uploading}>
                            <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload Cover'}
                        </button>
                        <input ref={artInputRef} type="file" accept="image/*" className="hidden"
                            onChange={e => e.target.files?.[0] && uploadArt(e.target.files[0])} />
                        <button className="btn-ghost py-1.5 px-3 text-xs" onClick={() => artInputRef.current?.click()} disabled={uploading}>
                            <Image size={13} /> Add Art
                        </button>
                    </div>
                </div>

                {uploadError && (
                    <p className="text-ep-danger text-xs bg-ep-danger/10 border border-ep-danger/25 rounded-lg px-3 py-2 mb-3">✕ {uploadError}</p>
                )}

                {art.length === 0 && !project.coverKey ? (
                    <button
                        onClick={() => artInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full border-2 border-dashed border-ep-border hover:border-ep-rose rounded-2xl py-10 flex flex-col items-center gap-2 transition-colors group"
                    >
                        <Image size={28} className="text-ep-border group-hover:text-ep-rose transition-colors" />
                        <p className="text-ep-muted text-sm group-hover:text-ep-text transition-colors">
                            {uploading ? 'Uploading…' : 'No artwork yet — click to give your project a face that commands attention.'}
                        </p>
                    </button>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {project.coverKey && (
                            <div className="relative group">
                                <img src={`/api/files/${project.coverKey}`} alt="Primary cover" className="w-full aspect-[2/3] object-cover rounded-lg" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1 p-1">
                                    <span className="text-white text-xs font-semibold">Primary</span>
                                </div>
                            </div>
                        )}
                        {art.map(a => {
                            const isMain = project.mainCoverKey === a.storageKey;
                            return (
                                <div key={a.id} className="relative group">
                                    <img src={`/api/files/${a.storageKey}`} alt={a.label ?? 'Art'} className={`w-full aspect-[2/3] object-cover rounded-lg ${isMain ? 'ring-2 ring-ep-rose' : ''}`} />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1.5 p-1">
                                        <button onClick={() => useAsMainCover(a.storageKey)} className="text-white text-xs bg-ep-rose/80 hover:bg-ep-rose rounded px-2 py-0.5 transition-colors flex items-center gap-1">
                                            <Star size={10} /> {isMain ? 'Selected' : 'Use as Cover'}
                                        </button>
                                        <button onClick={() => deleteArt(a.id)} className="text-white text-xs bg-black/40 hover:bg-red-600/80 rounded px-2 py-0.5 transition-colors">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                    {isMain && (
                                        <div className="absolute top-1 left-1 bg-ep-rose rounded text-white text-xs px-1.5 py-0.5 font-semibold">Cover</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Drafting tab ──────────────────────────────────────────────────────────────

function DraftingTab({ project, id, navigate, qc }: {
    project: Project;
    id: string;
    navigate: ReturnType<typeof useNavigate>;
    qc: ReturnType<typeof useQueryClient>;
}) {
    const [newTitle, setNewTitle]     = useState('');
    const [showBlurb, setShowBlurb]   = useState(false);
    const [blurb, setBlurb]           = useState(project.blurb ?? '');
    const [delChapter, setDelChapter] = useState<string | null>(null);

    const { data: chapters = [] } = useQuery<Chapter[]>({
        queryKey: ['chapters', id],
        queryFn:  () => api.get(`/projects/${id}/chapters`),
    });

    const createMut = useMutation({
        mutationFn: (title?: string) => api.post<Chapter>(`/projects/${id}/chapters`, { title: title || undefined }),
        onSuccess: (ch) => {
            qc.invalidateQueries({ queryKey: ['chapters', id] });
            qc.invalidateQueries({ queryKey: ['all-chapters'] });
            setNewTitle('');
            navigate(`/write/${id}/${ch.id}`);
        },
    });

    const deleteMut = useMutation({
        mutationFn: (chId: string) => api.delete(`/projects/${id}/chapters/${chId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chapters', id] });
            qc.invalidateQueries({ queryKey: ['project', id] });
            qc.invalidateQueries({ queryKey: ['project-stats'] });
            setDelChapter(null);
        },
    });

    const saveBlurbMut = useMutation({
        mutationFn: (b: string) => api.patch<Project>(`/projects/${id}`, { blurb: b }),
        onSuccess: (p) => {
            qc.setQueryData(['project', id], p);
            setShowBlurb(false);
        },
    });

    const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);

    return (
        <div className="space-y-4">
            {/* Summary & Blurb */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
                {/* Summary */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Summary</h3>
                        <button onClick={() => navigate(`/write/${id}/summary`)} className="btn-ghost py-1 px-2.5 text-xs">
                            <FileText size={12} /> {project.summary ? 'Edit Summary' : 'Create Summary'}
                        </button>
                    </div>
                    {project.summary ? (
                        <p className="text-ep-text-dim text-sm leading-relaxed whitespace-pre-line line-clamp-6">{project.summary.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/gi, '').trim()}</p>
                    ) : (
                        <p className="text-ep-muted text-sm italic">No summary yet — let the story introduce itself.</p>
                    )}
                </div>

                <div className="border-t border-ep-border" />

                {/* Blurb */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Blurb <span className="text-ep-muted font-normal normal-case text-xs">— back-cover pitch</span></h3>
                        <button onClick={() => setShowBlurb(!showBlurb)} className="btn-ghost py-1 px-2.5 text-xs">
                            <PenLine size={12} /> {showBlurb ? 'Close' : (project.blurb ? 'Edit' : 'Add Blurb')}
                        </button>
                    </div>
                    {!showBlurb && (
                        project.blurb
                            ? <p className="text-ep-text-dim text-sm leading-relaxed">{project.blurb}</p>
                            : <p className="text-ep-muted text-sm italic">No blurb yet — seduce your readers before they open the cover.</p>
                    )}
                    {showBlurb && (
                        <div className="space-y-3">
                            <textarea
                                className="input-base min-h-28 resize-y"
                                value={blurb}
                                onChange={e => setBlurb(e.target.value)}
                                placeholder="A gripping one-paragraph description of your work…"
                            />
                            <div className="flex gap-2">
                                <button className="btn-ghost" onClick={() => setShowBlurb(false)}>Cancel</button>
                                <button className="btn-primary" disabled={saveBlurbMut.isPending} onClick={() => saveBlurbMut.mutate(blurb)}>
                                    {saveBlurbMut.isPending ? 'Saving…' : 'Save Blurb'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chapter list */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="font-display font-bold text-lg text-ep-text">Chapters</h2>
                        {chapters.length > 0 && (
                            <p className="text-ep-muted text-xs mt-0.5">
                                {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} · {totalWords.toLocaleString()} words total
                            </p>
                        )}
                    </div>
                </div>

                {chapters.length === 0 ? (
                    <div className="text-center py-10">
                        <PenLine size={36} className="text-ep-border mx-auto mb-3" />
                        <p className="text-ep-muted text-sm mb-4">No chapters yet — every story needs a first sentence.</p>
                    </div>
                ) : (
                    <div className="space-y-2 mb-5">
                        {chapters.map(ch => (
                            <div key={ch.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-ep-bg border border-ep-border hover:border-ep-border-hi transition-all group">
                                <span className="text-ep-rose font-bold text-xs w-7 shrink-0">{ch.chapterNumber}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-ep-text text-sm font-medium truncate">
                                        {ch.title ?? <span className="italic text-ep-muted font-normal">Untitled</span>}
                                    </p>
                                    <p className="text-ep-muted text-xs">{ch.wordCount.toLocaleString()} words</p>
                                </div>
                                {ch.targetWordCount > 0 && (
                                    <div className="w-16 hidden sm:block" title={`${ch.wordCount.toLocaleString()} / ${ch.targetWordCount.toLocaleString()} words`}>
                                        <div className="wc-bar">
                                            <div className="wc-bar-fill" style={{ width: `${Math.min(100, (ch.wordCount / ch.targetWordCount) * 100)}%` }} />
                                        </div>
                                        <p className="text-ep-muted text-xs mt-0.5 text-right">{Math.min(100, Math.round(ch.wordCount / ch.targetWordCount * 100))}%</p>
                                    </div>
                                )}
                                <button onClick={() => navigate(`/write/${id}/${ch.id}`)} className="btn-ghost py-1 px-2.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <PenLine size={12} /> Edit
                                </button>
                                <button onClick={() => setDelChapter(ch.id)} className="btn-danger py-1 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* New chapter form */}
                <div className="flex gap-2 pt-2 border-t border-ep-border">
                    <input
                        className="input-base flex-1"
                        placeholder="New chapter title (optional)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createMut.mutate(newTitle)}
                    />
                    <button
                        className="btn-primary shrink-0"
                        disabled={createMut.isPending}
                        onClick={() => createMut.mutate(newTitle)}
                    >
                        <Plus size={15} /> {createMut.isPending ? 'Creating…' : 'New Chapter'}
                    </button>
                </div>
            </div>

            {delChapter && (
                <Modal title="Erase this chapter?" onClose={() => setDelChapter(null)}>
                    <p className="text-ep-muted text-sm mb-6">Every word in this chapter will be gone — permanently. Consider exporting a copy first if you have any second thoughts.</p>
                    <div className="flex gap-3">
                        <button className="btn-ghost flex-1" onClick={() => setDelChapter(null)}>Cancel</button>
                        <button className="btn-danger flex-1" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(delChapter)}>
                            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Characters tab ────────────────────────────────────────────────────────────

function CharactersTab({ id, qc }: { id: string; qc: ReturnType<typeof useQueryClient> }) {
    const [showForm, setShowForm]   = useState(false);
    const [expanded, setExpanded]   = useState<string | null>(null);
    const [name, setName]           = useState('');
    const [delChar, setDelChar]     = useState<string | null>(null);

    const { data: characters = [] } = useQuery<Character[]>({
        queryKey: ['characters', id],
        queryFn:  () => api.get(`/projects/${id}/characters`),
    });

    const createMut = useMutation({
        mutationFn: () => api.post<Character>(`/projects/${id}/characters`, { name }),
        onSuccess: (ch) => {
            qc.invalidateQueries({ queryKey: ['characters', id] });
            setName(''); setShowForm(false);
            setExpanded(ch.id);
        },
    });

    const deleteMut = useMutation({
        mutationFn: (cId: string) => api.delete(`/projects/${id}/characters/${cId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['characters', id] });
            setDelChar(null);
        },
    });

    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-ep-text">Characters</h2>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary py-1.5 px-3 text-sm">
                    <Plus size={14} /> New Character
                </button>
            </div>

            {showForm && (
                <div className="flex gap-2 p-4 bg-ep-bg border border-ep-border rounded-xl">
                    <input className="input-base flex-1" placeholder="Character name" value={name}
                        onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name && createMut.mutate()} autoFocus />
                    <button className="btn-primary shrink-0" disabled={!name || createMut.isPending} onClick={() => createMut.mutate()}>
                        {createMut.isPending ? 'Adding…' : 'Add'}
                    </button>
                    <button className="btn-ghost shrink-0" onClick={() => setShowForm(false)}><X size={15} /></button>
                </div>
            )}

            {characters.length === 0 ? (
                <div className="text-center py-10">
                    <Users size={36} className="text-ep-border mx-auto mb-3" />
                    <p className="text-ep-muted text-sm">No characters yet — every story has people waiting to be written into existence.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {characters.map(ch => (
                        <CharacterCard
                            key={ch.id}
                            character={ch}
                            projectId={id}
                            expanded={expanded === ch.id}
                            onToggle={() => setExpanded(expanded === ch.id ? null : ch.id)}
                            onDelete={() => setDelChar(ch.id)}
                            qc={qc}
                        />
                    ))}
                </div>
            )}

            {delChar && (
                <Modal title="Remove this character?" onClose={() => setDelChar(null)}>
                    <p className="text-ep-muted text-sm mb-6">This character — their story, their images, everything that makes them real — will be permanently removed. There is no recovery.</p>
                    <div className="flex gap-3">
                        <button className="btn-ghost flex-1" onClick={() => setDelChar(null)}>Cancel</button>
                        <button className="btn-danger flex-1" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(delChar)}>
                            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function CharacterCard({ character, projectId, expanded, onToggle, onDelete, qc }: {
    character: Character; projectId: string; expanded: boolean;
    onToggle: () => void; onDelete: () => void; qc: ReturnType<typeof useQueryClient>;
}) {
    const [editing, setEditing] = useState(false);
    const [form, setForm]       = useState({ age: character.age ?? '', physicalDescription: character.physicalDescription ?? '', notes: character.notes ?? '' });
    const imgInputRef           = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const { data: full } = useQuery<Character & { images: CharacterImage[] }>({
        queryKey: ['character', character.id],
        queryFn:  () => api.get(`/projects/${projectId}/characters/${character.id}`),
        enabled:  expanded,
    });

    const patchMut = useMutation({
        mutationFn: (body: object) => api.patch<Character>(`/projects/${projectId}/characters/${character.id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['characters', projectId] });
            qc.invalidateQueries({ queryKey: ['character', character.id] });
            setEditing(false);
        },
    });

    async function uploadImage(file: File) {
        setUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            await fetch(`/api/uploads/characters/${character.id}/images`, { method: 'POST', body: fd, credentials: 'include' });
            qc.invalidateQueries({ queryKey: ['character', character.id] });
        } finally { setUploading(false); }
    }

    const images = full?.images ?? [];

    return (
        <div className="border border-ep-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-ep-bg cursor-pointer hover:bg-ep-surface-2 transition-colors" onClick={onToggle}>
                <div className="w-8 h-8 rounded-full bg-ep-border flex items-center justify-center shrink-0 overflow-hidden">
                    {images[0]
                        ? <img src={`/api/files/${images[0].storageKey}`} alt="" className="w-full h-full object-cover" />
                        : <Users size={14} className="text-ep-muted" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-ep-text font-medium text-sm">{character.name}</p>
                    {character.age && <p className="text-ep-muted text-xs">Age: {character.age}</p>}
                </div>
                <button onClick={e => { e.stopPropagation(); onDelete(); }} className="btn-danger py-1 px-2 text-xs opacity-0 group-hover:opacity-100 mr-1">
                    <Trash2 size={12} />
                </button>
                {expanded ? <ChevronDown size={16} className="text-ep-muted shrink-0" /> : <ChevronRight size={16} className="text-ep-muted shrink-0" />}
            </div>

            {expanded && (
                <div className="p-4 border-t border-ep-border space-y-4">
                    {editing ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Age</label>
                                <input className="input-base" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 24" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Physical Description</label>
                                <textarea className="input-base min-h-20 resize-y" value={form.physicalDescription} onChange={e => setForm(f => ({ ...f, physicalDescription: e.target.value }))} placeholder="Height, build, distinguishing features…" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Notes</label>
                                <textarea className="input-base min-h-16 resize-y" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Backstory, personality, quirks…" />
                            </div>
                            <div className="flex gap-2">
                                <button className="btn-ghost flex-1" onClick={() => setEditing(false)}>Cancel</button>
                                <button className="btn-primary flex-1" disabled={patchMut.isPending} onClick={() => patchMut.mutate(form)}>
                                    {patchMut.isPending ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 text-sm">
                            {full?.age && <InfoRow label="Age" value={full.age} />}
                            {full?.physicalDescription && <InfoRow label="Physical Description" value={full.physicalDescription} multiline />}
                            {full?.notes && <InfoRow label="Notes" value={full.notes} multiline />}
                            {!full?.age && !full?.physicalDescription && !full?.notes && (
                                <p className="text-ep-muted text-xs">No details yet — expand to give this character their depth.</p>
                            )}
                            <button className="btn-ghost py-1.5 px-3 text-xs mt-1" onClick={() => setEditing(true)}>Edit Details</button>
                        </div>
                    )}

                    {/* Images */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Images</p>
                            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                            <button className="btn-ghost py-1 px-2.5 text-xs" onClick={() => imgInputRef.current?.click()} disabled={uploading}>
                                <Upload size={12} /> {uploading ? 'Uploading…' : 'Add Image'}
                            </button>
                        </div>
                        {images.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {images.map(img => (
                                    <img
                                        key={img.id}
                                        src={`/api/files/${img.storageKey}`}
                                        alt={img.caption ?? ''}
                                        className="w-full aspect-square object-cover rounded-lg"
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-ep-muted text-xs">No images yet — put a face to the name.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Marketing tab ─────────────────────────────────────────────────────────────

function MarketingTab({ id, qc }: { id: string; qc: ReturnType<typeof useQueryClient> }) {
    const [form, setForm] = useState({ title: '', author: '', year: '', reason: '' });

    const { data: comps = [] } = useQuery<CompTitle[]>({
        queryKey: ['comps', id],
        queryFn:  () => api.get(`/projects/${id}/publishing/comps`),
    });

    const createMut = useMutation({
        mutationFn: () => api.post<CompTitle>(`/projects/${id}/publishing/comps`, {
            title: form.title, author: form.author,
            year: form.year ? parseInt(form.year) : undefined,
            reason: form.reason || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['comps', id] });
            setForm({ title: '', author: '', year: '', reason: '' });
        },
    });

    const deleteMut = useMutation({
        mutationFn: (cId: string) => api.delete(`/projects/${id}/publishing/comps/${cId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['comps', id] }),
    });

    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-5">
            <h2 className="font-display font-bold text-lg text-ep-text">Comparable Titles</h2>

            {/* Add form */}
            <div className="p-4 bg-ep-bg border border-ep-border rounded-xl space-y-3">
                <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Add Comp Title</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-ep-muted mb-1">Book Title *</label>
                        <input className="input-base" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
                    </div>
                    <div>
                        <label className="block text-xs text-ep-muted mb-1">Author *</label>
                        <input className="input-base" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author name" />
                    </div>
                    <div>
                        <label className="block text-xs text-ep-muted mb-1">Year Published</label>
                        <input className="input-base" type="number" min="1900" max="2099" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2022" />
                    </div>
                    <div>
                        <label className="block text-xs text-ep-muted mb-1">Reason for Comparison</label>
                        <input className="input-base" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Similar tone, themes…" />
                    </div>
                </div>
                <button
                    className="btn-primary text-sm"
                    disabled={!form.title || !form.author || createMut.isPending}
                    onClick={() => createMut.mutate()}
                >
                    <Plus size={14} /> {createMut.isPending ? 'Adding…' : 'Add Comp'}
                </button>
            </div>

            {/* Comp list */}
            {comps.length === 0 ? (
                <p className="text-ep-muted text-sm text-center py-6">No comp titles yet — name the books yours will share shelf space with.</p>
            ) : (
                <div className="space-y-2">
                    {comps.map(c => (
                        <div key={c.id} className="flex items-start justify-between gap-3 p-4 bg-ep-bg border border-ep-border rounded-xl">
                            <div>
                                <p className="text-ep-text font-medium text-sm"><em>{c.title}</em> — {c.author} {c.year ? `(${c.year})` : ''}</p>
                                {c.reason && <p className="text-ep-muted text-xs mt-0.5">{c.reason}</p>}
                            </div>
                            <button onClick={() => deleteMut.mutate(c.id)} className="btn-danger py-1 px-2 text-xs shrink-0">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Inventory & Sales tab ─────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
    inperson: 'In Person', online: 'Online', kdp: 'KDP',
};

function centsToDisplay(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
}

type ItemFormShape = { channel: 'inperson' | 'online' | 'kdp'; platform: string; label: string; costCents: number; priceCents: number; stockCount: number; stockOnOrder: number; available: boolean; availableUrl: string };
type SaleFormShape = { inventoryId: string; channel: 'inperson' | 'online' | 'kdp'; quantity: number; revenueCents: number; saleDate: string; notes: string };
const blankItem: ItemFormShape = { channel: 'inperson', platform: '', label: '', costCents: 0, priceCents: 0, stockCount: 0, stockOnOrder: 0, available: true, availableUrl: '' };

function InventoryTab({ project, id, qc }: {
    project: Project; id: string;
    qc: ReturnType<typeof useQueryClient>;
}) {
    const [addingItem, setAddingItem] = useState(false);
    const [itemForm, setItemForm]     = useState<ItemFormShape>(blankItem);
    const [addingSale, setAddingSale] = useState(false);
    const [saleForm, setSaleForm]     = useState<SaleFormShape>({ inventoryId: '', channel: 'inperson', quantity: 1, revenueCents: 0, saleDate: '', notes: '' });

    const { data: items = [] }  = useQuery<InventoryListing[]>({ queryKey: ['inventory', id], queryFn: () => api.get(`/projects/${id}/inventory`) });
    const { data: sales = [] }  = useQuery<SalesRecord[]>({ queryKey: ['sales', id], queryFn: () => api.get(`/projects/${id}/inventory/sales`) });

    const createItemMut = useMutation({
        mutationFn: () => api.post<InventoryListing>(`/projects/${id}/inventory`, {
            ...itemForm,
            costCents:  Math.round(Number(itemForm.costCents)  * 100),
            priceCents: Math.round(Number(itemForm.priceCents) * 100),
            platform:   itemForm.platform  || null,
            availableUrl: itemForm.availableUrl || null,
        }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory', id] }); setAddingItem(false); setItemForm(blankItem); },
    });

    const deleteItemMut = useMutation({
        mutationFn: (itemId: string) => api.delete(`/projects/${id}/inventory/${itemId}`),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['inventory', id] }),
    });

    const createSaleMut = useMutation({
        mutationFn: () => api.post<SalesRecord>(`/projects/${id}/inventory/sales`, {
            ...saleForm,
            inventoryId:  saleForm.inventoryId || null,
            revenueCents: Math.round(Number(saleForm.revenueCents) * 100),
            saleDate:     saleForm.saleDate || null,
            notes:        saleForm.notes || null,
        }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales', id] }); setAddingSale(false); setSaleForm({ inventoryId: '', channel: 'inperson', quantity: 1, revenueCents: 0, saleDate: '', notes: '' }); },
    });

    const deleteSaleMut = useMutation({
        mutationFn: (saleId: string) => api.delete(`/projects/${id}/inventory/sales/${saleId}`),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['sales', id] }),
    });

    const totalRevenue = sales.reduce((s, r) => s + r.revenueCents, 0);

    return (
        <div className="space-y-5">
            {/* Inventory listings */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-display font-bold text-lg text-ep-text">Inventory</h2>
                        <p className="text-ep-muted text-xs mt-0.5">Editions, formats, and where they're sold.</p>
                    </div>
                    {!addingItem && (
                        <button className="btn-ghost py-1.5 px-3 text-xs" onClick={() => setAddingItem(true)}>
                            <Plus size={13} /> Add Listing
                        </button>
                    )}
                </div>

                {addingItem && (
                    <div className="p-4 bg-ep-bg border border-ep-rose/30 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">New Listing</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Channel</label>
                                <select className="input-base" value={itemForm.channel} onChange={e => setItemForm(f => ({ ...f, channel: e.target.value as 'inperson' | 'online' | 'kdp' }))}>
                                    <option value="inperson">In Person</option>
                                    <option value="online">Online</option>
                                    <option value="kdp">KDP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Platform <span className="text-ep-muted/60 font-normal">(optional)</span></label>
                                <input className="input-base" value={itemForm.platform} onChange={e => setItemForm(f => ({ ...f, platform: e.target.value }))} placeholder="Square, Shopify, Amazon…" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs text-ep-muted mb-1">Label *</label>
                                <input className="input-base" value={itemForm.label} onChange={e => setItemForm(f => ({ ...f, label: e.target.value }))} placeholder="Signed Paperback, Hardcover, eBook…" />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Cost ($)</label>
                                <input className="input-base" type="number" min="0" step="0.01" value={itemForm.costCents} onChange={e => setItemForm(f => ({ ...f, costCents: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Sale Price ($)</label>
                                <input className="input-base" type="number" min="0" step="0.01" value={itemForm.priceCents} onChange={e => setItemForm(f => ({ ...f, priceCents: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">In Stock</label>
                                <input className="input-base" type="number" min="0" value={itemForm.stockCount} onChange={e => setItemForm(f => ({ ...f, stockCount: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">On Order</label>
                                <input className="input-base" type="number" min="0" value={itemForm.stockOnOrder} onChange={e => setItemForm(f => ({ ...f, stockOnOrder: Number(e.target.value) }))} />
                            </div>
                            {itemForm.channel === 'online' && (
                                <div className="col-span-2">
                                    <label className="block text-xs text-ep-muted mb-1">Listing URL</label>
                                    <input className="input-base" type="url" value={itemForm.availableUrl} onChange={e => setItemForm(f => ({ ...f, availableUrl: e.target.value }))} placeholder="https://…" />
                                </div>
                            )}
                            <div className="col-span-2 flex items-center gap-2">
                                <input type="checkbox" id="avail" checked={itemForm.available} onChange={e => setItemForm(f => ({ ...f, available: e.target.checked }))} className="accent-ep-rose" />
                                <label htmlFor="avail" className="text-xs text-ep-text-dim cursor-pointer">Available for purchase</label>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button className="btn-ghost flex-1" onClick={() => { setAddingItem(false); setItemForm(blankItem); }}>Cancel</button>
                            <button className="btn-primary flex-1" disabled={!itemForm.label || createItemMut.isPending} onClick={() => createItemMut.mutate()}>
                                {createItemMut.isPending ? 'Saving…' : 'Add Listing'}
                            </button>
                        </div>
                    </div>
                )}

                {items.length === 0 && !addingItem ? (
                    <p className="text-ep-muted text-sm text-center py-6">No inventory yet — define how your work reaches the world.</p>
                ) : (
                    <div className="space-y-2">
                        {['inperson', 'online', 'kdp'].map(ch => {
                            const group = items.filter(i => i.channel === ch);
                            if (!group.length) return null;
                            return (
                                <div key={ch}>
                                    <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">{CHANNEL_LABELS[ch]}</p>
                                    <div className="space-y-2">
                                        {group.map(item => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-ep-bg border border-ep-border rounded-xl">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-ep-text text-sm font-medium truncate">{item.label}</p>
                                                    <div className="flex flex-wrap gap-x-3 text-xs text-ep-muted mt-0.5">
                                                        {item.platform && <span>{item.platform}</span>}
                                                        <span>Cost {centsToDisplay(item.costCents)} · Price {centsToDisplay(item.priceCents)}</span>
                                                        <span>{item.stockCount} in stock{item.stockOnOrder > 0 ? `, ${item.stockOnOrder} on order` : ''}</span>
                                                        {!item.available && <span className="text-ep-muted/60">Unavailable</span>}
                                                    </div>
                                                </div>
                                                {item.availableUrl && (
                                                    <a href={item.availableUrl} target="_blank" rel="noreferrer" className="text-ep-rose text-xs hover:underline shrink-0">View</a>
                                                )}
                                                <button onClick={() => deleteItemMut.mutate(item.id)} className="btn-danger py-1 px-2 text-xs shrink-0">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sales records */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-display font-bold text-lg text-ep-text">Sales</h2>
                        {sales.length > 0 && (
                            <p className="text-ep-muted text-xs mt-0.5">Total revenue: <span className="text-ep-rose font-semibold">{centsToDisplay(totalRevenue)}</span></p>
                        )}
                    </div>
                    {!addingSale && (
                        <button className="btn-ghost py-1.5 px-3 text-xs" onClick={() => setAddingSale(true)}>
                            <Plus size={13} /> Log Sale
                        </button>
                    )}
                </div>

                {addingSale && (
                    <div className="p-4 bg-ep-bg border border-ep-rose/30 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Log a Sale</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Channel</label>
                                <select className="input-base" value={saleForm.channel} onChange={e => setSaleForm(f => ({ ...f, channel: e.target.value as 'inperson' | 'online' | 'kdp' }))}>
                                    <option value="inperson">In Person</option>
                                    <option value="online">Online</option>
                                    <option value="kdp">KDP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Listing <span className="text-ep-muted/60 font-normal">(optional)</span></label>
                                <select className="input-base" value={saleForm.inventoryId} onChange={e => setSaleForm(f => ({ ...f, inventoryId: e.target.value }))}>
                                    <option value="">— none —</option>
                                    {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Qty</label>
                                <input className="input-base" type="number" min="1" value={saleForm.quantity} onChange={e => setSaleForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Revenue ($)</label>
                                <input className="input-base" type="number" min="0" step="0.01" value={saleForm.revenueCents} onChange={e => setSaleForm(f => ({ ...f, revenueCents: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Date</label>
                                <input className="input-base" type="date" value={saleForm.saleDate} onChange={e => setSaleForm(f => ({ ...f, saleDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="block text-xs text-ep-muted mb-1">Notes</label>
                                <input className="input-base" value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} placeholder="Cash, Square, convention…" />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button className="btn-ghost flex-1" onClick={() => setAddingSale(false)}>Cancel</button>
                            <button className="btn-primary flex-1" disabled={createSaleMut.isPending} onClick={() => createSaleMut.mutate()}>
                                {createSaleMut.isPending ? 'Logging…' : 'Log Sale'}
                            </button>
                        </div>
                    </div>
                )}

                {sales.length === 0 && !addingSale ? (
                    <p className="text-ep-muted text-sm text-center py-6">No sales logged yet — every transaction tells a story.</p>
                ) : (
                    <div className="space-y-2">
                        {sales.map(s => {
                            const listing = items.find(i => i.id === s.inventoryId);
                            return (
                                <div key={s.id} className="flex items-center gap-3 p-3 bg-ep-bg border border-ep-border rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-ep-rose text-sm font-semibold">{centsToDisplay(s.revenueCents)}</span>
                                            <span className="text-ep-text-dim text-xs">× {s.quantity}</span>
                                            {listing && <span className="text-ep-text text-xs truncate">{listing.label}</span>}
                                        </div>
                                        <div className="flex gap-3 text-xs text-ep-muted mt-0.5">
                                            <span>{CHANNEL_LABELS[s.channel]}</span>
                                            {s.saleDate && <span>{s.saleDate}</span>}
                                            {s.notes && <span>{s.notes}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteSaleMut.mutate(s.id)} className="btn-danger py-1 px-2 text-xs shrink-0">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Link to Events */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-5 flex items-center justify-between">
                <div>
                    <p className="text-ep-text text-sm font-medium">Track in-person events</p>
                    <p className="text-ep-muted text-xs mt-0.5">Log signings, conventions, and markets — with full P&L tracking.</p>
                </div>
                <Link to="/events" className="btn-ghost py-1.5 px-3 text-xs shrink-0">
                    <Calendar size={13} /> View Events
                </Link>
            </div>
        </div>
    );
}

// ── Publishing tab ────────────────────────────────────────────────────────────

function PublishingTab({ project, id, qc }: { project: Project; id: string; qc: ReturnType<typeof useQueryClient> }) {
    const [pubType, setPubType] = useState<'traditional' | 'self' | ''>(project.pubType ?? '');

    const { data: pub }         = useQuery<Publishing | null>({ queryKey: ['publishing', id], queryFn: () => api.get(`/projects/${id}/publishing`) });
    const { data: sizes = [] }  = useQuery<PublishingSize[]>({ queryKey: ['pub-sizes', id], queryFn: () => api.get(`/projects/${id}/publishing/sizes`) });
    const { data: dist = [] }   = useQuery<Distribution[]>({ queryKey: ['distribution', id], queryFn: () => api.get(`/projects/${id}/publishing/distribution`) });

    const [pubForm, setPubForm] = useState({ datePublished: '', isbn: '', publisherName: '', dealDetails: '' });

    const [sizeLabel, setSizeLabel] = useState('');
    const [sizeFormat, setSizeFormat] = useState('paperback');
    const [distForm, setDistForm] = useState({ channel: '', label: '', url: '' });

    const savePubMut = useMutation({
        mutationFn: () => api.put(`/projects/${id}/publishing`, { pubType, ...pubForm }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['publishing', id] });
            qc.invalidateQueries({ queryKey: ['project', id] });
        },
    });

    const addSizeMut = useMutation({
        mutationFn: () => api.post<PublishingSize>(`/projects/${id}/publishing/sizes`, { sizeLabel, format: sizeFormat }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['pub-sizes', id] }); setSizeLabel(''); },
    });

    const delSizeMut = useMutation({
        mutationFn: (sId: string) => api.delete(`/projects/${id}/publishing/sizes/${sId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pub-sizes', id] }),
    });

    const addDistMut = useMutation({
        mutationFn: () => api.post<Distribution>(`/projects/${id}/publishing/distribution`, { channel: distForm.channel, label: distForm.label, url: distForm.url || undefined }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['distribution', id] }); setDistForm({ channel: '', label: '', url: '' }); },
    });

    const delDistMut = useMutation({
        mutationFn: (dId: string) => api.delete(`/projects/${id}/publishing/distribution/${dId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['distribution', id] }),
    });

    // Sync form from fetched data once the async query resolves
    useEffect(() => {
        if (pub) {
            setPubType(pub.pubType);
            setPubForm({
                datePublished: pub.datePublished ?? '',
                isbn:          pub.isbn ?? '',
                publisherName: pub.publisherName ?? '',
                dealDetails:   pub.dealDetails ?? '',
            });
        }
    }, [pub]);

    const SIZE_FORMATS = ['paperback', 'hardcover', 'ebook', 'audio'] as const;

    return (
        <div className="space-y-4">
            {/* Pub type + core fields */}
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-5">
                <h2 className="font-display font-bold text-lg text-ep-text">Publishing</h2>

                <div>
                    <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">Publication Type</label>
                    <div className="flex gap-3">
                        {(['traditional', 'self'] as const).map(pt => (
                            <button
                                key={pt}
                                onClick={() => setPubType(pt)}
                                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                                    pubType === pt
                                        ? 'border-ep-rose bg-ep-rose/10 text-ep-rose'
                                        : 'border-ep-border text-ep-muted hover:text-ep-text'
                                }`}
                            >
                                {pt === 'traditional' ? 'Traditionally Published' : 'Self-Published'}
                            </button>
                        ))}
                    </div>
                </div>

                {pubType === 'traditional' && (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Publisher Name</label>
                            <input className="input-base" value={pubForm.publisherName} onChange={e => setPubForm(f => ({ ...f, publisherName: e.target.value }))} placeholder="Publisher name" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Deal Details</label>
                            <textarea className="input-base min-h-20 resize-y" value={pubForm.dealDetails} onChange={e => setPubForm(f => ({ ...f, dealDetails: e.target.value }))} placeholder="Advance, royalty rate, rights granted…" />
                        </div>
                    </div>
                )}

                {pubType && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Date Published</label>
                            <input className="input-base" type="date" value={pubForm.datePublished} onChange={e => setPubForm(f => ({ ...f, datePublished: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">ISBN</label>
                            <input className="input-base" value={pubForm.isbn} onChange={e => setPubForm(f => ({ ...f, isbn: e.target.value }))} placeholder="978-…" />
                        </div>
                    </div>
                )}

                {pubType && (
                    <button className="btn-primary" disabled={savePubMut.isPending} onClick={() => savePubMut.mutate()}>
                        {savePubMut.isPending ? 'Saving…' : 'Save Publishing Info'}
                    </button>
                )}
            </div>

            {/* Sizes */}
            {pubType && (
                <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-bold text-base text-ep-text">Sizes Available</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {sizes.map(s => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-ep-bg border border-ep-border rounded-full text-xs text-ep-text">
                                {s.sizeLabel} <span className="text-ep-muted">({s.format})</span>
                                <button onClick={() => delSizeMut.mutate(s.id)} className="text-ep-muted hover:text-ep-danger transition-colors ml-0.5"><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input className="input-base flex-1" placeholder='e.g. "Trade Paperback 6×9"' value={sizeLabel} onChange={e => setSizeLabel(e.target.value)} />
                        <select className="input-base w-36" value={sizeFormat} onChange={e => setSizeFormat(e.target.value)}>
                            {SIZE_FORMATS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                        </select>
                        <button className="btn-primary shrink-0" disabled={!sizeLabel || addSizeMut.isPending} onClick={() => addSizeMut.mutate()}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Distribution */}
            {pubType && (
                <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-bold text-base text-ep-text">Locations Available</h3>
                    {dist.length > 0 && (
                        <div className="space-y-2">
                            {dist.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-3 bg-ep-bg border border-ep-border rounded-xl">
                                    <div>
                                        <p className="text-ep-text text-sm font-medium">{d.label}</p>
                                        {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-ep-rose text-xs hover:underline">{d.url}</a>}
                                    </div>
                                    <button onClick={() => delDistMut.mutate(d.id)} className="btn-danger py-1 px-2 text-xs"><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <input className="input-base" placeholder="Channel (e.g. Amazon)" value={distForm.channel} onChange={e => setDistForm(f => ({ ...f, channel: e.target.value }))} />
                        <input className="input-base" placeholder="Label (e.g. Kindle)" value={distForm.label} onChange={e => setDistForm(f => ({ ...f, label: e.target.value }))} />
                        <input className="input-base col-span-2" placeholder="URL (optional)" value={distForm.url} onChange={e => setDistForm(f => ({ ...f, url: e.target.value }))} />
                    </div>
                    <button className="btn-primary text-sm" disabled={!distForm.channel || !distForm.label || addDistMut.isPending} onClick={() => addDistMut.mutate()}>
                        <Plus size={14} /> Add Location
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Commissions modal ─────────────────────────────────────────────────────────

function CommissionsModal({ id, qc, onClose }: { id: string; qc: ReturnType<typeof useQueryClient>; onClose: () => void }) {
    const [form, setForm] = useState({ who: '', amountDollars: '', description: '', deadline: '', done: false });

    const { data: commissions = [] } = useQuery<Commission[]>({
        queryKey: ['commissions', id],
        queryFn:  () => api.get(`/projects/${id}/commissions`),
    });

    const createMut = useMutation({
        mutationFn: () => api.post<Commission>(`/projects/${id}/commissions`, {
            who: form.who, description: form.description,
            amountCents: form.amountDollars ? Math.round(parseFloat(form.amountDollars) * 100) : undefined,
            deadline: form.deadline || undefined, done: form.done,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['commissions', id] });
            qc.invalidateQueries({ queryKey: ['all-commissions'] });
            setForm({ who: '', amountDollars: '', description: '', deadline: '', done: false });
        },
    });

    const patchMut = useMutation({
        mutationFn: ({ cId, done }: { cId: string; done: boolean }) =>
            api.patch<Commission>(`/projects/${id}/commissions/${cId}`, { done }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['commissions', id] });
            qc.invalidateQueries({ queryKey: ['all-commissions'] });
        },
    });

    const deleteMut = useMutation({
        mutationFn: (cId: string) => api.delete(`/projects/${id}/commissions/${cId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['commissions', id] });
            qc.invalidateQueries({ queryKey: ['all-commissions'] });
        },
    });

    const fmtAmount = (cents: number | null) =>
        cents == null ? '' : `$${(cents / 100).toFixed(2)}`;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-ep-surface border border-ep-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-ep-glow" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-ep-border">
                    <h2 className="font-display font-bold text-xl text-ep-text">Commissions</h2>
                    <button onClick={onClose} className="text-ep-muted hover:text-ep-text transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {commissions.length === 0 ? (
                        <p className="text-ep-muted text-sm text-center py-4">No commissions yet — track the artists and editors who help bring your vision to life.</p>
                    ) : (
                        <div className="space-y-2">
                            {commissions.map(c => (
                                <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${c.done ? 'border-ep-border opacity-60' : 'border-ep-border bg-ep-bg'}`}>
                                    <button onClick={() => patchMut.mutate({ cId: c.id, done: !c.done })} className="mt-0.5 shrink-0">
                                        {c.done
                                            ? <CheckCircle2 size={16} className="text-ep-muted" />
                                            : <Circle       size={16} className="text-ep-rose" />
                                        }
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${c.done ? 'line-through text-ep-muted' : 'text-ep-text'}`}>{c.who}</span>
                                            {c.amountCents != null && <span className="text-ep-champagne text-xs font-semibold">{fmtAmount(c.amountCents)}</span>}
                                        </div>
                                        <p className="text-ep-text-dim text-xs mt-0.5">{c.description}</p>
                                        {c.deadline && <p className="text-ep-muted text-xs mt-0.5">Due {c.deadline}</p>}
                                    </div>
                                    <button onClick={() => deleteMut.mutate(c.id)} className="btn-danger py-1 px-2 text-xs shrink-0"><Trash2 size={11} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add form */}
                    <div className="p-4 bg-ep-bg border border-ep-border rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Add Commission</p>
                        <div className="grid grid-cols-2 gap-2">
                            <input className="input-base" placeholder="Who *" value={form.who} onChange={e => setForm(f => ({ ...f, who: e.target.value }))} />
                            <input className="input-base" type="number" min="0" step="0.01" placeholder="Amount ($)" value={form.amountDollars} onChange={e => setForm(f => ({ ...f, amountDollars: e.target.value }))} />
                            <input className="input-base col-span-2" placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            <input className="input-base" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                            <label className="flex items-center gap-2 text-ep-muted text-sm cursor-pointer">
                                <input type="checkbox" checked={form.done} onChange={e => setForm(f => ({ ...f, done: e.target.checked }))} className="accent-ep-rose" />
                                Already done
                            </label>
                        </div>
                        <button className="btn-primary text-sm w-full" disabled={!form.who || !form.description || createMut.isPending} onClick={() => createMut.mutate()}>
                            <Plus size={14} /> {createMut.isPending ? 'Adding…' : 'Add Commission'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
    return (
        <div className={multiline ? 'space-y-0.5' : 'flex items-start gap-4'}>
            <dt className="text-ep-muted text-xs font-semibold uppercase tracking-widest shrink-0 w-24">{label}</dt>
            <dd className={`text-ep-text text-sm ${multiline ? 'mt-0.5 whitespace-pre-wrap' : 'flex-1'}`}>{value}</dd>
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                <h3 className="font-display font-bold text-lg text-ep-text mb-2">{title}</h3>
                {children}
            </div>
        </div>
    );
}

function DollarSign({ size }: { size: number }) {
    return <span style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>$</span>;
}
