import { useRef, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CityResult, ActiveFeature } from '../App';
import type { LayerName } from '../types/geojson';

interface Props {
    city:           CityResult | null;
    activeLayers:   Set<LayerName>;
    onFeatureClick: (f: ActiveFeature) => void;
}

// CARTO Voyager — free, no token required
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

const LAYER_COLORS: Record<LayerName, string> = {
    neighborhoods: '#f43f5e',
    schools:       '#3b82f6',
    superfund:     '#f97316',
    population:    '#2171b5',
};

const LAYER_TITLES: Record<LayerName, string> = {
    neighborhoods: 'Neighborhood',
    schools:       'School District',
    superfund:     'Superfund Site',
    population:    'Population Data',
};

const ALL_LAYERS: LayerName[] = ['neighborhoods', 'schools', 'superfund', 'population'];

// ── Popup HTML ────────────────────────────────────────────────────────────────
function row(label: string, value: unknown): string {
    const v = value != null && value !== '' ? String(value) : null;
    if (!v) return '';
    return `<div class="lp-row"><span class="lp-label">${label}</span><span class="lp-value">${v}</span></div>`;
}

function popupHtml(layer: LayerName, props: Record<string, unknown>): string {
    const color = LAYER_COLORS[layer];
    let body = '';

    if (layer === 'superfund') {
        body =
            row('Site',       props.name)      +
            row('NPL Status', props.nplStatus) +
            row('Address',    props.address)   +
            row('City',       props.city)      +
            row('State',      props.state);
    } else if (layer === 'population') {
        const pop = props.population != null
            ? Number(props.population).toLocaleString()
            : null;
        body =
            row('Population',   pop)                  +
            row('Density/km²',  props.densityPerKm2)  +
            row('Area (km²)',   props.areaKm2)         +
            row('ACS Year',     props.acsYear)         +
            row('Tract GEOID',  props.GEOID);
    } else {
        body =
            row('Name',  props.NAME)   +
            row('GEOID', props.GEOID)  +
            row('State', props.STUSAB);
    }

    return `
        <div class="lp-popup">
            <div class="lp-header" style="border-left:4px solid ${color}">
                ${LAYER_TITLES[layer]}
            </div>
            <div class="lp-body">${body || '<div class="lp-empty">No data</div>'}</div>
        </div>`;
}

// ── Population colour ramp (data-driven) ──────────────────────────────────────
function populationColorExpression(features: GeoJSON.Feature[]): maplibregl.ExpressionSpecification {
    const densities = features
        .map(f => (f.properties as { densityPerKm2?: number }).densityPerKm2 ?? 0)
        .filter(d => d > 0)
        .sort((a, b) => a - b);

    if (densities.length === 0) {
        return ['literal', '#f7fbff'] as maplibregl.ExpressionSpecification;
    }

    const q = (p: number) => densities[Math.floor((densities.length - 1) * p)] ?? 0;
    return [
        'interpolate', ['linear'], ['get', 'densityPerKm2'],
        0,       '#f7fbff',
        q(0.25), '#c6dbef',
        q(0.5),  '#6baed6',
        q(0.75), '#2171b5',
        q(0.9),  '#084594',
    ];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Map({ city, activeLayers, onFeatureClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<maplibregl.Map | null>(null);
    const pendingRef   = useRef<Set<LayerName>>(new Set());
    const popupRef     = useRef<maplibregl.Popup | null>(null);
    const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Init map ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;
        const map = new maplibregl.Map({
            container: containerRef.current,
            style:     MAP_STYLE,
            center:    [-98.58, 39.83],
            zoom:      4,
        });
        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-right');
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
    }, []);

    // ── Fly to city ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!city || !mapRef.current) return;
        mapRef.current.fitBounds(city.bbox, { padding: 60, maxZoom: 13 });
    }, [city]);

    // ── Fetch GeoJSON for current viewport ────────────────────────────────────
    const fetchLayer = useCallback(async (layer: LayerName, map: maplibregl.Map) => {
        const b = map.getBounds();
        const bbox = [
            Math.max(b.getWest(),  -180).toFixed(4),
            Math.max(b.getSouth(),  -90).toFixed(4),
            Math.min(b.getEast(),   180).toFixed(4),
            Math.min(b.getNorth(),   90).toFixed(4),
        ].join(',');

        const url = layer === 'population'
            ? `/api/population?bbox=${bbox}`
            : `/api/layers/${layer}?bbox=${bbox}`;

        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[Locator] "${layer}" fetch failed: HTTP ${res.status}`);
            return null;
        }
        return res.json() as Promise<GeoJSON.FeatureCollection>;
    }, []);

    // ── Add a layer to the map for the first time ─────────────────────────────
    const addLayer = useCallback(async (layer: LayerName, map: maplibregl.Map) => {
        const data = await fetchLayer(layer, map);
        if (!data) return;

        const srcId  = `src-${layer}`;
        const lyrId  = `lyr-${layer}`;
        const lineId = `lyr-${layer}-outline`;
        const color  = LAYER_COLORS[layer];

        // Upsert source
        if (map.getSource(srcId)) {
            (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(data);
        } else {
            map.addSource(srcId, { type: 'geojson', data });
        }

        if (map.getLayer(lyrId)) return; // already added

        const labelId = `lyr-${layer}-label`;

        if (layer === 'superfund') {
            map.addLayer({
                id: lyrId, type: 'circle', source: srcId,
                paint: {
                    'circle-color':        color,
                    'circle-radius':       8,
                    'circle-opacity':      0.9,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                },
            });
        } else if (layer === 'population') {
            map.addLayer({
                id: lyrId, type: 'fill', source: srcId,
                paint: {
                    'fill-color':   populationColorExpression(data.features),
                    'fill-opacity': 0.7,
                },
            });
            map.addLayer({
                id: lineId, type: 'line', source: srcId,
                paint: { 'line-color': 'rgba(0,0,0,0.15)', 'line-width': 0.5 },
            });
            // Label: density/km² at zoom 10-12, population count at zoom 13+
            // zoom must be the direct input to 'step' — cannot be nested in 'case'
            map.addLayer({
                id: labelId, type: 'symbol', source: srcId,
                minzoom: 10,
                layout: {
                    'text-field': [
                        'step', ['zoom'],
                        ['concat', ['to-string', ['get', 'densityPerKm2']], '/km²'],
                        13, ['concat', ['to-string', ['get', 'population']], ' ppl'],
                    ],
                    'text-size':             11,
                    'text-font':             ['Open Sans Regular'],
                    'text-anchor':           'center',
                    'text-allow-overlap':    false,
                    'text-ignore-placement': false,
                    'text-max-width':        6,
                },
                paint: {
                    'text-color':      '#0f172a',
                    'text-halo-color': 'rgba(255,255,255,0.85)',
                    'text-halo-width': 1.5,
                },
            });
        } else {
            // neighborhoods / schools — semi-transparent fill + bold outline
            map.addLayer({
                id: lyrId, type: 'fill', source: srcId,
                paint: { 'fill-color': color, 'fill-opacity': 0.2 },
            });
            map.addLayer({
                id: lineId, type: 'line', source: srcId,
                paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.85 },
            });
        }

        // Hover cursor
        map.on('mouseenter', lyrId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', lyrId, () => { map.getCanvas().style.cursor = '';         });

        // Click → popup + sidebar panel
        map.on('click', lyrId, (e) => {
            const feature = e.features?.[0];
            if (!feature) return;
            const props = feature.properties as Record<string, unknown>;

            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({ maxWidth: '300px', className: 'locator-popup' })
                .setLngLat(e.lngLat)
                .setHTML(popupHtml(layer, props))
                .addTo(map);

            onFeatureClick({ layer, properties: props });
        });
    }, [fetchLayer, onFeatureClick]);

    // ── Remove a layer ────────────────────────────────────────────────────────
    const removeLayer = useCallback((layer: LayerName, map: maplibregl.Map) => {
        const labelId = `lyr-${layer}-label`;
        const lineId  = `lyr-${layer}-outline`;
        const lyrId   = `lyr-${layer}`;
        const srcId   = `src-${layer}`;
        if (map.getLayer(labelId)) map.removeLayer(labelId);
        if (map.getLayer(lineId))  map.removeLayer(lineId);
        if (map.getLayer(lyrId))   map.removeLayer(lyrId);
        if (map.getSource(srcId))  map.removeSource(srcId);
    }, []);

    // ── Sync layers when activeLayers changes ─────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const sync = () => {
            for (const layer of activeLayers) {
                if (!map.getLayer(`lyr-${layer}`) && !pendingRef.current.has(layer)) {
                    pendingRef.current.add(layer);
                    addLayer(layer, map)
                        .catch(e => console.error(`[Locator] addLayer "${layer}":`, e))
                        .finally(() => pendingRef.current.delete(layer));
                }
            }
            for (const layer of ALL_LAYERS) {
                if (!activeLayers.has(layer) && map.getLayer(`lyr-${layer}`)) {
                    removeLayer(layer, map);
                }
            }
        };

        if (map.isStyleLoaded()) sync();
        else map.once('load', sync);
    }, [activeLayers, addLayer, removeLayer]);

    // ── Refresh data after map pan / zoom ─────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || activeLayers.size === 0) return;

        const onMoveEnd = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                for (const layer of activeLayers) {
                    if (pendingRef.current.has(layer)) continue;
                    const srcId = `src-${layer}`;
                    if (!map.getSource(srcId)) continue;

                    pendingRef.current.add(layer);
                    fetchLayer(layer, map)
                        .then(data => {
                            if (!data || !map.getSource(srcId)) return;
                            (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(data);
                            // Recalculate population colour ramp for new data
                            if (layer === 'population' && map.getLayer('lyr-population')) {
                                map.setPaintProperty(
                                    'lyr-population', 'fill-color',
                                    populationColorExpression(data.features),
                                );
                            }
                        })
                        .catch(e => console.error(`[Locator] refresh "${layer}":`, e))
                        .finally(() => pendingRef.current.delete(layer));
                }
            }, 400);
        };

        map.on('moveend', onMoveEnd);
        return () => {
            map.off('moveend', onMoveEnd);
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [activeLayers, fetchLayer]);

    return <div ref={containerRef} className="map" />;
}
