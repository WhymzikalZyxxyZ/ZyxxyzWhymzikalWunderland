'use strict';

// ── Structured logger ─────────────────────────────────────────────────────────
// Emits JSON lines consumable by Cloudflare Logpush / any log drain.
// Fields: level, event, ts (ISO-8601), plus any extra context passed as kv.
function log(level, event, kv = {}) {
    const entry = JSON.stringify({ level, event, ts: new Date().toISOString(), ...kv });
    if (level === 'error') console.error(entry);
    else if (level === 'warn')  console.warn(entry);
    else                        console.log(entry);
}

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
// All entries are stored with a 30-day KV TTL so stale data outlives upstream
// outages. Freshness is tracked via the `t` (epoch ms) field inside the envelope.
// On upstream failure, handlers serve stale data rather than returning 502.
const STALE_TTL_S = 30 * 86_400;

async function getCache(env, key) {
    try {
        const v = await env.LOCATOR_CACHE.get(key);
        if (!v) return null;
        const parsed = JSON.parse(v);
        if (parsed && typeof parsed === 'object' && 'data' in parsed && 't' in parsed) {
            return { data: parsed.data, t: parsed.t };
        }
        // Legacy plain-value entry — treat as immediately stale so upstream is tried first.
        return { data: parsed, t: 0 };
    } catch { return null; }
}

async function setCache(env, key, value) {
    try {
        await env.LOCATOR_CACHE.put(
            key,
            JSON.stringify({ data: value, t: Date.now() }),
            { expirationTtl: STALE_TTL_S },
        );
    } catch { /* non-fatal */ }
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, opts = {}, ms = 8_000) {
    const ac    = new AbortController();
    const timer = setTimeout(() => ac.abort(), ms);
    try {
        return await fetch(url, { ...opts, signal: ac.signal });
    } finally {
        clearTimeout(timer);
    }
}

const OVERPASS_HOSTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
];

async function fetchOverpass(body) {
    const opts = {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    };
    // Race all mirrors in parallel — first successful response wins.
    // Sequential fallback would double/triple latency; parallel keeps p50 low.
    try {
        return await Promise.any(
            OVERPASS_HOSTS.map(host =>
                fetchWithTimeout(host, opts, 20_000).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r;
                })
            )
        );
    } catch {
        throw new Error('Overpass unavailable on all mirrors');
    }
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const US_BOUNDS          = { minLng: -180, minLat: 18, maxLng: -66, maxLat: 72 };
const MAX_BBOX_AREA_DEG2 = 25; // ~5° × 5°; reject continent-scale queries

function sanitizeQuery(raw) {
    if (typeof raw !== 'string') return null;
    return raw.trim().slice(0, 100).replace(/[^a-zA-Z0-9 ,.\-#]/g, '') || null;
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
    if (cached && Date.now() - cached.t < 3_600_000) return json(cached.data);

    // Use Mapbox in production; fall back to Nominatim (free, no token) for local dev
    const result = env.MAPBOX_TOKEN
        ? await geocodeMapbox(q, env.MAPBOX_TOKEN)
        : await geocodeNominatim(q);

    if (!result) {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        return err('Geocoding service unavailable', 502);
    }
    await setCache(env, cacheKey, result);
    return json(result);
}

async function geocodeMapbox(q, token) {
    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
            + `?types=address,place,postcode&country=us&access_token=${token}`;
        const r = await fetchWithTimeout(url, {}, 8_000);
        if (!r.ok) return null;
        const data = await r.json();
        return { features: (data.features || []).filter(f => withinUS(f.center)) };
    } catch { return null; }
}

async function geocodeNominatim(q) {
    try {
        const url = `https://nominatim.openstreetmap.org/search`
            + `?q=${encodeURIComponent(q)}&format=json&countrycodes=us&limit=5&addressdetails=1`;
        const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'TheLocator/1.0 (dev)' } }, 8_000);
        if (!r.ok) return null;
        const data = await r.json();
        const features = data
            .map(p => ({ p, lon: parseFloat(p.lon), lat: parseFloat(p.lat) }))
            .filter(({ lon, lat }) => withinUS([lon, lat]))
            .map(({ p, lon, lat }) => {
                const isAddress = p.type === 'house' || p.addresstype === 'house_number';
                const isPostcode = p.type === 'postcode' || p.addresstype === 'postcode';
                const place_type = isAddress ? ['address'] : isPostcode ? ['postcode'] : ['place'];
                return {
                    place_name: p.display_name,
                    place_type,
                    center:     [lon, lat],
                    bbox:       p.boundingbox
                        ? [parseFloat(p.boundingbox[2]), parseFloat(p.boundingbox[0]),
                           parseFloat(p.boundingbox[3]), parseFloat(p.boundingbox[1])]
                        : null,
                };
            });
        return { features };
    } catch { return null; }
}

const VALID_LAYERS = new Set(['neighborhoods', 'schools', 'superfund']);
const LAYER_TTL    = { neighborhoods: 86_400, schools: 86_400, superfund: 21_600 };

async function handleLayer(layerName, request, env, ip) {
    if (!VALID_LAYERS.has(layerName)) return err('Unknown layer', 404);
    if (!ipAllow(ip, 60)) return err('Too many requests — slow down', 429);

    const bbox = parseBbox(new URL(request.url).searchParams.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');
    if ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > MAX_BBOX_AREA_DEG2)
        return err('bbox covers too large an area — zoom in first', 400);

    const cacheKey = `layer:${layerName}:${bbox.join(',')}`;
    const freshMs  = LAYER_TTL[layerName] * 1_000;
    const cached   = await getCache(env, cacheKey);
    if (cached && Date.now() - cached.t < freshMs) return json(cached.data);

    let data;
    try {
        data = layerName === 'superfund'
            ? await fetchSuperfund(bbox)
            : await fetchCensusLayer(layerName, bbox);
    } catch {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        return err('Data source unavailable', 502);
    }

    await setCache(env, cacheKey, data);
    return json(data);
}

// ACS 5-year estimates are available from 2009 through 2024 (released Dec 2025).
const ACS_MIN_YEAR = 2009;
const ACS_MAX_YEAR = 2024;

function parseACSYear(raw, fallback) {
    const y = parseInt(raw, 10);
    if (!isNaN(y) && y >= ACS_MIN_YEAR && y <= ACS_MAX_YEAR) return String(y);
    return String(parseInt(fallback, 10) || ACS_MAX_YEAR);
}

async function handlePopulation(request, env, ip) {
    if (!ipAllow(ip, 30)) return err('Too many requests — slow down', 429);

    const params = new URL(request.url).searchParams;
    const bbox   = parseBbox(params.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');
    if ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > MAX_BBOX_AREA_DEG2)
        return err('bbox covers too large an area — zoom in first', 400);

    const year     = parseACSYear(params.get('year'), env.ACS_YEAR);
    const cacheKey = `population:${year}:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached && Date.now() - cached.t < 86_400_000) return json(cached.data);

    let data;
    try { data = await fetchPopulation(bbox, env, year); }
    catch (e) {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        const msg = (e instanceof Error && e.message.startsWith('CENSUS_API_KEY'))
            ? 'Population layer requires a Census API key — not configured on this server'
            : 'Census API unavailable';
        return err(msg, 502);
    }

    await setCache(env, cacheKey, data);
    return json(data);
}

// ── External data fetchers ────────────────────────────────────────────────────

// TIGERweb ArcGIS REST endpoints
// Neighborhoods uses County Subdivisions (complete US coverage) rather than
// Census Places (which are absent in most suburban/rural areas).
// All layers use STATE (FIPS code) — STUSAB does not exist in these schemas.
// where=1=1 is required by the School service; harmless for other layers.
const CENSUS_LAYER_URLS = {
    // Layer 1 = County Subdivisions (complete US coverage, incl. rural).
    // Layer 0 is Estates — wrong. Layer uses STATE (FIPS) not STUSAB.
    neighborhoods: 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/1/query',
    schools:       'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer/0/query',
};
const CENSUS_LAYER_FIELDS = {
    neighborhoods: 'NAME,GEOID,STATE',
    schools:       'NAME,GEOID,STATE',
};

async function fetchCensusLayer(name, [minLng, minLat, maxLng, maxLat]) {
    const base   = CENSUS_LAYER_URLS[name]   || CENSUS_LAYER_URLS.neighborhoods;
    const fields = CENSUS_LAYER_FIELDS[name] || CENSUS_LAYER_FIELDS.neighborhoods;
    const url    = base
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + `&outFields=${fields}&resultRecordCount=500&f=geojson`;
    const r    = await fetchWithTimeout(url, {}, 8_000);
    if (!r.ok) throw new Error(`Census ${name} HTTP ${r.status}`);
    const data = await r.json();
    // ArcGIS returns HTTP 200 with an error body on bad queries — treat as failure so it isn't cached.
    if (data.error) throw new Error(`Census ${name} API error ${data.error.code}: ${data.error.message}`);
    if (data.exceededTransferLimit) log('warn', 'arcgis_transfer_limit', { layer: name, hint: 'results truncated at resultRecordCount ceiling' });
    return data;
}

async function fetchSuperfund([minLng, minLat, maxLng, maxLat]) {
    // OLEM folder was retired; SEMS_NPL is now under OEI/FRS_INTERESTS (layer 22).
    const url = 'https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer/22/query'
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=PRIMARY_NAME,LOCATION_ADDRESS,CITY_NAME,STATE_CODE,REGISTRY_ID,ACTIVE_STATUS'
        + '&resultRecordCount=200&f=geojson';
    const r = await fetchWithTimeout(url, {}, 8_000);
    if (!r.ok) throw new Error(`EPA superfund HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(`EPA superfund API error ${data.error.code}: ${data.error.message}`);
    if (data.exceededTransferLimit) log('warn', 'arcgis_transfer_limit', { layer: 'superfund', hint: 'results truncated at resultRecordCount ceiling' });
    const features = (data.features || [])
        .filter(f => f.geometry?.coordinates)
        .map(f => ({
            type:     'Feature',
            geometry: f.geometry,
            properties: {
                name:      f.properties.PRIMARY_NAME,
                nplStatus: f.properties.ACTIVE_STATUS || 'Unknown',
                address:   f.properties.LOCATION_ADDRESS,
                city:      f.properties.CITY_NAME,
                state:     f.properties.STATE_CODE,
                epaId:     f.properties.REGISTRY_ID,
            },
        }));
    return { type: 'FeatureCollection', features };
}

async function fetchPopulation([minLng, minLat, maxLng, maxLat], env, year) {
    const apiKey = env.CENSUS_API_KEY || '';

    // Fetch census tracts in the bbox first
    const geoUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query'
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=GEOID,AREALAND&returnGeometry=true&resultRecordCount=500&f=geojson';

    const geoRes = await fetchWithTimeout(geoUrl, {}, 8_000);
    if (!geoRes.ok) throw new Error('Census geo fetch failed');
    const geoData = await geoRes.json();
    if (geoData.error) throw new Error(`Census geo error ${geoData.error.code}: ${geoData.error.message}`);
    if (geoData.exceededTransferLimit) log('warn', 'arcgis_transfer_limit', { layer: 'population', hint: 'results truncated at resultRecordCount ceiling' });

    if (!geoData.features?.length) return { type: 'FeatureCollection', features: [] };

    // Without a Census API key: return tract boundaries with null population so
    // the map still renders the tract outlines (uniform colour) without ACS data.
    if (!apiKey) {
        const features = geoData.features.map(f => {
            const areaKm2 = +((f.properties.AREALAND || 0) / 1_000_000).toFixed(2);
            return {
                ...f,
                properties: {
                    GEOID:         f.properties.GEOID,
                    population:    null,
                    areaKm2,
                    densityPerKm2: null,
                    acsYear:       parseInt(year, 10),
                },
            };
        });
        return { type: 'FeatureCollection', features };
    }

    // Extract unique state FIPS codes from tract GEOIDs (first 2 chars)
    const states = [...new Set(
        geoData.features
            .map(f => f.properties?.GEOID?.slice(0, 2))
            .filter(Boolean)
    )];

    // ACS requires state + county:* when querying tracts; omitting county:* causes a silent failure.
    const acsRows = (await Promise.all(
        states.map(state => {
            const url = `https://api.census.gov/data/${year}/acs/acs5`
                + `?get=B01003_001E&for=tract:*&in=state:${state}+county:*`
                + `&key=${apiKey}`;
            return fetchWithTimeout(url, {}, 12_000)
                .then(r => {
                    if (!r.ok) { log('error', 'acs_fetch_failed', { layer: 'population', state, status: r.status }); return []; }
                    return r.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) { log('error', 'acs_unexpected_response', { layer: 'population', state }); return []; }
                    return data.slice(1); // drop header row
                })
                .catch(e => { log('error', 'acs_fetch_error', { layer: 'population', state, message: String(e) }); return []; });
        })
    )).flat();

    // If ACS returned nothing (bad key, rate limit, etc.) throw so the result is not cached.
    if (acsRows.length === 0) throw new Error('ACS API returned no data');

    // ACS response columns: [B01003_001E, state, county, tract]
    // The Census Bureau uses -666666666 as a sentinel for suppressed/unavailable data.
    const popByGeoid = new Map(acsRows.map(row => {
        const state  = String(row[1]).padStart(2, '0');
        const county = String(row[2]).padStart(3, '0');
        const tract  = String(row[3]).padStart(6, '0');
        const raw    = parseInt(row[0], 10);
        const pop    = (isNaN(raw) || raw < 0) ? null : raw;
        return [`${state}${county}${tract}`, pop];
    }));

    const features = geoData.features.map(f => {
        const population = popByGeoid.get(f.properties.GEOID) ?? null;
        const areaKm2    = (f.properties.AREALAND || 0) / 1_000_000;
        return {
            ...f,
            properties: {
                GEOID:         f.properties.GEOID,
                population,
                areaKm2:       +areaKm2.toFixed(2),
                densityPerKm2: (population !== null && areaKm2 > 0)
                    ? +(population / areaKm2).toFixed(1)
                    : null,
                acsYear:       parseInt(year, 10),
            },
        };
    });

    return { type: 'FeatureCollection', features };
}

async function handleWalkscore(request, env, ip) {
    if (!ipAllow(ip, 60)) return err('Too many requests — slow down', 429);

    const bbox = parseBbox(new URL(request.url).searchParams.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');
    if ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > MAX_BBOX_AREA_DEG2)
        return err('bbox covers too large an area — zoom in first', 400);

    const cacheKey = `walkscore:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached && Date.now() - cached.t < 86_400_000 * 7) return json(cached.data);

    let data;
    try { data = await fetchWalkability(bbox); }
    catch {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        return err('EPA walkability data unavailable', 502);
    }

    await setCache(env, cacheKey, data);
    return json(data);
}

async function fetchWalkability([minLng, minLat, maxLng, maxLat]) {
    // StatAbbr was removed from the WalkabilityIndex schema; use STATEFP instead.
    const url = 'https://geodata.epa.gov/arcgis/rest/services/OA/WalkabilityIndex/MapServer/0/query'
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=GEOID10,NatWalkInd,STATEFP&resultRecordCount=500&f=geojson';
    const r = await fetchWithTimeout(url, {}, 8_000);
    if (!r.ok) throw new Error(`EPA walkability HTTP ${r.status}`);
    const data = await r.json();
    if (data.error) throw new Error(`EPA walkability error: ${data.error.message}`);
    if (data.exceededTransferLimit) log('warn', 'arcgis_transfer_limit', { layer: 'walkscore', hint: 'results truncated at resultRecordCount ceiling' });
    const features = (data.features || [])
        .filter(f => f.geometry?.coordinates)
        .map(f => ({
            type:     'Feature',
            geometry: f.geometry,
            properties: {
                GEOID10:    f.properties.GEOID10,
                natWalkInd: parseFloat(f.properties.NatWalkInd) || 0,
                statAbbr:   f.properties.STATEFP,
            },
        }));
    return { type: 'FeatureCollection', features };
}

async function handleCities(request, env, ip) {
    if (!ipAllow(ip, 30)) return err('Too many requests — slow down', 429);

    const params = new URL(request.url).searchParams;
    const bbox   = parseBbox(params.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');
    if ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > MAX_BBOX_AREA_DEG2)
        return err('bbox covers too large an area — zoom in first', 400);

    const year     = parseACSYear(params.get('year'), env.ACS_YEAR);
    const cacheKey = `cities:${year}:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached && Date.now() - cached.t < 86_400_000) return json(cached.data);

    let data;
    try { data = await fetchCities(bbox, env, year); }
    catch {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        return err('City data unavailable', 502);
    }

    await setCache(env, cacheKey, data);
    return json(data);
}

async function fetchCities([minLng, minLat, maxLng, maxLat], env, year) {
    // Fetch incorporated place polygons from TIGERweb (layer 4 = Incorporated Places)
    // Layer 2 is Subbarrios — wrong. Layer 4 has complete incorporated place coverage.
    const geoUrl = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/4/query'
        + `?where=1%3D1&geometry=${minLng},${minLat},${maxLng},${maxLat}`
        + '&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
        + '&outFields=NAME,GEOID,STATE&resultRecordCount=200&f=geojson';

    const geoRes = await fetchWithTimeout(geoUrl, {}, 8_000);
    if (!geoRes.ok) throw new Error(`Census cities geo HTTP ${geoRes.status}`);
    const geoData = await geoRes.json();
    if (geoData.error) throw new Error(`Census cities API error: ${geoData.error.message}`);
    if (geoData.exceededTransferLimit) log('warn', 'arcgis_transfer_limit', { layer: 'cities', hint: 'results truncated at resultRecordCount ceiling' });

    if (!geoData.features?.length) return { type: 'FeatureCollection', features: [] };

    const apiKey = env.CENSUS_API_KEY || '';

    if (!apiKey) {
        // Return place outlines with null population when no Census API key is configured.
        const features = geoData.features.map(f => ({
            ...f,
            properties: {
                name:       f.properties.NAME,
                GEOID:      f.properties.GEOID,
                state:      f.properties.STATE,
                population: null,
                acsYear:    null,
            },
        }));
        return { type: 'FeatureCollection', features };
    }

    // Extract unique state FIPS codes from place GEOIDs (first 2 chars of 7-char place GEOID)
    const states = [...new Set(
        geoData.features
            .map(f => f.properties?.GEOID?.slice(0, 2))
            .filter(Boolean)
    )];

    // ACS place-level population: columns are [B01003_001E, state, place]
    const acsRows = (await Promise.all(
        states.map(state => {
            const url = `https://api.census.gov/data/${year}/acs/acs5`
                + `?get=B01003_001E&for=place:*&in=state:${state}`
                + `&key=${apiKey}`;
            return fetchWithTimeout(url, {}, 12_000)
                .then(r => {
                    if (!r.ok) { log('error', 'acs_fetch_failed', { layer: 'cities', state, status: r.status }); return []; }
                    return r.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) { log('error', 'acs_unexpected_response', { layer: 'cities', state }); return []; }
                    return data.slice(1);
                })
                .catch(e => { log('error', 'acs_fetch_error', { layer: 'cities', state, message: String(e) }); return []; });
        })
    )).flat();

    // Place GEOID = state(2) + place(5) = 7 chars
    const popByGeoid = new Map(acsRows.map(row => {
        const state = String(row[1]).padStart(2, '0');
        const place = String(row[2]).padStart(5, '0');
        const raw   = parseInt(row[0], 10);
        const pop   = (isNaN(raw) || raw < 0) ? null : raw;
        return [`${state}${place}`, pop];
    }));

    const features = geoData.features.map(f => ({
        ...f,
        properties: {
            name:       f.properties.NAME,
            GEOID:      f.properties.GEOID,
            state:      f.properties.STATE,
            population: popByGeoid.get(f.properties.GEOID) ?? null,
            acsYear:    parseInt(year, 10),
        },
    }));

    return { type: 'FeatureCollection', features };
}

async function handleTransit(request, env, ip) {
    if (!ipAllow(ip, 30)) return err('Too many requests — slow down', 429);

    const bbox = parseBbox(new URL(request.url).searchParams.get('bbox'));
    if (!bbox) return err('bbox required (minLng,minLat,maxLng,maxLat)');
    if ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1]) > MAX_BBOX_AREA_DEG2)
        return err('bbox covers too large an area — zoom in first', 400);

    const cacheKey = `transit:${bbox.join(',')}`;
    const cached   = await getCache(env, cacheKey);
    if (cached && Date.now() - cached.t < 3_600_000) return json(cached.data);

    let data;
    try { data = await fetchTransit(bbox); }
    catch {
        if (cached) return json(cached.data, 200, { 'X-Cache': 'stale', 'Cache-Control': 'no-store' });
        return err('Transit data unavailable', 502);
    }

    await setCache(env, cacheKey, data);
    return json(data);
}

async function fetchTransit([minLng, minLat, maxLng, maxLat]) {
    // Overpass API bbox order: (south,west,north,east) = (minLat,minLng,maxLat,maxLng)
    const query = `[out:json][timeout:10];(`
        + `node["highway"="bus_stop"](${minLat},${minLng},${maxLat},${maxLng});`
        + `node["railway"~"^(station|halt|subway_entrance)$"](${minLat},${minLng},${maxLat},${maxLng});`
        + `node["public_transport"="platform"](${minLat},${minLng},${maxLat},${maxLng});`
        + `);out body;`;
    const r    = await fetchOverpass(`data=${encodeURIComponent(query)}`);
    const data = await r.json();

    const features = (data.elements || [])
        .filter(el => el.type === 'node' && el.lat != null && el.lon != null)
        .map(el => {
            const tags   = el.tags || {};
            const rway   = tags.railway || '';
            const transit = rway === 'subway_entrance' ? 'subway'
                : rway ? 'rail'
                : 'bus';
            return {
                type:     'Feature',
                geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
                properties: {
                    id:     el.id,
                    name:   tags.name || tags.ref || 'Transit Stop',
                    transit,
                    ref:    tags.ref    || null,
                    routes: tags.route_ref || null,
                },
            };
        });

    return { type: 'FeatureCollection', features };
}

async function handleHealth(request, env) {
    function probe(url, opts = {}) {
        return fetchWithTimeout(url, opts, 6_000)
            .then(r => r.ok)
            .catch(() => false);
    }

    const [arcgis, census, epa, overpass] = await Promise.all([
        probe('https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/School/MapServer?f=json'),
        probe(`https://api.census.gov/data/${ACS_MAX_YEAR}/acs/acs5?get=NAME&for=state:01${env.CENSUS_API_KEY ? `&key=${env.CENSUS_API_KEY}` : ''}`),
        probe('https://geodata.epa.gov/arcgis/rest/services/OEI/FRS_INTERESTS/MapServer/22?f=json'),
        probe('https://overpass-api.de/api/status'),
    ]);

    const checks = { arcgis, census, epa, overpass };
    const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';
    return json({ status, checks });
}

// ── Main Worker ───────────────────────────────────────────────────────────────
export default {
    async fetch(request, env) {
        try {
            return await handleRequest(request, env);
        } catch (e) {
            log('error', 'unhandled_worker_exception', { message: String(e), stack: e?.stack?.slice(0, 500) });
            const origin = request.headers.get('Origin') || '';
            const cors   = corsHeaders(origin);
            return err('Internal server error', 500, cors);
        }
    },
};

async function handleRequest(request, env) {
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

    // ── L1 edge cache (Cloudflare Cache API) ─────────────────────────────
    // Per-PoP in-memory cache that bypasses KV for repeat requests at the
    // same edge node. Best-effort — failures fall through to KV + origin.
    // CORS headers are stripped before storage and re-applied fresh on hit
    // so a cached response never leaks one origin's ACAO to a different one.
    const edgeCache = caches.default;
    if (path.startsWith('/api/') && path !== '/api/health') {
        const edgeCached = await edgeCache.match(request).catch(() => null);
        if (edgeCached) {
            const fresh = new Response(edgeCached.body, edgeCached);
            for (const [k, v] of Object.entries(cors)) fresh.headers.set(k, v);
            return fresh;
        }
    }

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
    } else if (path === '/api/walkscore') {
        response = await handleWalkscore(request, env, ip);
    } else if (path === '/api/cities') {
        response = await handleCities(request, env, ip);
    } else if (path === '/api/transit') {
        response = await handleTransit(request, env, ip);
    } else if (path === '/api/health') {
        response = await handleHealth(request, env);
    } else if (path === '/favicon.ico') {
        return new Response(null, { status: 204 });
    } else {
        // Serve the built React SPA for all other routes.
        // env.ASSETS.fetch can throw if the asset binding has a transient issue;
        // the outer try/catch in fetch() will catch it and return 500 rather
        // than letting it escape as a Cloudflare 1101.
        response = await env.ASSETS.fetch(request);
        const r = new Response(response.body, response);
        r.headers.delete('X-Frame-Options');
        r.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://zyxwonderland.xyz https://*.zyxwonderland.xyz");
        return r;
    }

    // Attach CORS headers to every response
    const r = new Response(response.body, response);
    for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);

    // ── Store successful API data in edge cache ────────────────────────────
    // Skip stale fallback responses — they carry no-store and must not be edge-cached.
    if (r.status === 200 && path.startsWith('/api/') && path !== '/api/health'
            && r.headers.get('X-Cache') !== 'stale') {
        r.headers.set('Cache-Control', 'public, s-maxage=300, max-age=60');
        // Cache a CORS-stripped copy — CORS headers are origin-specific and
        // must be freshly applied per request (see cache-hit path above).
        const toCache = r.clone();
        for (const h of ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods',
                          'Access-Control-Allow-Headers', 'Access-Control-Max-Age', 'Vary']) {
            toCache.headers.delete(h);
        }
        edgeCache.put(request, toCache).catch(() => {});
    }

    return r;
}
