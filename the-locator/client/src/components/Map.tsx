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

const LAYER_PAINT: Record<string, maplibregl.FillLayerSpecification['paint'] | maplibregl.CircleLayerSpecification['paint']> = {
    neighborhoods: { 'fill-color': '#f43f5e', 'fill-opacity': 0.15, 'fill-outline-color': '#f43f5e' } as maplibregl.FillLayerSpecification['paint'],
    schools:       { 'fill-color': '#3b82f6', 'fill-opacity': 0.15, 'fill-outline-color': '#3b82f6' } as maplibregl.FillLayerSpecification['paint'],
    superfund:     { 'circle-color': '#ef4444', 'circle-radius': 7, 'circle-opacity': 0.85, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff' } as maplibregl.CircleLayerSpecification['paint'],
    population:    { 'fill-opacity': 0.6, 'fill-outline-color': 'rgba(0,0,0,0.1)' } as maplibregl.FillLayerSpecification['paint'],
};

function populationColorExpression(features: GeoJSON.Feature[]): maplibregl.ExpressionSpecification {
    const densities = features
        .map(f => (f.properties as { densityPerKm2: number }).densityPerKm2)
        .filter(Boolean)
        .sort((a, b) => a - b);
    const q = (p: number) => densities[Math.floor(densities.length * p)] ?? 0;
    return [
        'interpolate', ['linear'],
        ['get', 'densityPerKm2'],
        0,       '#f7fbff',
        q(0.2),  '#c6dbef',
        q(0.4),  '#6baed6',
        q(0.6),  '#2171b5',
        q(0.8),  '#084594',
    ];
}

export default function Map({ city, activeLayers, onFeatureClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<maplibregl.Map | null>(null);
    const loadedRef    = useRef<Set<LayerName>>(new Set());

    // Initialise map
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

    // Fly to city
    useEffect(() => {
        if (!city || !mapRef.current) return;
        mapRef.current.fitBounds(city.bbox, { padding: 60, maxZoom: 13 });
    }, [city]);

    // Fetch GeoJSON for a layer
    const fetchLayer = useCallback(async (layer: LayerName, map: maplibregl.Map) => {
        const bounds = map.getBounds();
        const bbox   = [
            bounds.getWest().toFixed(4),
            bounds.getSouth().toFixed(4),
            bounds.getEast().toFixed(4),
            bounds.getNorth().toFixed(4),
        ].join(',');

        const endpoint = layer === 'population'
            ? `/api/population?bbox=${bbox}`
            : `/api/layers/${layer}?bbox=${bbox}`;

        const res  = await fetch(endpoint);
        if (!res.ok) return null;
        return res.json() as Promise<GeoJSON.FeatureCollection>;
    }, []);

    // Add a layer to the map
    const addLayer = useCallback(async (layer: LayerName, map: maplibregl.Map) => {
        const data = await fetchLayer(layer, map);
        if (!data) return;

        const sourceId = `src-${layer}`;
        const layerId  = `lyr-${layer}`;

        if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
            map.addSource(sourceId, { type: 'geojson', data });
        }

        if (!map.getLayer(layerId)) {
            const isPoint = layer === 'superfund';
            const paint   = layer === 'population'
                ? { ...LAYER_PAINT.population, 'fill-color': populationColorExpression(data.features) }
                : LAYER_PAINT[layer];

            if (isPoint) {
                map.addLayer({ id: layerId, type: 'circle', source: sourceId, paint: paint as maplibregl.CircleLayerSpecification['paint'] });
            } else {
                map.addLayer({ id: layerId, type: 'fill',   source: sourceId, paint: paint as maplibregl.FillLayerSpecification['paint']   });
            }

            map.on('click', layerId, (e) => {
                const feature = e.features?.[0];
                if (feature) onFeatureClick({ layer, properties: feature.properties as Record<string, unknown> });
            });
            map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
        }
    }, [fetchLayer, onFeatureClick]);

    // Remove a layer from the map
    const removeLayer = useCallback((layer: LayerName, map: maplibregl.Map) => {
        const layerId  = `lyr-${layer}`;
        const sourceId = `src-${layer}`;
        if (map.getLayer(layerId))  map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
    }, []);

    // Sync active layers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const sync = () => {
            const current = loadedRef.current;
            // Add newly activated layers
            for (const layer of activeLayers) {
                if (!current.has(layer)) {
                    addLayer(layer, map);
                    current.add(layer);
                }
            }
            // Remove deactivated layers
            for (const layer of current) {
                if (!activeLayers.has(layer)) {
                    removeLayer(layer, map);
                    current.delete(layer);
                }
            }
        };

        if (map.isStyleLoaded()) sync();
        else map.once('load', sync);
    }, [activeLayers, addLayer, removeLayer]);

    return <div ref={containerRef} className="map" />;
}
