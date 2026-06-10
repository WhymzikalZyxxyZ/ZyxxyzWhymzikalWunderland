import { useState, useRef, useEffect, useCallback } from 'react';
import type { CityResult } from '../App';

interface Props {
    onSelect: (city: CityResult) => void;
}

interface Suggestion {
    name:      string;
    center:    [number, number];
    bbox:      [number, number, number, number];
    placeType: string[];
}

export default function SearchBar({ onSelect }: Props) {
    const [query,       setQuery]       = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading,     setLoading]     = useState(false);
    const [open,        setOpen]        = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const search = useCallback(async (q: string) => {
        if (q.trim().length < 2) { setSuggestions([]); return; }
        setLoading(true);
        try {
            const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            const results: Suggestion[] = (data.features || []).map((f: {
                place_name: string;
                center:     [number, number];
                bbox?:      [number, number, number, number];
                place_type?: string[];
            }) => {
                const placeType = f.place_type ?? ['place'];
                const isAddress = placeType.includes('address');
                const delta     = isAddress ? 0.003 : 0.5;
                return {
                    name:      f.place_name,
                    center:    f.center,
                    placeType,
                    bbox:      f.bbox ?? [
                        f.center[0] - delta, f.center[1] - delta,
                        f.center[0] + delta, f.center[1] + delta,
                    ],
                };
            });
            setSuggestions(results);
            setOpen(true);
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 350);
    };

    const handleSelect = (s: Suggestion) => {
        setQuery(s.name.split(',')[0]);
        setSuggestions([]);
        setOpen(false);
        const zoom = s.placeType.includes('address') ? 17
                   : s.placeType.includes('postcode') ? 14
                   : 13;
        onSelect({ name: s.name, center: s.center, bbox: s.bbox, zoom });
    };

    // Cancel any pending debounce when the component unmounts.
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    // Close on outside click
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="search-wrap" ref={wrapRef}>
            <div className="search-input-row">
                <span className="search-icon">🔍</span>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Search address, city or ZIP…"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    autoComplete="off"
                />
                {loading && <span className="search-spinner" />}
            </div>
            {open && suggestions.length > 0 && (
                <ul className="suggestions">
                    {suggestions.map((s) => (
                        <li key={`${s.center[0]},${s.center[1]}`} className="suggestion-item" onMouseDown={() => handleSelect(s)}>
                            <span className="suggestion-icon">📍</span>
                            <span>{s.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
