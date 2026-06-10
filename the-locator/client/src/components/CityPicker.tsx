import type { CityResult } from '../App';

interface Props {
    onSelect: (city: CityResult) => void;
}

const CITIES: CityResult[] = [
    { name: 'Atlanta, GA',       center: [ -84.388,  33.749], bbox: [ -84.576,  33.647,  -84.289,  33.887] },
    { name: 'Austin, TX',        center: [ -97.743,  30.267], bbox: [ -97.924,  30.098,  -97.600,  30.517] },
    { name: 'Chicago, IL',       center: [ -87.629,  41.878], bbox: [ -87.941,  41.644,  -87.524,  42.069] },
    { name: 'Denver, CO',        center: [-104.990,  39.739], bbox: [-105.110,  39.614, -104.600,  39.914] },
    { name: 'Houston, TX',       center: [ -95.369,  29.760], bbox: [ -95.671,  29.524,  -94.921,  30.110] },
    { name: 'Los Angeles, CA',   center: [-118.243,  34.052], bbox: [-118.668,  33.703, -117.774,  34.337] },
    { name: 'Miami, FL',         center: [ -80.191,  25.774], bbox: [ -80.319,  25.709,  -80.131,  25.855] },
    { name: 'New York, NY',      center: [ -74.006,  40.713], bbox: [ -74.259,  40.477,  -73.700,  40.917] },
    { name: 'Phoenix, AZ',       center: [-112.074,  33.448], bbox: [-112.324,  33.290, -111.926,  33.666] },
    { name: 'San Francisco, CA', center: [-122.419,  37.774], bbox: [-122.514,  37.707, -122.357,  37.833] },
    { name: 'Seattle, WA',       center: [-122.332,  47.606], bbox: [-122.459,  47.492, -122.236,  47.734] },
    { name: 'Tucson, AZ',        center: [-110.926,  32.220], bbox: [-111.073,  32.059, -110.706,  32.372] },
];

export default function CityPicker({ onSelect }: Props) {
    return (
        <div className="city-picker">
            <p className="panel-title">Quick select</p>
            <div className="city-grid">
                {CITIES.map((city) => (
                    <button
                        key={city.name}
                        className="city-btn"
                        onClick={() => onSelect(city)}
                    >
                        {city.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
