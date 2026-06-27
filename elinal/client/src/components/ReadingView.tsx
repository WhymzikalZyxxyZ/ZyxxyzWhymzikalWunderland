import { useEffect, useRef, useState } from 'react';
import { useParams, Link }             from 'react-router-dom';
import type { ReadingMaterials }        from '../types';
import { postToParent }                 from '../hooks/usePostMessage';
import { LoadingSpinner }               from './LoadingSpinner';
import { ErrorBanner }                  from './ErrorBanner';
import { TableOfContents }             from './TableOfContents';
import { SectionBlock }                from './SectionBlock';
import { GlossarySection }             from './GlossarySection';
import { DiscussionQuestions }         from './DiscussionQuestions';
import { FurtherReading }              from './FurtherReading';
import { ShareButton }                 from './ShareButton';

type LoadState = 'loading' | 'polling' | 'ready' | 'error';

export function ReadingView() {
    const { docket } = useParams<{ docket: string }>();
    const [rm,    setRm]    = useState<ReadingMaterials | null>(null);
    const [state, setState] = useState<LoadState>('loading');
    const [error, setError] = useState<string | null>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
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

        const encodedDocket = encodeURIComponent(docket);
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let pollCount = 0;
        const MAX_POLLS = 6; // 1 minute max — cron retries stale opinions automatically

        async function load() {
            try {
                const r = await fetch(
                    `/api/opinions/${encodedDocket}/reading`,
                    { headers: { Accept: 'application/json' } },
                );
                if (!mountedRef.current) return;

                if (r.status === 202) {
                    if (pollCount++ >= MAX_POLLS) {
                        setError('Reading materials are taking longer than expected. The case will be retried automatically — check back soon.');
                        setState('error');
                        return;
                    }
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
    }, [docket]);

    // Update document title + notify parent frame when reading materials load
    useEffect(() => {
        if (state !== 'ready' || !rm) return;
        document.title = `${rm.title} — ELINAL`;
        postToParent({ type: 'elinal:view', docket: rm.docket, title: rm.title });
        // Move focus to the article heading for keyboard users after navigation
        titleRef.current?.focus();
        return () => { document.title = "ELINAL — Explain Like I’m Not A Lawyer"; };
    }, [state, rm]);

    if (state === 'loading') return <LoadingSpinner />;

    if (state === 'polling') {
        return (
            <div className="reading-processing" role="status">
                <LoadingSpinner />
                <p className="processing-note">
                    Reading materials are being prepared — checking back shortly…
                </p>
            </div>
        );
    }

    if (state === 'error' || !rm) {
        return <ErrorBanner message={error ?? 'Reading materials not found.'} />;
    }

    const date = rm.decided_date
        ? new Date(rm.decided_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
          })
        : null;

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
                {date && (
                    <time className="reading-date" dateTime={rm.decided_date ?? ''}>
                        {date}
                    </time>
                )}
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
        </article>
    );
}
