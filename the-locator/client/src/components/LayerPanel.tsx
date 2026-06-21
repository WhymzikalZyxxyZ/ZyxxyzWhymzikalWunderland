import type { LayerName } from '../types/geojson';

interface Props {
    activeLayers:    Set<LayerName>;
    onToggle:        (layer: LayerName) => void;
    layerErrors?:    Partial<Record<LayerName, string>>;
    populationYear:  number;
    onYearChange:    (year: number) => void;
}

const LAYERS: { id: LayerName; label: string; color: string; desc: string }[] = [
    { id: 'neighborhoods', label: 'Neighborhoods',    color: '#22c55e', desc: 'Census-designated district boundaries'                           },
    { id: 'schools',       label: 'School Districts', color: '#3b82f6', desc: 'Unified school district boundaries'                              },
    { id: 'cities',        label: 'City Limits',      color: '#f59e0b', desc: 'Incorporated city and town boundaries with ACS population counts' },
    { id: 'superfund',     label: 'Superfund Sites',  color: '#ef4444', desc: 'EPA CERCLIS contamination sites'                                 },
    { id: 'population',    label: 'Population',       color: '#2171b5', desc: 'Density per km² by census tract'                                 },
    { id: 'walkscore',     label: 'Walkability',      color: '#4ade80', desc: 'EPA National Walkability Index by block group'                   },
    { id: 'transit',       label: 'Transit Stops',    color: '#06b6d4', desc: 'Bus stops, rail stations, and subway entrances (OpenStreetMap)'  },
];

// ACS 5-year estimates run from 2009 to 2024 (2024 estimates released Dec 2025).
const ACS_MIN_YEAR = 2009;
const ACS_MAX_YEAR = 2024;
const ACS_YEARS = Array.from({ length: ACS_MAX_YEAR - ACS_MIN_YEAR + 1 }, (_, i) => ACS_MAX_YEAR - i);

export default function LayerPanel({ activeLayers, onToggle, layerErrors, populationYear, onYearChange }: Props) {
    return (
        <div className="layer-panel">
            <h2 className="panel-title">Layers</h2>
            {LAYERS.map(({ id, label, color, desc }) => {
                const active = activeLayers.has(id);
                const error  = layerErrors?.[id];
                return (
                    <div key={id}>
                        <button
                            className={`layer-btn ${active ? 'layer-btn--active' : ''}`}
                            onClick={() => onToggle(id)}
                            title={desc}
                        >
                            <span className="layer-swatch" style={{ background: color }} />
                            <span className="layer-label">{label}</span>
                            <span className={`layer-toggle ${active ? 'on' : ''}`} />
                        </button>
                        {((id === 'population' && active) ||
                          (id === 'cities'     && active && !activeLayers.has('population'))) && (
                            <div className="layer-year-row">
                                <label className="layer-year-label" htmlFor="pop-year">ACS year</label>
                                <select
                                    id="pop-year"
                                    className="layer-year-select"
                                    value={populationYear}
                                    onChange={e => onYearChange(Number(e.target.value))}
                                >
                                    {ACS_YEARS.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {error && (
                            <p className="layer-error" title={error}>
                                ⚠ Unavailable
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
