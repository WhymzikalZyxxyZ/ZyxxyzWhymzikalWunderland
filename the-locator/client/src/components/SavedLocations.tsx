import { useState, useEffect, useCallback } from 'react';
import type { CityResult } from '../App';
import type { LayerName } from '../types/geojson';

interface SavedLocation {
    id:           string;
    label:        string;
    center:       [number, number];
    bbox:         [number, number, number, number];
    zoom?:        number;
    layers:       LayerName[];
    year:         number;
    savedAt:      string;
}

interface Props {
    city:          CityResult | null;
    activeLayers:  Set<LayerName>;
    populationYear: number;
    onRestore:     (city: CityResult, layers: Set<LayerName>, year: number) => void;
}

const STORAGE_KEY = 'locator-saved-locations';

function load(): SavedLocation[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    /* v8 ignore next */
    catch { return []; }
}

function save(items: SavedLocation[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
    /* v8 ignore next */
    catch { /* storage full */ }
}

export default function SavedLocations({ city, activeLayers, populationYear, onRestore }: Props) {
    const [items,    setItems]   = useState<SavedLocation[]>(load);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => { save(items); }, [items]);

    const saveCurrentView = useCallback(() => {
        if (!city) return;
        const entry: SavedLocation = {
            id:      crypto.randomUUID(),
            label:   city.name,
            center:  city.center,
            bbox:    city.bbox,
            zoom:    city.zoom,
            layers:  [...activeLayers],
            year:    populationYear,
            savedAt: new Date().toISOString(),
        };
        setItems(prev => [entry, ...prev].slice(0, 20)); // cap at 20
    }, [city, activeLayers, populationYear]);

    const remove = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const restore = useCallback((item: SavedLocation) => {
        onRestore(
            { name: item.label, center: item.center, bbox: item.bbox, zoom: item.zoom },
            new Set(item.layers),
            item.year,
        );
    }, [onRestore]);

    return (
        <div className="saved-locations">
            <div className="saved-header" onClick={() => setExpanded(e => !e)}>
                <span className="panel-title" style={{ marginBottom: 0 }}>Saved Views</span>
                <span className="saved-toggle">{expanded ? '▲' : '▼'}</span>
            </div>
            {expanded && (
                <div className="saved-body">
                    <button
                        className="save-current-btn"
                        onClick={saveCurrentView}
                        disabled={!city}
                        title={city ? 'Save current view' : 'Navigate to a location first'}
                    >
                        + Save current view
                    </button>
                    {items.length === 0 ? (
                        <p className="saved-empty">No saved views yet.</p>
                    ) : (
                        <ul className="saved-list">
                            {items.map(item => (
                                <li key={item.id} className="saved-item">
                                    <button className="saved-item-restore" onClick={() => restore(item)} title="Restore this view">
                                        <span className="saved-item-label">{item.label}</span>
                                        <span className="saved-item-meta">
                                            {item.layers.length} layer{item.layers.length !== 1 ? 's' : ''} · {item.year}
                                        </span>
                                    </button>
                                    <button className="saved-item-delete" onClick={() => remove(item.id)} aria-label={`Delete ${item.label}`}>✕</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
