import { useEffect, useRef, useState } from 'react';
import { useParams, Link }             from 'react-router-dom';
import type { ReadingMaterials }        from '../types';
import { postToParent }                 from '../hooks/usePostMessage';
import { LoadingSpinner }               from './LoadingSpinner';
import { TableOfContents }             from './TableOfContents';
import { SectionBlock }                from './SectionBlock';
import { GlossarySection }             from './GlossarySection';
import { DiscussionQuestions }         from './DiscussionQuestions';
import { FurtherReading }              from './FurtherReading';
import { ShareButton }                 from './ShareButton';

type LoadState = 'loading' | 'polling' | 'ready' | 'error';

const MAX_POLLS = 6;

function readingMinutes(rm: ReadingMaterials): number {
    const words = rm.sections.reduce((sum, s) => sum + s.body.split(/\s+/).length, 0);
    return Math.max(1, Math.round(words / 200));
}

function ScrollTop() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        function onScroll() { setVisible(window.scrollY > 400); }
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <button
            className={`scroll-top-btn${visible ? ' scroll-top-btn--visible' : ''}`}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            tabIndex={visible ? 0 : -1}
        >
            ↑
        </button>
    );
}

export function ReadingView() {
    const { docket } = useParams<{ docket: string }>();
    const [rm,          setRm]          = useState<ReadingMaterials | null>(null);
    const [state,       setState]       = useState<LoadState>('loading');
    const [error,       setError]       = useState<string | null>(null);
    const [pollAttempt, setPollAttempt] = useState(0);
    const [retryKey,    setRetryKey]    = useState(0);
    const titleRef   = useRef<HTMLHeadingElement>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!docket) return;

        setState('loading');
        setRm(null);
        setError(null);
        setPollAttempt(0);

        const encodedDocket = encodeURIComponent(docket);
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let pollCount = 0;

        async function load() {
            try {
                const r = await fetch(
                    `/api/opinions/${encodedDocket}/reading`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!mountedRef.current) return;

                if (r.status === 202) {
                    if (pollCount++ >= MAX_POLLS) {
                        setError('Reading materials are taking longer than expected. Try refreshing later — the cron job runs on weekday mornings and will pick this up automatically.');
                        setState('error');
                        return;
                    }
                    setPollAttempt(pollCount);
                    setState('polling');
                    pollTimer = setTimeout(load, 10_000);
                    return;
                }

                if (!r.ok) {
                    const body = await r.json().catch(() => ({})) as { error?: string };
                    setError(body.error ?? `HTTP ${r.status}`);
                    setState('error');
                    return;
                }

                const data = await r.json() as ReadingMaterials;
                setRm(data);
                setState('ready');
            } catch (e) {
                if (mountedRef.current) {
                    setError(String((e as Error).message));
                    setState('error');
                }
            }
        }

        load();
        return () => { if (pollTimer) clearTimeout(pollTimer); };
    }, [docket, retryKey]);

    // Update title, notify parent frame, and focus heading when materials load
    useEffect(() => {
        if (state !== 'ready' || !rm) return;
        document.title = `${rm.title} — ELINAL`;
        postToParent({ type: 'elinal:view', docket: rm.docket, title: rm.title });
        titleRef.current?.focus();
        return () => { document.title = "ELINAL — Explain Like I'm Not A Lawyer"; };
    }, [state, rm]);

    // Scroll to hash fragment (e.g. #glossary-certiorari) after data renders
    useEffect(() => {
        if (state !== 'ready') return;
        const hash = window.location.hash;
        if (!hash) return;
        const timer = setTimeout(() => {
            document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
        return () => clearTimeout(timer);
    }, [state]);

    if (state === 'loading') return <LoadingSpinner />;

    if (state === 'polling') {
        return (
            <div className="reading-processing" role="status">
                <LoadingSpinner />
                <p className="processing-note">
                    Reading materials are being prepared — checking back shortly…
                </p>
                <p className="processing-attempt" aria-live="polite">
                    Attempt {pollAttempt} of {MAX_POLLS}
                </p>
            </div>
        );
    }

    if (state === 'error' || !rm) {
        return (
            <div className="reading-error" role="alert">
                <p className="reading-error-msg">
                    <strong>Could not load reading materials.</strong>{' '}
                    {error ?? 'An unexpected error occurred.'}
                </p>
                <div className="reading-error-actions">
                    <Link to="/" className="back-link">← All opinions</Link>
                    <button
                        className="retry-btn"
                        type="button"
                        onClick={() => setRetryKey(k => k + 1)}
                    >
                        ↺ Try again
                    </button>
                </div>
            </div>
        );
    }

    const date = rm.decided_date
        ? new Date(rm.decided_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
          })
        : null;

    const mins = readingMinutes(rm);

    return (
        <article className="reading-view">
            <div className="reading-actions">
                <Link to="/" className="back-link" aria-label="Back to all opinions">
                    ← All opinions
                </Link>
                <ShareButton title={rm.title} />
            </div>

            <header className="reading-header">
                <div className="reading-docket" aria-label="Docket number">{rm.docket}</div>
                <h1
                    className="reading-title"
                    ref={titleRef}
                    tabIndex={-1}
                >
                    {rm.title}
                </h1>
                <div className="reading-meta">
                    {date && (
                        <time className="reading-date" dateTime={rm.decided_date ?? ''}>{date}</time>
                    )}
                    <span
                        className="reading-time"
                        aria-label={`Estimated reading time: ${mins} minute${mins !== 1 ? 's' : ''}`}
                    >
                        ~{mins} min read
                    </span>
                </div>
            </header>

            <TableOfContents sections={rm.sections} />

            <div className="reading-sections">
                {rm.sections.map((s, i) => (
                    <SectionBlock key={i} section={s} index={i} glossary={rm.glossary} />
                ))}
            </div>

            <GlossarySection     entries={rm.glossary} />
            <DiscussionQuestions questions={rm.discussion_questions} />
            <FurtherReading      entries={rm.further_reading} />

            <p className="reading-disclaimer">
                These reading materials are generated by AI for educational purposes only
                and are not legal advice. ELINAL is not a substitute for qualified counsel.
            </p>

            <ScrollTop />
        </article>
    );
}
