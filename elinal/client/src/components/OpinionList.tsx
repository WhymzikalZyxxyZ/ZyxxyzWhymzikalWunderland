import { useEffect, useState } from 'react';
import { fetchOpinions }       from '../api';
import type { Opinion }        from '../types';
import { OpinionCard }         from './OpinionCard';
import { SearchBar }           from './SearchBar';
import { LoadingSpinner }      from './LoadingSpinner';

const LIMIT = 20;

export function OpinionList() {
    const [opinions,     setOpinions]     = useState<Opinion[]>([]);
    const [total,        setTotal]        = useState(0);
    const [loading,      setLoading]      = useState(true);
    const [loadingMore,  setLoadingMore]  = useState(false);
    const [error,        setError]        = useState<string | null>(null);
    const [loadMoreErr,  setLoadMoreErr]  = useState<string | null>(null);
    const [retryKey,     setRetryKey]     = useState(0);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchOpinions({ limit: LIMIT, offset: 0 })
            .then(data => {
                setOpinions(data.opinions ?? []);
                setTotal(data.total ?? 0);
                setLoading(false);
            })
            .catch(e => {
                setError(String(e.message));
                setLoading(false);
            });
    }, [retryKey]);

    async function loadMore() {
        setLoadingMore(true);
        setLoadMoreErr(null);
        try {
            const data = await fetchOpinions({ limit: LIMIT, offset: opinions.length });
            setOpinions(prev => [...prev, ...(data.opinions ?? [])]);
            setTotal(data.total ?? 0);
        } catch (e) {
            setLoadMoreErr(String((e as Error).message));
        } finally {
            setLoadingMore(false);
        }
    }

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <div className="reading-error" role="alert">
                <p className="reading-error-msg">
                    <strong>Could not load opinions.</strong> {error}
                </p>
                <div className="reading-error-actions">
                    <button
                        className="retry-btn"
                        type="button"
                        onClick={() => { setError(null); setRetryKey(k => k + 1); }}
                    >
                        ↺ Try again
                    </button>
                </div>
            </div>
        );
    }

    const hasMore = opinions.length < total;

    return (
        <>
            <SearchBar />

            {opinions.length === 0 ? (
                <p className="list-empty">
                    The reading room is being prepared.<br />
                    New opinions are ingested on weekday mornings.
                </p>
            ) : (
                <>
                    <h2 className="list-heading">Recent Opinions ({total > 0 ? total : opinions.length})</h2>
                    <ul className="opinion-list" aria-label="SCOTUS opinions">
                        {opinions.map(op => <OpinionCard key={op.docket} opinion={op} />)}
                    </ul>

                    {hasMore && (
                        <div className="load-more-wrap">
                            {loadMoreErr && (
                                <p className="load-more-err">Failed to load more — {loadMoreErr}</p>
                            )}
                            <button
                                className="load-more-btn"
                                type="button"
                                disabled={loadingMore}
                                onClick={loadMore}
                                aria-busy={loadingMore}
                            >
                                {loadingMore ? 'Loading…' : `Load more (${total - opinions.length} remaining)`}
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    );
}
