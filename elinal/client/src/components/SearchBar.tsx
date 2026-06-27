import { useEffect, useRef, useState } from 'react';
import { useNavigate }                  from 'react-router-dom';
import type { SearchResponse }          from '../api';
import { termSlug }                     from '../utils/termSlug';

export function SearchBar() {
    const [query,      setQuery]      = useState('');
    const [results,    setResults]    = useState<SearchResponse | null>(null);
    const [loading,    setLoading]    = useState(false);
    const [open,       setOpen]       = useState(false);
    const [fetchErr,   setFetchErr]   = useState<string | null>(null);
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const navigate     = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef     = useRef<HTMLInputElement>(null);
    const resultRefs   = useRef<(HTMLButtonElement | null)[]>([]);

    // Reset ref array when results change so stale entries don't linger
    useEffect(() => { resultRefs.current = []; }, [results]);

    // Debounced fetch with AbortController — cancels in-flight request on every keystroke
    useEffect(() => {
        if (query.length < 2) {
            setResults(null);
            setFetchErr(null);
            setOpen(false);
            setLoading(false);
            setFocusedIdx(-1);
            return;
        }

        setLoading(true);
        setFetchErr(null);
        setFocusedIdx(-1);

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const r = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}`,
                    { headers: { Accept: 'application/json' }, signal: controller.signal },
                );
                if (!r.ok) {
                    const body = await r.json().catch(() => ({})) as { error?: string };
                    throw new Error(body.error ?? `API ${r.status}`);
                }
                const data = await r.json() as SearchResponse;
                setResults(data);
                setFetchErr(null);
                setOpen(true);
            } catch (e) {
                if ((e as Error).name === 'AbortError') return;
                setResults(null);
                setFetchErr((e as Error).message ?? 'Search unavailable');
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 320);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    // Outside-click closes panel
    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setFocusedIdx(-1);
            }
        }
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, []);

    function go(docket: string, hash = '') {
        navigate(`/${encodeURIComponent(docket)}${hash}`);
        setQuery('');
        setOpen(false);
        setFocusedIdx(-1);
    }

    // Flatten all navigable results into one ordered array for arrow-key nav
    const allItems = [
        ...(results?.opinions.map(o => ({ docket: o.docket, hash: '' })) ?? []),
        ...(results?.glossary.map(g => ({ docket: g.docket, hash: `#${termSlug(g.term)}` })) ?? []),
    ];

    function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        switch (e.key) {
            case 'Escape':
                setOpen(false);
                setFocusedIdx(-1);
                inputRef.current?.blur();
                break;
            case 'ArrowDown':
                if (!open || allItems.length === 0) break;
                e.preventDefault();
                { const next = Math.min(focusedIdx + 1, allItems.length - 1);
                  setFocusedIdx(next);
                  resultRefs.current[next]?.focus(); }
                break;
            case 'ArrowUp':
                if (!open) break;
                e.preventDefault();
                if (focusedIdx <= 0) { setFocusedIdx(-1); }
                else { const prev = focusedIdx - 1; setFocusedIdx(prev); resultRefs.current[prev]?.focus(); }
                break;
        }
    }

    function handleItemKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, idx: number) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (idx < allItems.length - 1) {
                    const next = idx + 1;
                    setFocusedIdx(next);
                    resultRefs.current[next]?.focus();
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (idx === 0) { setFocusedIdx(-1); inputRef.current?.focus(); }
                else { const prev = idx - 1; setFocusedIdx(prev); resultRefs.current[prev]?.focus(); }
                break;
            case 'Escape':
                setOpen(false);
                setFocusedIdx(-1);
                inputRef.current?.focus();
                break;
        }
    }

    const hasOpinions = (results?.opinions.length ?? 0) > 0;
    const hasGlossary = (results?.glossary.length ?? 0) > 0;
    const empty       = !hasOpinions && !hasGlossary && !loading && !fetchErr;

    // refIdx increments across both groups so each item maps to its allItems index
    let refIdx = 0;

    return (
        <div className="search-wrap" ref={containerRef}>
            <div className="search-field">
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                    ref={inputRef}
                    className="search-input"
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => { if (results || fetchErr) setOpen(true); }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Search opinions or legal terms…"
                    aria-label="Search opinions and legal terms"
                    aria-controls="search-results-panel"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    aria-activedescendant={focusedIdx >= 0 ? `search-item-${focusedIdx}` : undefined}
                    autoComplete="off"
                    spellCheck={false}
                />
                {loading && <span className="search-spinner" aria-label="Searching" />}
                {query && (
                    <button
                        className="search-clear"
                        tabIndex={-1}
                        onClick={() => {
                            setQuery('');
                            setOpen(false);
                            setFocusedIdx(-1);
                            inputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>

            {open && query.length >= 2 && (
                <div
                    id="search-results-panel"
                    className="search-results"
                    role="listbox"
                    aria-label="Search results"
                >
                    {fetchErr && (
                        <p className="search-empty search-empty--error">
                            Search unavailable — {fetchErr}
                        </p>
                    )}
                    {empty && (
                        <p className="search-empty">
                            No results for <em>"{query}"</em>
                        </p>
                    )}

                    {hasOpinions && (
                        <section className="search-group">
                            <h3 className="search-group-label">Cases</h3>
                            {results!.opinions.map(op => {
                                const i = refIdx++;
                                return (
                                    <button
                                        key={op.docket}
                                        id={`search-item-${i}`}
                                        ref={el => { resultRefs.current[i] = el; }}
                                        className="search-item"
                                        role="option"
                                        aria-selected={focusedIdx === i}
                                        onClick={() => go(op.docket)}
                                        onKeyDown={e => handleItemKeyDown(e, i)}
                                    >
                                        <span className="search-item-docket">{op.docket}</span>
                                        <span className="search-item-title">{op.title}</span>
                                    </button>
                                );
                            })}
                        </section>
                    )}

                    {hasGlossary && (
                        <section className="search-group">
                            <h3 className="search-group-label">Legal Terms</h3>
                            {results!.glossary.map((g, j) => {
                                const i = refIdx++;
                                return (
                                    <button
                                        key={`${g.docket}-${j}`}
                                        id={`search-item-${i}`}
                                        ref={el => { resultRefs.current[i] = el; }}
                                        className="search-item search-item--term"
                                        role="option"
                                        aria-selected={focusedIdx === i}
                                        onClick={() => go(g.docket, `#${termSlug(g.term)}`)}
                                        onKeyDown={e => handleItemKeyDown(e, i)}
                                    >
                                        <span className="search-item-term">{g.term}</span>
                                        <span className="search-item-def">{g.definition}</span>
                                        <span className="search-item-case">→ {g.title}</span>
                                    </button>
                                );
                            })}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
