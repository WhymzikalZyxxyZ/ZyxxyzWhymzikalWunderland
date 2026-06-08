'use strict';

import { Router } from 'express';
import { getCache, setCache } from '../middleware/cache.js';
import { TTL } from '../config/ttl.js';

const router = Router();

// GET /api/population?bbox=minLng,minLat,maxLng,maxLat
// Returns census tract polygons with population and density properties.
router.get('/', async (req, res) => {
    const bbox = parseBbox(req.query.bbox);
    if (!bbox) return res.status(400).json({ error: 'bbox parameter required (minLng,minLat,maxLng,maxLat)' });

    const cacheKey = `population:${bbox.join(',')}`;
    const cached   = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let data;
    try {
        data = await fetchPopulation(bbox);
    } catch {
        return res.status(502).json({ error: 'Census API unavailable' });
    }

    await setCache(cacheKey, data, TTL.population);
    res.json(data);
});

function parseBbox(raw) {
    if (typeof raw !== 'string') return null;
    const parts = raw.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
    if (minLng >= maxLng || minLat >= maxLat) return null;
    return parts;
}

async function fetchPopulation([minLng, minLat, maxLng, maxLat]) {
    const year    = process.env.ACS_YEAR || '2022';
    const apiKey  = process.env.CENSUS_API_KEY || '';

    // Step 1: fetch population counts from ACS for tracts in bbox
    const acsUrl  = `https://api.census.gov/data/${year}/acs/acs5`
        + `?get=B01003_001E,NAME&for=tract:*&in=state:*`
        + `&key=${apiKey}`;

    // Step 2: fetch tract geometries from TIGER
    const geoUrl  = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query`
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
        + `&outFields=GEOID,AREALAND&returnGeometry=true&f=geojson`;

    const [acsRes, geoRes] = await Promise.all([fetch(acsUrl), fetch(geoUrl)]);
    if (!acsRes.ok || !geoRes.ok) throw new Error('Census data fetch failed');

    const [acsData, geoData] = await Promise.all([acsRes.json(), geoRes.json()]);

    // Build population lookup keyed by full GEOID (state+county+tract)
    const [header, ...rows] = acsData;
    const popByGeoid = new Map(
        rows.map(row => {
            const pop    = parseInt(row[0], 10);
            const state  = row[2].padStart(2, '0');
            const county = row[3].padStart(3, '0');
            const tract  = row[4].padStart(6, '0');
            return [`${state}${county}${tract}`, pop];
        })
    );

    // Attach population + density to each tract feature
    const features = geoData.features.map(f => {
        const geoid      = f.properties.GEOID;
        const population = popByGeoid.get(geoid) ?? 0;
        const areaKm2    = (f.properties.AREALAND || 0) / 1_000_000;
        return {
            ...f,
            properties: {
                GEOID:          geoid,
                population,
                areaKm2:        +areaKm2.toFixed(2),
                densityPerKm2:  areaKm2 > 0 ? +(population / areaKm2).toFixed(1) : 0,
                acsYear:        parseInt(year, 10),
            },
        };
    });

    return { type: 'FeatureCollection', features };
}

export default router;
