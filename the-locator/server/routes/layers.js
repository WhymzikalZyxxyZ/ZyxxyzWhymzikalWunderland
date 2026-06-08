'use strict';

import { Router } from 'express';
import { getCache, setCache } from '../middleware/cache.js';
import { TTL } from '../config/ttl.js';

const router = Router();

const VALID_LAYERS = new Set(['neighborhoods', 'schools', 'superfund']);

// GET /api/layers/:name?bbox=minLng,minLat,maxLng,maxLat
router.get('/:name', async (req, res) => {
    const { name } = req.params;
    if (!VALID_LAYERS.has(name)) return res.status(404).json({ error: 'Unknown layer' });

    const bbox = parseBbox(req.query.bbox);
    if (!bbox) return res.status(400).json({ error: 'bbox parameter required (minLng,minLat,maxLng,maxLat)' });

    const cacheKey = `layer:${name}:${bbox.join(',')}`;
    const cached   = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let data;
    try {
        data = name === 'superfund'
            ? await fetchSuperfund(bbox)
            : await fetchCensusLayer(name, bbox);
    } catch (e) {
        return res.status(502).json({ error: 'Data source unavailable' });
    }

    await setCache(cacheKey, data, TTL[name === 'schools' ? 'schools' : name]);
    res.json(data);
});

function parseBbox(raw) {
    if (typeof raw !== 'string') return null;
    const parts = raw.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    const [minLng, minLat, maxLng, maxLat] = parts;
    // Validate within world bounds
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
    if (minLng >= maxLng || minLat >= maxLat) return null;
    return parts;
}

async function fetchCensusLayer(name, bbox) {
    const layer = name === 'schools' ? 'unifiedSchoolDistricts' : 'places';
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const url = `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/0/query`
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + `&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects`
        + `&outFields=GEOID,NAME,STUSAB&f=geojson`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Census API error');
    return r.json();
}

async function fetchSuperfund([minLng, minLat, maxLng, maxLat]) {
    const url = `https://ofmpub.epa.gov/frs_public2/frs_rest_services.get_facilities`
        + `?latitude83=${minLat}&longitude83=${minLng}`
        + `&latitude83_max=${maxLat}&longitude83_max=${maxLng}`
        + `&program_acronym=CERCLIS&output=JSON`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('EPA API error');
    const data = await r.json();
    // Normalize to GeoJSON FeatureCollection
    const features = (data.Results?.FRSFacility || []).map(f => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(f.LONGITUDE83), parseFloat(f.LATITUDE83)] },
        properties: {
            name:            f.PRIMARY_NAME,
            nplStatus:       f.NPL_STATUS_IND || 'non-npl',
            address:         f.LOCATION_ADDRESS,
            city:            f.CITY_NAME,
            state:           f.STATE_CODE,
            programSystemId: f.PGM_SYS_ID,
        },
    }));
    return { type: 'FeatureCollection', features };
}

export default router;
