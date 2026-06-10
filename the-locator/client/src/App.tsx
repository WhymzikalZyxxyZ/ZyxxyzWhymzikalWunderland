import { useState, useCallback, useMemo } from 'react';
import Map        from './components/Map';
import SearchBar  from './components/SearchBar';
import CityPicker from './components/CityPicker';
import LayerPanel from './components/LayerPanel';
import InfoPanel  from './components/InfoPanel';
import type { LayerName } from './types/geojson';

export interface CityResult {
    center: [number, number];
    bbox:   [number, number, number, number];
    name:   string;
    zoom?:  number;
}

export interface ActiveFeature {
    layer:      LayerName;
    properties: Record<string, unknown>;
}

export default function App() {
    const [city,          setCity]          = useState<CityResult | null>(null);
    const [activeLayers,  setActiveLayers]  = useState<Set<LayerName>>(new Set());
    const [activeFeature, setActiveFeature] = useState<ActiveFeature | null>(null);
    const [layerErrors,   setLayerErrors]   = useState<Partial<Record<LayerName, string>>>({});

    const isEmbed = useMemo(
        () => new URLSearchParams(window.location.search).get('embed') === '1',
        []
    );

    const toggleLayer = useCallback((layer: LayerName) => {
        setActiveLayers(prev => {
            const next = new Set(prev);
            next.has(layer) ? next.delete(layer) : next.add(layer);
            return next;
        });
        setActiveFeature(null);
        setLayerErrors(prev => { const n = { ...prev }; delete n[layer]; return n; });
    }, []);

    const handleLayerError = useCallback((layer: LayerName, error: string | null) => {
        setLayerErrors(prev => {
            const next = { ...prev };
            if (error === null) delete next[layer];
            else next[layer] = error;
            return next;
        });
    }, []);

    return (
        <div className={`app${isEmbed ? ' app--embed' : ''}`}>
            <aside className="sidebar">
                {!isEmbed && (
                    <div className="sidebar-header">
                        <span className="logo-pin">📍</span>
                        <h1>The Locator</h1>
                        <p className="tagline">Real estate district explorer</p>
                    </div>
                )}
                <SearchBar onSelect={setCity} />
                <CityPicker onSelect={setCity} />
                <LayerPanel activeLayers={activeLayers} onToggle={toggleLayer} layerErrors={layerErrors} />
                {activeFeature && (
                    <InfoPanel feature={activeFeature} onClose={() => setActiveFeature(null)} />
                )}
            </aside>
            <main className="map-wrap">
                <Map
                    city={city}
                    activeLayers={activeLayers}
                    onFeatureClick={setActiveFeature}
                    onLayerError={handleLayerError}
                />
            </main>
        </div>
    );
}
