export interface NeighborhoodProperties {
    GEOID: string;
    NAME: string;
    STUSAB: string;
}

export interface SchoolDistrictProperties {
    GEOID: string;
    NAME: string;
    STATE: string;
}

export interface SuperfundProperties {
    name: string;
    nplStatus: 'listed' | 'proposed' | 'deleted' | 'non-npl';
    address: string;
    city: string;
    state: string;
    epaId: string;
}

export interface PopulationProperties {
    GEOID: string;
    population: number;
    areaKm2: number;
    densityPerKm2: number;
    acsYear: number;
}

export interface WalkabilityProperties {
    GEOID10: string;
    natWalkInd: number;
    statAbbr: string;
}

export interface CityProperties {
    name: string;
    GEOID: string;
    state: string;
    population: number | null;
    acsYear: number | null;
}

export type LayerName = 'neighborhoods' | 'schools' | 'superfund' | 'population' | 'walkscore' | 'cities';

export interface EmbedCommand {
    action: 'flyTo' | 'setLayers' | 'toggleLayer';
    city?: string;
    layers?: LayerName[];
    layer?: LayerName;
    visible?: boolean;
}

export interface EmbedEvent {
    event: 'cityChanged' | 'featureClick' | 'layerToggled';
    city?: string;
    bbox?: [number, number, number, number];
    center?: [number, number];
    layer?: LayerName;
    properties?: Record<string, unknown>;
    visible?: boolean;
}
