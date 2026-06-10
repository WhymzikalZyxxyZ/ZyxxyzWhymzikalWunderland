import type { LayerName } from '../types/geojson';

interface Props {
    activeLayers: Set<LayerName>;
    onToggle:     (layer: LayerName) => void;
    layerErrors?: Partial<Record<LayerName, string>>;
}

const LAYERS: { id: LayerName; label: string; color: string; desc: string }[] = [
    { id: 'neighborhoods', label: 'Neighborhoods',    color: '#f43f5e', desc: 'Census-designated district boundaries' },
    { id: 'schools',       label: 'School Districts', color: '#3b82f6', desc: 'Unified school district boundaries'    },
    { id: 'superfund',     label: 'Superfund Sites',  color: '#ef4444', desc: 'EPA CERCLIS contamination sites'       },
    { id: 'population',    label: 'Population',       color: '#2171b5', desc: 'Density per km² by census tract'      },
];

export default function LayerPanel({ activeLayers, onToggle, layerErrors }: Props) {
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
