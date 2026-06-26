import type { LayerName } from '../types/geojson';

interface Props {
    activeLayers: Set<LayerName>;
}

const LAYER_COLORS: Record<LayerName, string> = {
    counties:      '#22c55e',
    schools:       '#3b82f6',
    cities:        '#f59e0b',
    superfund:     '#ef4444',
    population:    '#2171b5',
    walkscore:     '#4ade80',
    transit:       '#06b6d4',
};

const LAYER_LABELS: Record<LayerName, string> = {
    counties:      'Counties',
    schools:       'School Districts',
    cities:        'City Limits',
    superfund:     'Superfund Sites',
    population:    'Population Density',
    walkscore:     'Walkability Index',
    transit:       'Transit Stops',
};

const RENDER_ORDER: LayerName[] = ['counties', 'schools', 'cities', 'superfund', 'population', 'walkscore', 'transit'];

export default function Legend({ activeLayers }: Props) {
    const visible = RENDER_ORDER.filter(l => activeLayers.has(l));
    if (visible.length === 0) return null;

    return (
        <div className="map-legend" aria-label="Map legend">
            {visible.map(layer => {
                if (layer === 'population') return (
                    <div key={layer} className="legend-item">
                        <span className="legend-label">{LAYER_LABELS[layer]}</span>
                        <div className="legend-ramp">
                            <div className="legend-ramp-bar legend-ramp-population" />
                            <div className="legend-ramp-ticks">
                                <span>Low</span>
                                <span>High</span>
                            </div>
                        </div>
                    </div>
                );
                if (layer === 'walkscore') return (
                    <div key={layer} className="legend-item">
                        <span className="legend-label">{LAYER_LABELS[layer]}</span>
                        <div className="legend-ramp">
                            <div className="legend-ramp-bar legend-ramp-walkscore" />
                            <div className="legend-ramp-ticks">
                                <span>1</span>
                                <span>20</span>
                            </div>
                        </div>
                    </div>
                );
                return (
                    <div key={layer} className="legend-item legend-item--swatch">
                        <span className="legend-swatch" style={{ background: LAYER_COLORS[layer] }} />
                        <span className="legend-label">{LAYER_LABELS[layer]}</span>
                    </div>
                );
            })}
        </div>
    );
}
