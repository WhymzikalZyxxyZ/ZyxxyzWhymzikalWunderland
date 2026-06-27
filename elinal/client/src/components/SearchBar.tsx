import { useEffect, useRef, useState } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { searchContent }                from '../api';
import type { SearchResponse }          from '../api';

export function SearchBar() {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [open,    setOpen]    = useState(false);
    const navigate     = useNavigate();
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef     = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setResults(null);
            setOpen(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const r = await searchContent(query);
                setResults(r);
                setOpen(true);
            } catch {
                setResults(null);
            } finally {
                setLoading(false);
            }
        }, 320);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query]);

    useEffect(() => {
        function onOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onOutside);
        return () => document.removeEventListener('mousedown', onOutside);
    }, []);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    }

    function go(docket: string) {
        navigate(`/${encodeURIComponent(docket)}`);
        setQuery('');
        setOpen(false);
    }

    const hasOpinions = (results?.opinions.length ?? 0) > 0;
    const hasGlossary = (results?.glossary.length ?? 0) > 0;
    const empty       = !hasOpinions && !hasGlossary && !loading;

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
                    onFocus={() => { if (results) setOpen(true); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search opinions or legal terms…"
                    aria-label="Search opinions and legal terms"
                    aria-controls="search-results-panel"
                    aria-expanded={open}
                    aria-haspopup="listbox"
                    autoComplete="off"
                    spellCheck={false}
                />
                {loading && <span className="search-spinner" aria-label="Searching" />}
                {query && !loading && (
                    <button
                        className="search-clear"
                        onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
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
                    {empty && (
                        <p className="search-empty">
                            No results for <em>"{query}"</em>
                        </p>
                    )}

                    {hasOpinions && (
                        <section className="search-group">
                            <h3 className="search-group-label">Cases</h3>
                            {results!.opinions.map(op => (
                                <button
                                    key={op.docket}
                                    className="search-item"
                                    role="option"
                                    onClick={() => go(op.docket)}
                                >
                                    <span className="search-item-docket">{op.docket}</span>
                                    <span className="search-item-title">{op.title}</span>
                                </button>
                            ))}
                        </section>
                    )}

                    {hasGlossary && (
                        <section className="search-group">
                            <h3 className="search-group-label">Legal Terms</h3>
                            {results!.glossary.map((g, i) => (
                                <button
                                    key={`${g.docket}-${i}`}
                                    className="search-item search-item--term"
                                    role="option"
                                    onClick={() => go(g.docket)}
                                >
                                    <span className="search-item-term">{g.term}</span>
                                    <span className="search-item-def">{g.definition}</span>
                                    <span className="search-item-case">→ {g.title}</span>
                                </button>
                            ))}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
