import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate }   from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit                   from '@tiptap/starter-kit';
import Placeholder                  from '@tiptap/extension-placeholder';
import CharacterCount               from '@tiptap/extension-character-count';
import Underline                    from '@tiptap/extension-underline';
import TextAlign                    from '@tiptap/extension-text-align';
import {
    Bold, Italic, UnderlineIcon, Strikethrough,
    Heading1, Heading2, Heading3,
    List, ListOrdered, Quote,
    AlignLeft, AlignCenter, AlignRight,
    Undo2, Redo2, Save, Trash2, ArrowLeft, Clock, Type,
} from 'lucide-react';
import { api }            from '@/lib/api';
import type { Chapter, Project } from '@/lib/types';

const AUTO_SAVE_MS = 30_000;

function useTimer() {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setSecs(s => s + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return secs >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export function WritingPad() {
    const { projectId, chapterId } = useParams<{ projectId: string; chapterId: string }>();
    const navigate              = useNavigate();
    const qc                    = useQueryClient();
    const timer                 = useTimer();
    const savedContentRef       = useRef('');
    const [saveStatus,  setSaveStatus]  = useState<'saved' | 'unsaved' | 'saving'>('saved');
    const [chapterTitle, setChapterTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [showDelete,    setShowDelete]    = useState(false);
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetInput,   setTargetInput]   = useState('');
    const [targetError,   setTargetError]   = useState<string | null>(null);

    const isSummary = chapterId === 'summary';

    const { data: project } = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn:  () => api.get(`/projects/${projectId}`),
        enabled:  !!projectId,
    });

    const { data: chapter, isLoading } = useQuery<Chapter>({
        queryKey: ['chapter', chapterId],
        queryFn:  () => api.get(`/projects/${projectId}/chapters/${chapterId}`),
        enabled:  !!projectId && !!chapterId && !isSummary,
    });

    const saveMut = useMutation<Project | Chapter, Error, string>({
        mutationFn: (content: string) => isSummary
            ? api.patch<Project>(`/projects/${projectId}`, { summary: content })
            : api.patch<Chapter>(`/projects/${projectId}/chapters/${chapterId}`, { content }),
        onMutate:  () => setSaveStatus('saving'),
        onSuccess: (result) => {
            savedContentRef.current = isSummary
                ? ((result as Project).summary ?? '')
                : (result as Chapter).content;
            setSaveStatus('saved');
            if (!isSummary) {
                qc.setQueryData(['chapter', chapterId], result);
                qc.invalidateQueries({ queryKey: ['chapters', projectId] });
                qc.invalidateQueries({ queryKey: ['all-chapters'] });
            } else {
                qc.setQueryData(['project', projectId], result);
            }
            qc.invalidateQueries({ queryKey: ['project-stats'] });
        },
        onError: () => setSaveStatus('unsaved'),
    });

    const saveTitleMut = useMutation({
        mutationFn: (title: string) =>
            api.patch<Chapter>(`/projects/${projectId}/chapters/${chapterId}`, { title }),
        onSuccess: (updated) => {
            qc.setQueryData(['chapter', chapterId], updated);
            qc.invalidateQueries({ queryKey: ['chapters', projectId] });
            qc.invalidateQueries({ queryKey: ['all-chapters'] });
        },
    });

    const deleteMut = useMutation({
        mutationFn: () => isSummary
            ? api.patch(`/projects/${projectId}`, { summary: '' })
            : api.delete(`/projects/${projectId}/chapters/${chapterId}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chapters', projectId] });
            qc.invalidateQueries({ queryKey: ['project-stats'] });
            navigate(`/projects/${projectId}`);
        },
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Placeholder.configure({ placeholder: isSummary ? 'Draw your reader in from the first breath…' : 'Let the words seduce the page…' }),
            CharacterCount,
        ],
        content: '',
        onUpdate: () => setSaveStatus('unsaved'),
    });

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const content = isSummary ? (project?.summary ?? '') : (chapter?.content ?? '');
        editor.commands.setContent(content);
        savedContentRef.current = content;
    }, [chapter, project, editor, isSummary]);

    useEffect(() => {
        if (chapter) {
            setChapterTitle(chapter.title ?? '');
            setTargetInput(chapter.targetWordCount > 0 ? String(chapter.targetWordCount) : '');
        }
    }, [chapter]);

    function saveTarget() {
        const val = parseInt(targetInput) || 0;
        if (!isSummary && chapter && val !== chapter.targetWordCount) {
            setTargetError(null);
            api.patch<Chapter>(`/projects/${projectId}/chapters/${chapterId}`, { targetWordCount: val })
                .then(updated => {
                    qc.setQueryData(['chapter', chapterId], updated);
                    qc.invalidateQueries({ queryKey: ['chapters', projectId] });
                    setEditingTarget(false);
                })
                .catch((e: Error) => setTargetError(e.message));
        } else {
            setEditingTarget(false);
        }
    }

    const save = useCallback(() => {
        if (!editor || !projectId) return;
        saveMut.mutate(editor.getHTML());
    }, [editor, projectId, saveMut]);

    useEffect(() => {
        const id = setInterval(() => { if (saveStatus === 'unsaved') save(); }, AUTO_SAVE_MS);
        return () => clearInterval(id);
    }, [save, saveStatus]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [save]);

    function handleTitleBlur() {
        setEditingTitle(false);
        if (!isSummary && chapterTitle !== (chapter?.title ?? '')) {
            saveTitleMut.mutate(chapterTitle);
        }
    }

    if (isLoading && !isSummary) return (
        <div className="min-h-screen bg-ep-bg flex items-center justify-center text-ep-muted">Pulling up your chapter…</div>
    );

    const wc = editor?.storage.characterCount?.words() ?? 0;

    const headerLabel = isSummary
        ? 'Project Summary'
        : chapter
            ? `Chapter ${chapter.chapterNumber}`
            : '';

    return (
        <div className="min-h-screen bg-ep-bg flex flex-col">
            {/* Toolbar */}
            <div className="sticky top-0 z-40 bg-ep-surface border-b border-ep-border shadow-md">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-1">
                    <button
                        onClick={() => navigate(`/projects/${projectId}`)}
                        className="toolbar-btn mr-2 flex items-center gap-1.5"
                        title="Back to project"
                    >
                        <ArrowLeft size={15} />
                    </button>
                    <div className="toolbar-divider" />

                    <ToolBtn onClick={() => editor?.chain().focus().undo().run()} title="Undo"><Undo2 size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().redo().run()} title="Redo"><Redo2 size={15} /></ToolBtn>
                    <div className="toolbar-divider" />
                    <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()}      active={editor?.isActive('bold')}      title="Bold"><Bold size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()}    active={editor?.isActive('italic')}    title="Italic"><Italic size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline"><UnderlineIcon size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleStrike().run()}    active={editor?.isActive('strike')}    title="Strikethrough"><Strikethrough size={15} /></ToolBtn>
                    <div className="toolbar-divider" />
                    <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={15} /></ToolBtn>
                    <div className="toolbar-divider" />
                    <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}  active={editor?.isActive('bulletList')}  title="Bullet list"><List size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list"><ListOrdered size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()}  active={editor?.isActive('blockquote')}  title="Blockquote"><Quote size={15} /></ToolBtn>
                    <div className="toolbar-divider" />
                    <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()}   active={editor?.isActive({ textAlign: 'left' })}   title="Align left"><AlignLeft size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter size={15} /></ToolBtn>
                    <ToolBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()}  active={editor?.isActive({ textAlign: 'right' })}  title="Align right"><AlignRight size={15} /></ToolBtn>

                    <div className="flex-1" />

                    <span className={`text-xs mr-2 ${
                        saveStatus === 'saved'  ? 'text-ep-muted'     :
                        saveStatus === 'saving' ? 'text-ep-champagne' : 'text-ep-rose'
                    }`}>
                        {saveStatus === 'saved' ? 'All caught up' : saveStatus === 'saving' ? 'Committing…' : 'Unsaved changes'}
                    </span>
                    <button onClick={save} className="btn-primary py-1.5 px-3 text-xs" disabled={saveMut.isPending}>
                        <Save size={13} /> Save
                    </button>
                    {!isSummary && (
                        <button onClick={() => setShowDelete(true)} className="btn-danger py-1.5 px-3 text-xs ml-1">
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Chapter header */}
            <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-2 text-center">
                <p className="text-ep-muted text-xs uppercase tracking-widest mb-2">{project?.title}</p>
                <p className="text-ep-rose text-xs font-semibold uppercase tracking-widest mb-1">{headerLabel}</p>
                {isSummary ? (
                    <h2 className="font-display font-black text-2xl text-ep-text">Summary</h2>
                ) : editingTitle ? (
                    <input
                        autoFocus
                        className="font-display font-black text-2xl text-ep-text bg-transparent border-b border-ep-rose text-center w-full outline-none pb-1"
                        value={chapterTitle}
                        onChange={e => setChapterTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={e => e.key === 'Enter' && handleTitleBlur()}
                        placeholder="Chapter Title"
                    />
                ) : (
                    <h2
                        className="font-display font-black text-2xl text-ep-text cursor-text hover:text-ep-rose transition-colors"
                        onClick={() => setEditingTitle(true)}
                        title="Click to edit title"
                    >
                        {chapterTitle || <span className="text-ep-muted italic font-normal text-xl">Nameless — click to give it an identity</span>}
                    </h2>
                )}
            </div>

            {/* Paper */}
            <div className="flex-1 flex justify-center px-4 pb-24">
                <div className="w-full max-w-3xl bg-ep-paper rounded-2xl shadow-ep-glow mt-4 tiptap-editor overflow-hidden">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Status bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-ep-surface/90 backdrop-blur border-t border-ep-border">
                <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between text-xs text-ep-muted">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Type size={12} />
                            <span><span className="text-ep-rose font-semibold">{wc.toLocaleString()}</span> words</span>
                        </div>
                        {!isSummary && chapter && (
                            chapter.targetWordCount > 0 ? (
                                <span
                                    className="text-ep-muted cursor-pointer hover:text-ep-text transition-colors"
                                    title="Click to change chapter target"
                                    onClick={() => setEditingTarget(true)}
                                >
                                    · <span className="text-ep-text-dim">{Math.min(100, Math.round(wc / chapter.targetWordCount * 100))}%</span> of {chapter.targetWordCount.toLocaleString()} goal
                                </span>
                            ) : (
                                <span
                                    className="text-ep-muted cursor-pointer hover:text-ep-champagne transition-colors"
                                    title="Set a word count target for this chapter"
                                    onClick={() => setEditingTarget(true)}
                                >
                                    · set chapter target
                                </span>
                            )
                        )}
                        {!isSummary && project?.targetWordCount && project.targetWordCount > 0 && (
                            <span className="text-ep-muted hidden sm:inline">
                                · book <span className="text-ep-text-dim">{project.totalWords.toLocaleString()} / {project.targetWordCount.toLocaleString()}</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span className="font-mono text-ep-text-dim">{timer}</span>
                    </div>
                </div>
            </div>

            {/* Chapter target modal */}
            {editingTarget && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setEditingTarget(false); setTargetError(null); }}>
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                        <h3 className="font-display font-bold text-lg text-ep-text mb-1">Chapter word target</h3>
                        <p className="text-ep-muted text-xs mb-4">Set the word count this chapter is reaching for. Leave blank or enter 0 to clear.</p>
                        <input
                            autoFocus
                            type="number"
                            min="0"
                            className="input-base mb-3"
                            placeholder="e.g. 3000"
                            value={targetInput}
                            onChange={e => setTargetInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') { setEditingTarget(false); setTargetError(null); } }}
                        />
                        {targetError && <p className="text-ep-danger text-xs mb-3">✕ {targetError}</p>}
                        <div className="flex gap-2">
                            <button className="btn-ghost flex-1" onClick={() => { setEditingTarget(false); setTargetError(null); }}>Cancel</button>
                            <button className="btn-primary flex-1" onClick={saveTarget}>Set Target</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {showDelete && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Erase this chapter?</h3>
                        <p className="text-ep-muted text-sm mb-6">
                            <strong className="text-ep-text">{headerLabel}{chapterTitle ? `: ${chapterTitle}` : ''}</strong> will be gone permanently — every word, every scene, every secret. There is no undoing this.
                        </p>
                        <div className="flex gap-3">
                            <button className="btn-ghost flex-1" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button
                                className="btn-danger flex-1"
                                onClick={() => deleteMut.mutate()}
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

function ToolBtn({ onClick, active, title, children }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
    return (
        <button onClick={onClick} title={title} className={`toolbar-btn ${active ? 'active' : ''}`}>
            {children}
        </button>
    );
}
