import { useEffect, useState } from 'react';
import { fetchOpinions }       from '../api';
import type { Opinion }        from '../types';
import { OpinionCard }         from './OpinionCard';
import { SearchBar }           from './SearchBar';
import { LoadingSpinner }      from './LoadingSpinner';
import { ErrorBanner }         from './ErrorBanner';

export function OpinionList() {
    const [opinions, setOpinions] = useState<Opinion[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState<string | null>(null);

    useEffect(() => {
        fetchOpinions()
            .then(data => { setOpinions(data.opinions ?? []); setLoading(false); })
            .catch(e  => { setError(String(e.message));       setLoading(false); });
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error)   return <ErrorBanner message={error} />;

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
                    <h2 className="list-heading">Recent Opinions ({opinions.length})</h2>
                    <ul className="opinion-list" aria-label="SCOTUS opinions">
                        {opinions.map(op => <OpinionCard key={op.docket} opinion={op} />)}
                    </ul>
                </>
            )}
        </>
    );
}
