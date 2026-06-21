import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Map             from './components/Map';
import SearchBar       from './components/SearchBar';
import CityPicker      from './components/CityPicker';
import LayerPanel      from './components/LayerPanel';
import InfoPanel       from './components/InfoPanel';
import HelpPanel       from './components/HelpPanel';
import Legend          from './components/Legend';
import BannerStrip     from './components/BannerStrip';
import ShareButton     from './components/ShareButton';
import SavedLocations  from './components/SavedLocations';
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

const VALID_LAYERS = new Set<LayerName>(['neighborhoods', 'schools', 'cities', 'superfund', 'population', 'walkscore', 'transit']);

export default function App() {
    const [city,           setCity]          = useState<CityResult | null>(null);
    const [activeLayers,   setActiveLayers]  = useState<Set<LayerName>>(new Set<LayerName>(['population']));
    const [activeFeature,  setActiveFeature] = useState<ActiveFeature | null>(null);
    const [layerErrors,    setLayerErrors]   = useState<Partial<Record<LayerName, string>>>({});
    const [populationYear, setPopulationYear] = useState<number>(2024);
    const [sidebarOpen,    setSidebarOpen]   = useState<boolean>(false);

    const isEmbed = useMemo(
        () => new URLSearchParams(window.location.search).get('embed') === '1',
        []
    );

    /* v8 ignore next 3 */
    const emitEmbed = useCallback((event: EmbedEvent) => {
        if (isEmbed) window.parent.postMessage(event, '*');
    }, [isEmbed]);

    // ── Emit outbound embed events when state changes ─────────────────────────
    /* v8 ignore next 3 */
    useEffect(() => {
        if (!isEmbed || !city) return;
        emitEmbed({ event: 'cityChanged', city: city.name, center: city.center, bbox: city.bbox });
    }, [city, isEmbed, emitEmbed]);

    /* v8 ignore next 3 */
    useEffect(() => {
        if (!isEmbed || !activeFeature) return;
        emitEmbed({ event: 'featureClick', layer: activeFeature.layer, properties: activeFeature.properties });
    }, [activeFeature, isEmbed, emitEmbed]);

    const prevLayersRef = useRef(new Set<LayerName>());
    /* v8 ignore next 9 */
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

    // ── URL state sync ────────────────────────────────────────────────────────
    // Read URL params on first mount to restore a shared view
    useEffect(() => {
        const p    = new URLSearchParams(window.location.search);
        const lat  = parseFloat(p.get('lat') ?? '');
        const lng  = parseFloat(p.get('lng') ?? '');
        const zoom = parseFloat(p.get('zoom') ?? '') || 13;
        if (!isNaN(lat) && !isNaN(lng)) {
            const delta = zoom >= 13 ? 0.05 : 0.5;
            setCity({
                name:   p.get('place') ?? 'Shared View',
                center: [lng, lat],
                bbox:   [lng - delta, lat - delta, lng + delta, lat + delta],
                zoom,
            });
        }
        const layersParam = p.get('layers');
        if (layersParam) {
            const layers = layersParam.split(',')
                .filter((l): l is LayerName => VALID_LAYERS.has(l as LayerName));
            if (layers.length > 0) setActiveLayers(new Set(layers));
        }
        const yr = parseInt(p.get('year') ?? '', 10);
        if (yr >= 2009 && yr <= 2024) setPopulationYear(yr);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Write URL params whenever relevant state changes
    useEffect(() => {
        if (!city) return;
        const p = new URLSearchParams();
        p.set('lat',    city.center[1].toFixed(5));
        p.set('lng',    city.center[0].toFixed(5));
        if (city.zoom)              p.set('zoom',  String(city.zoom));
        if (city.name !== 'Shared View') p.set('place', city.name);
        if (activeLayers.size > 0)  p.set('layers', [...activeLayers].join(','));
        p.set('year', String(populationYear));
        history.replaceState(null, '', `?${p}`);
    }, [city, activeLayers, populationYear]);

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

    const handleRestore = useCallback((restoredCity: CityResult, layers: Set<LayerName>, year: number) => {
        setCity(restoredCity);
        setActiveLayers(layers);
        setPopulationYear(year);
        setSidebarOpen(false);
    }, []);

    // ── Inbound embed command listener ────────────────────────────────────────
    useEffect(() => {
        if (!isEmbed) return;

        /* v8 ignore next 42 */
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
            {!isEmbed && <BannerStrip />}
            <div className="app-body">
                {/* Mobile sidebar backdrop */}
                {sidebarOpen && (
                    <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
                )}

                <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
                    {!isEmbed && (
                        <div className="sidebar-header">
                            <span className="logo-pin">📍</span>
                            <h1>The Locator</h1>
                            <p className="tagline">Real estate district explorer</p>
                        </div>
                    )}
                    <SearchBar onSelect={setCity} />
                    <CityPicker onSelect={setCity} />
                    <ShareButton />
                    <SavedLocations
                        city={city}
                        activeLayers={activeLayers}
                        populationYear={populationYear}
                        onRestore={handleRestore}
                    />
                    <HelpPanel />
                    <LayerPanel
                        activeLayers={activeLayers}
                        onToggle={toggleLayer}
                        layerErrors={layerErrors}
                        populationYear={populationYear}
                        onYearChange={setPopulationYear}
                    />
                    {activeFeature && (
                        <InfoPanel feature={activeFeature} onClose={() => setActiveFeature(null)} />
                    )}
                </aside>

                <main className="map-wrap">
                    {!isEmbed && (
                        <button
                            className="sidebar-toggle"
                            onClick={() => setSidebarOpen(o => !o)}
                            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                        >
                            {sidebarOpen ? '✕' : '☰'}
                        </button>
                    )}
                    <Map
                        city={city}
                        activeLayers={activeLayers}
                        onFeatureClick={setActiveFeature}
                        onLayerError={handleLayerError}
                        onOpenSidebar={() => setSidebarOpen(true)}
                        populationYear={populationYear}
                    />
                    <Legend activeLayers={activeLayers} />
                </main>
            </div>
        </div>
    );
}
