'use strict';

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
    'https://zyxwonderland.xyz',
    'https://www.zyxwonderland.xyz',
]);

function corsHeaders(origin) {
    if (!ALLOWED_ORIGINS.has(origin)) return {};
    return {
        'Access-Control-Allow-Origin':  origin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age':       '86400',
        'Vary':                         'Origin',
    };
}

// ── Security headers ──────────────────────────────────────────────────────────
const SEC_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options':        'DENY',
    'Referrer-Policy':        'no-referrer',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...SEC_HEADERS, ...extraHeaders },
    });
}

function err(msg, status = 400, extraHeaders = {}) {
    return json({ error: msg }, status, extraHeaders);
}

// ── Per-IP rate limiter (in-memory per isolate) ───────────────────────────────
const _ipLimits = new Map();

function ipAllow(ip, max, windowMs = 60_000) {
    const now = Date.now();
    const e   = _ipLimits.get(ip);
    if (!e || now > e.reset) { _ipLimits.set(ip, { count: 1, reset: now + windowMs }); return true; }
    if (e.count >= max) return false;
    e.count++;
    return true;
}

// ── KV cache ──────────────────────────────────────────────────────────────────
async function getCache(env, key) {
    try { const v = await env.LOCATOR_CACHE.get(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
}

async function setCache(env, key, value, ttl) {
    try { await env.LOCATOR_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl }); }
    catch { /* non-fatal */ }
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const US_BOUNDS = { minLng: -180, minLat: 18, maxLng: -66, maxLat: 72 };

function sanitizeQuery(raw) {
    if (typeof raw !== 'string') return null;
    return raw.trim().slice(0, 100).replace(/[^a-zA-Z0-9 ,.\-]/g, '') || null;
}

function parseBbox(raw) {
    if (typeof raw !== 'string') return null;
    const parts = raw.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return null;
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
    if (minLng >= maxLng || minLat >= maxLat) return null;
    return parts;
}

function withinUS(coord) {
    const [lng, lat] = Array.isArray(coord) ? coord : [coord.longitude, coord.latitude];
    return lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng
        && lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat;
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleSearch(request, env, ip) {
    if (!ipAllow(ip, 30)) return err('Search rate limit reached — try again shortly', 429);

    const q = sanitizeQuery(new URL(request.url).searchParams.get('q'));
    if (!q) return err('q parameter is required');

    const cacheKey = `geocode:${q.toLowerCase()}`;
    const cached   = await getCache(env, cacheKey);
    if (cached) return json(cached);

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        + `?types=place,postcode&country=us&access_token=${env.MAPBOX_TOKEN}`;

    const upstream = await fetch(url);
    if (!upstream.ok) return err('Geocoding service unavailable', 502);

    const data     = await upstream.json();
    const features = (data.features || []).filter(f => withinUS(f.center));
    const result   = { features };

    await setCache(env, cacheKey, result, 3_600);
    return json(result);
}

const VALID_LAYERS = new Set(['neighborhoods', 'schools', 'superfund']);
const LAYER_TTL    = { neighborhoods: 86_400, schools: 86_400, superfund: 21_600 };

async function handleLayer(layerName, request, env, ip) {
    if (!VALID_LAYERS.has(layerName)) return err('Unknown layer', 404);
    if (!ipAllow(ip, 60)) return err('Too many requests — slow down', 429);

    const bbox = parseBbox(new URL(request.url).searchParams.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');

    const cacheKey = `layer:${layerName}:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached) return json(cached);

    let data;
    try {
        data = layerName === 'superfund'
            ? await fetchSuperfund(bbox)
            : await fetchCensusLayer(layerName, bbox);
    } catch {
        return err('Data source unavailable', 502);
    }

    await setCache(env, cacheKey, data, LAYER_TTL[layerName]);
    return json(data);
}

async function handlePopulation(request, env, ip) {
    if (!ipAllow(ip, 30)) return err('Too many requests — slow down', 429);

    const bbox = parseBbox(new URL(request.url).searchParams.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');

    const cacheKey = `population:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached) return json(cached);

    let data;
    try { data = await fetchPopulation(bbox, env); }
    catch { return err('Census API unavailable', 502); }

    await setCache(env, cacheKey, data, 86_400);
    return json(data);
}

// ── External data fetchers ────────────────────────────────────────────────────

async function fetchCensusLayer(name, [minLng, minLat, maxLng, maxLat]) {
    const url = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/0/query'
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=GEOID,NAME,STUSAB&f=geojson';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Census error');
    return r.json();
}

async function fetchSuperfund([minLng, minLat, maxLng, maxLat]) {
    const url = 'https://ofmpub.epa.gov/frs_public2/frs_rest_services.get_facilities'
        + `?latitude83=${minLat}&longitude83=${minLng}`
        + `&latitude83_max=${maxLat}&longitude83_max=${maxLng}`
        + '&program_acronym=CERCLIS&output=JSON';
    const r = await fetch(url);
    if (!r.ok) throw new Error('EPA error');
    const data = await r.json();
    const features = (data.Results?.FRSFacility || [])
        .filter(f => f.LATITUDE83 && f.LONGITUDE83)
        .map(f => ({
            type:     'Feature',
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

async function fetchPopulation([minLng, minLat, maxLng, maxLat], env) {
    const year   = env.ACS_YEAR || '2022';
    const apiKey = env.CENSUS_API_KEY || '';

    const acsUrl = `https://api.census.gov/data/${year}/acs/acs5`
        + `?get=B01003_001E,NAME&for=tract:*&in=state:*&key=${apiKey}`;
    const geoUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query'
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=GEOID,AREALAND&returnGeometry=true&f=geojson';

    const [acsRes, geoRes] = await Promise.all([fetch(acsUrl), fetch(geoUrl)]);
    if (!acsRes.ok || !geoRes.ok) throw new Error('Census fetch failed');

    const [acsData, geoData] = await Promise.all([acsRes.json(), geoRes.json()]);
    const [, ...rows] = acsData;

    const popByGeoid = new Map(rows.map(row => {
        const state  = row[2].padStart(2, '0');
        const county = row[3].padStart(3, '0');
        const tract  = row[4].padStart(6, '0');
        return [`${state}${county}${tract}`, parseInt(row[0], 10)];
    }));

    const features = geoData.features.map(f => {
        const population = popByGeoid.get(f.properties.GEOID) ?? 0;
        const areaKm2    = (f.properties.AREALAND || 0) / 1_000_000;
        return {
            ...f,
            properties: {
                GEOID:         f.properties.GEOID,
                population,
                areaKm2:       +areaKm2.toFixed(2),
                densityPerKm2: areaKm2 > 0 ? +(population / areaKm2).toFixed(1) : 0,
                acsYear:       parseInt(year, 10),
            },
        };
    });

    return { type: 'FeatureCollection', features };
}

// ── Main Worker ───────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        const url    = new URL(request.url);
        const path   = url.pathname;
        const method = request.method;
        const ip     = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const origin = request.headers.get('Origin') || '';
        const cors   = corsHeaders(origin);

        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        if (method !== 'GET') return err('Method not allowed', 405, cors);

        let response;

        if (path === '/api/search') {
            response = await handleSearch(request, env, ip);
        } else if (path.startsWith('/api/layers/')) {
            const layerName = path.slice('/api/layers/'.length);
            response = await handleLayer(layerName, request, env, ip);
        } else if (path === '/api/population') {
            response = await handlePopulation(request, env, ip);
        } else {
            response = err('Not found', 404);
        }

        // Attach CORS headers to every response
        const r = new Response(response.body, response);
        for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
        return r;
    },
};
