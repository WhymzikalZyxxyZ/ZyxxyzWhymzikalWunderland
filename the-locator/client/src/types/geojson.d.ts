export interface NeighborhoodProperties {
    GEOID: string;
    NAME: string;
    STUSAB: string;
}

export interface SchoolDistrictProperties {
    GEOID: string;
    NAME: string;
    STATEFP: string;
    LOGRADE: string;
    HIGRADE: string;
}

export interface SuperfundProperties {
    name: string;
    nplStatus: 'listed' | 'proposed' | 'deleted' | 'non-npl';
    address: string;
    city: string;
    state: string;
    programSystemId: string;
}

export interface PopulationProperties {
    GEOID: string;
    population: number;
    areaKm2: number;
    densityPerKm2: number;
    acsYear: number;
}

export type LayerName = 'neighborhoods' | 'schools' | 'superfund' | 'population';

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
    properties?: NeighborhoodProperties | SchoolDistrictProperties | SuperfundProperties | PopulationProperties;
    visible?: boolean;
}
