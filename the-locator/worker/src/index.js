'use strict';

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allows the apex domain and any direct subdomain (e.g. locator.zyxwonderland.xyz)
const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)?zyxwonderland\.xyz$/;

function corsHeaders(origin) {
    if (!ALLOWED_ORIGIN_RE.test(origin)) return {};
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
    if (!e || now > e.reset) {
        // Prune all expired entries whenever we create a new slot, keeping
        // the Map bounded to the number of currently-active unique IPs.
        for (const [k, v] of _ipLimits) { if (now > v.reset) _ipLimits.delete(k); }
        _ipLimits.set(ip, { count: 1, reset: now + windowMs });
        return true;
    }
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
    return raw.trim().slice(0, 100).replace(/[^a-zA-Z0-9 ,.-]/g, '') || null;
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

function withinUS([lng, lat]) {
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

    // Use Mapbox in production; fall back to Nominatim (free, no token) for local dev
    const result = env.MAPBOX_TOKEN
        ? await geocodeMapbox(q, env.MAPBOX_TOKEN)
        : await geocodeNominatim(q);

    if (!result) return err('Geocoding service unavailable', 502);
    await setCache(env, cacheKey, result, 3_600);
    return json(result);
}

async function geocodeMapbox(q, token) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        + `?types=place,postcode&country=us&access_token=${token}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    return { features: (data.features || []).filter(f => withinUS(f.center)) };
}

async function geocodeNominatim(q) {
    const url = `https://nominatim.openstreetmap.org/search`
        + `?q=${encodeURIComponent(q)}&format=json&countrycodes=us&limit=5&addressdetails=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'TheLocator/1.0 (dev)' } });
    if (!r.ok) return null;
    const data = await r.json();
    const features = data
        .map(p => ({ p, lon: parseFloat(p.lon), lat: parseFloat(p.lat) }))
        .filter(({ lon, lat }) => withinUS([lon, lat]))
        .map(({ p, lon, lat }) => ({
            place_name: p.display_name,
            center:     [lon, lat],
            bbox:       p.boundingbox
                ? [parseFloat(p.boundingbox[2]), parseFloat(p.boundingbox[0]),
                   parseFloat(p.boundingbox[3]), parseFloat(p.boundingbox[1])]
                : null,
        }));
    return { features };
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

// TIGERweb ArcGIS REST endpoints
// The School service uses STATE (not STUSAB), so each layer gets its own field list.
// where=1=1 is required by the School service; harmless for other layers.
const CENSUS_LAYER_URLS = {
    neighborhoods: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/0/query',
    schools:       'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer/0/query',
};
const CENSUS_LAYER_FIELDS = {
    neighborhoods: 'NAME,GEOID,STUSAB',
    schools:       'NAME,GEOID,STATE',
};

async function fetchCensusLayer(name, [minLng, minLat, maxLng, maxLat]) {
    const base   = CENSUS_LAYER_URLS[name]   || CENSUS_LAYER_URLS.neighborhoods;
    const fields = CENSUS_LAYER_FIELDS[name] || CENSUS_LAYER_FIELDS.neighborhoods;
    const url    = base
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + `&outFields=${fields}&resultRecordCount=500&f=geojson`;
    const r    = await fetch(url);
    if (!r.ok) throw new Error(`Census ${name} HTTP ${r.status}`);
    const data = await r.json();
    // ArcGIS returns HTTP 200 with an error body on bad queries — treat as failure so it isn't cached.
    if (data.error) throw new Error(`Census ${name} API error ${data.error.code}: ${data.error.message}`);
    return data;
}

async function fetchSuperfund([minLng, minLat, maxLng, maxLat]) {
    // EPA geodata ArcGIS service — more reliable than the legacy ofmpub FRS endpoint
    const url = 'https://geodata.epa.gov/arcgis/rest/services/OLEM/Superfund_National_Priorities_List/MapServer/0/query'
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=SITE_NAME,NPL_STATUS,ADDRESS,CITY,STATE,EPA_ID&resultRecordCount=200&f=geojson';
    const r = await fetch(url);
    if (!r.ok) throw new Error(`EPA superfund HTTP ${r.status}`);
    const data = await r.json();
    const features = (data.features || [])
        .filter(f => f.geometry?.coordinates)
        .map(f => ({
            type:     'Feature',
            geometry: f.geometry,
            properties: {
                name:      f.properties.SITE_NAME,
                nplStatus: f.properties.NPL_STATUS || 'Unknown',
                address:   f.properties.ADDRESS,
                city:      f.properties.CITY,
                state:     f.properties.STATE,
                epaId:     f.properties.EPA_ID,
            },
        }));
    return { type: 'FeatureCollection', features };
}

async function fetchPopulation([minLng, minLat, maxLng, maxLat], env) {
    const year   = env.ACS_YEAR || '2022';
    const apiKey = env.CENSUS_API_KEY || '';

    // Fetch census tracts in the bbox first
    const geoUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query'
        + `?geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=GEOID,AREALAND&returnGeometry=true&resultRecordCount=500&f=geojson';

    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) throw new Error('Census geo fetch failed');
    const geoData = await geoRes.json();

    if (!geoData.features?.length) return { type: 'FeatureCollection', features: [] };

    // Extract unique state FIPS codes from tract GEOIDs (first 2 chars)
    const states = [...new Set(
        geoData.features
            .map(f => f.properties?.GEOID?.slice(0, 2))
            .filter(Boolean)
    )];

    if (!apiKey) throw new Error('CENSUS_API_KEY is not configured — population layer unavailable');

    // ACS requires state + county:* when querying tracts; omitting county:* causes a silent failure.
    const acsRows = (await Promise.all(
        states.map(state => {
            const url = `https://api.census.gov/data/${year}/acs/acs5`
                + `?get=B01003_001E&for=tract:*&in=state:${state}+county:*`
                + `&key=${apiKey}`;
            return fetch(url)
                .then(r => {
                    if (!r.ok) { console.error(`[population] ACS state ${state} HTTP ${r.status}`); return []; }
                    return r.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) { console.error(`[population] ACS state ${state} unexpected response`, data); return []; }
                    return data.slice(1); // drop header row
                })
                .catch(e => { console.error(`[population] ACS state ${state} fetch error`, e); return []; });
        })
    )).flat();

    // If ACS returned nothing (bad key, rate limit, etc.) throw so the result is not cached.
    if (acsRows.length === 0) throw new Error('ACS API returned no data');

    // ACS response columns: [B01003_001E, state, county, tract]
    const popByGeoid = new Map(acsRows.map(row => {
        const state  = String(row[1]).padStart(2, '0');
        const county = String(row[2]).padStart(3, '0');
        const tract  = String(row[3]).padStart(6, '0');
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
            if (!/^[a-z]+$/.test(layerName)) {
                response = err('Invalid layer name', 400, cors);
            } else {
                response = await handleLayer(layerName, request, env, ip);
            }
        } else if (path === '/api/population') {
            response = await handlePopulation(request, env, ip);
        } else if (path === '/favicon.ico') {
            return new Response(null, { status: 204 });
        } else {
            // Serve the built React SPA for all other routes
            response = await env.ASSETS.fetch(request);
            // Strip X-Frame-Options so the app can be embedded via iframe
            const r = new Response(response.body, response);
            r.headers.delete('X-Frame-Options');
            r.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://zyxwonderland.xyz https://*.zyxwonderland.xyz");
            return r;
        }

        // Attach CORS headers to every response
        const r = new Response(response.body, response);
        for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
        return r;
    },
};
