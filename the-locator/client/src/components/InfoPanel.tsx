import type { ActiveFeature } from '../App';

interface Props {
    feature: ActiveFeature;
    onClose: () => void;
}

const LAYER_LABELS: Record<string, string> = {
    neighborhoods: 'Neighborhood',
    schools:       'School District',
    superfund:     'Superfund Site',
    population:    'Population Data',
};

function Row({ label, value }: { label: string; value: unknown }) {
    if (value == null || value === '') return null;
    return (
        <div className="info-row">
            <span className="info-label">{label}</span>
            <span className="info-value">{String(value)}</span>
        </div>
    );
}

function renderProps(layer: string, props: Record<string, unknown>) {
    if (layer === 'superfund') return (
        <>
            <Row label="Site"       value={props.name} />
            <Row label="Status"     value={props.nplStatus} />
            <Row label="Address"    value={props.address} />
            <Row label="City"       value={props.city} />
            <Row label="State"      value={props.state} />
            <Row label="EPA ID"     value={props.epaId} />
        </>
    );
    if (layer === 'population') return (
        <>
            <Row label="Population"    value={props.population != null ? Number(props.population).toLocaleString() : null} />
            <Row label="Area (km²)"    value={props.areaKm2} />
            <Row label="Density / km²" value={props.densityPerKm2} />
            <Row label="ACS Year"      value={props.acsYear} />
            <Row label="Tract GEOID"   value={props.GEOID} />
        </>
    );
    // neighborhoods + schools
    return (
        <>
            <Row label="Name"  value={props.NAME} />
            <Row label="GEOID" value={props.GEOID} />
            <Row label="State" value={(props.STUSAB ?? props.STATE) as unknown} />
        </>
    );
}

export default function InfoPanel({ feature, onClose }: Props) {
    return (
        <div className="info-panel">
            <div className="info-header">
                <h3>{LAYER_LABELS[feature.layer] ?? feature.layer}</h3>
                <button className="info-close" onClick={onClose} aria-label="Close">✕</button>
            </div>
            <div className="info-body">
                {renderProps(feature.layer, feature.properties)}
            </div>
        </div>
    );
}
