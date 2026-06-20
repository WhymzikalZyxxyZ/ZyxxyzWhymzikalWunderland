import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Map        from './components/Map';
import SearchBar  from './components/SearchBar';
import CityPicker from './components/CityPicker';
import LayerPanel from './components/LayerPanel';
import InfoPanel  from './components/InfoPanel';
import HelpPanel  from './components/HelpPanel';
import Legend     from './components/Legend';
import type { LayerName, EmbedCommand, EmbedEvent } from './types/geojson';

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

const VALID_LAYERS = new Set<LayerName>(['neighborhoods', 'schools', 'superfund', 'population', 'walkscore']);

export default function App() {
    const [city,          setCity]          = useState<CityResult | null>(null);
    const [activeLayers,  setActiveLayers]  = useState<Set<LayerName>>(new Set());
    const [activeFeature, setActiveFeature] = useState<ActiveFeature | null>(null);
    const [layerErrors,   setLayerErrors]   = useState<Partial<Record<LayerName, string>>>({});

    const isEmbed = useMemo(
        () => new URLSearchParams(window.location.search).get('embed') === '1',
        []
    );

    const emitEmbed = useCallback((event: EmbedEvent) => {
        if (isEmbed) window.parent.postMessage(event, '*');
    }, [isEmbed]);

    // ── Emit outbound embed events when state changes ─────────────────────────
    useEffect(() => {
        if (!isEmbed || !city) return;
        emitEmbed({ event: 'cityChanged', city: city.name, center: city.center, bbox: city.bbox });
    }, [city, isEmbed, emitEmbed]);

    useEffect(() => {
        if (!isEmbed || !activeFeature) return;
        emitEmbed({ event: 'featureClick', layer: activeFeature.layer, properties: activeFeature.properties });
    }, [activeFeature, isEmbed, emitEmbed]);

    const prevLayersRef = useRef(new Set<LayerName>());
    useEffect(() => {
        if (!isEmbed) return;
        const prev = prevLayersRef.current;
        for (const layer of activeLayers) {
            if (!prev.has(layer)) emitEmbed({ event: 'layerToggled', layer, visible: true });
        }
        for (const layer of prev) {
            if (!activeLayers.has(layer)) emitEmbed({ event: 'layerToggled', layer, visible: false });
        }
        prevLayersRef.current = new Set(activeLayers);
    }, [activeLayers, isEmbed, emitEmbed]);

    // ── Handlers ──────────────────────────────────────────────────────────────
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

    // ── Inbound embed command listener ────────────────────────────────────────
    useEffect(() => {
        if (!isEmbed) return;

        const handler = async (e: MessageEvent) => {
            if (!e.data || typeof e.data !== 'object') return;
            const cmd = e.data as EmbedCommand;

            if (cmd.action === 'flyTo' && cmd.city) {
                try {
                    const res  = await fetch(`/api/search?q=${encodeURIComponent(cmd.city)}`);
                    const data = await res.json() as { features?: Array<{
                        place_name: string;
                        center: [number, number];
                        bbox?: [number, number, number, number];
                        place_type?: string[];
                    }> };
                    const f = data.features?.[0];
                    if (!f) return;
                    const zoom  = f.place_type?.includes('address') ? 17 : 13;
                    const delta = 0.5;
                    setCity({
                        name:   f.place_name,
                        center: f.center,
                        bbox:   f.bbox ?? [f.center[0] - delta, f.center[1] - delta,
                                           f.center[0] + delta, f.center[1] + delta],
                        zoom,
                    });
                } catch { /* ignore */ }
            } else if (cmd.action === 'setLayers' && Array.isArray(cmd.layers)) {
                setActiveLayers(new Set(cmd.layers.filter((l): l is LayerName => VALID_LAYERS.has(l as LayerName))));
            } else if (cmd.action === 'toggleLayer' && cmd.layer && VALID_LAYERS.has(cmd.layer)) {
                if (typeof cmd.visible === 'boolean') {
                    setActiveLayers(prev => {
                        const next = new Set(prev);
                        cmd.visible ? next.add(cmd.layer!) : next.delete(cmd.layer!);
                        return next;
                    });
                } else {
                    toggleLayer(cmd.layer);
                }
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [isEmbed, toggleLayer]);

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
                <HelpPanel />
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
                <Legend activeLayers={activeLayers} />
            </main>
        </div>
    );
}
