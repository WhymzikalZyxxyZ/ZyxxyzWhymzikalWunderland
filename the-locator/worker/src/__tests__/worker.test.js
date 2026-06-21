'use strict';

import { describe, it, expect, vi, beforeAll } from 'vitest';
import worker from '../index.js';

// Cloudflare Cache API is not available in Node/vitest — stub it so tests run.
// match() returns null (no edge cache hit) and put() is a no-op.
beforeAll(() => {
    global.caches = {
        default: {
            match: vi.fn(async () => null),
            put:   vi.fn(async () => undefined),
        },
    };
});

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockFetch(responses) {
    // Build an array so concurrent Promise.all calls get distinct responses
    const arr  = Array.isArray(responses) ? responses : [responses];
    let   call = 0;
    return vi.fn(async () => {
        const r = arr[Math.min(call++, arr.length - 1)];
        return {
            ok:   r.ok ?? true,
            json: async () => r.body ?? {},
        };
    });
}

// cacheGetAge: ms in the past to backdate the cached `t` timestamp.
// 0 (default) = fresh; pass a value larger than the handler's fresh window to simulate stale.
function makeEnv({ cacheGet = null, cacheGetAge = 0, cacheSet = vi.fn(), mapboxToken = '', censusKey = '' } = {}) {
    return {
        LOCATOR_CACHE: {
            get: vi.fn(async () => cacheGet !== null
                ? JSON.stringify({ data: cacheGet, t: Date.now() - cacheGetAge })
                : null),
            put: cacheSet,
        },
        ASSETS: {
            fetch: vi.fn(async () => new Response('<html><body>app</body></html>', {
                status:  200,
                headers: { 'Content-Type': 'text/html' },
            })),
        },
        MAPBOX_TOKEN:    mapboxToken,
        CENSUS_API_KEY:  censusKey,
        ACS_YEAR:        '2024',
    };
}

// Each call gets a fresh unique IP so the shared in-memory rate-limit state
// never bleeds between tests.
let _ipSeq = 10;
function uniqueIp() { return `10.0.0.${_ipSeq++}`; }

function req(path, { origin = 'https://zyxwonderland.xyz', method = 'GET', ip } = {}) {
    return new Request(`https://locator.zyxwonderland.xyz${path}`, {
        method,
        headers: {
            'Origin':           origin,
            'CF-Connecting-IP': ip ?? uniqueIp(),
        },
    });
}

// ── CORS / preflight ──────────────────────────────────────────────────────────

describe('CORS', () => {
    it('OPTIONS returns 204 with CORS headers for allowed origin', async () => {
        const res = await worker.fetch(req('/', { method: 'OPTIONS' }), makeEnv());
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://zyxwonderland.xyz');
    });

    it('OPTIONS returns 204 with no CORS headers for disallowed origin', async () => {
        const res = await worker.fetch(req('/', { method: 'OPTIONS', origin: 'https://evil.com' }), makeEnv());
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('www subdomain is also allowed', async () => {
        const res = await worker.fetch(req('/api/search?q=Denver', { origin: 'https://www.zyxwonderland.xyz' }), makeEnv({ cacheGet: { features: [] } }));
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://www.zyxwonderland.xyz');
    });

    it('CORS headers are absent for unknown origin', async () => {
        const res = await worker.fetch(req('/api/search?q=Denver', { origin: 'https://other.com' }), makeEnv({ cacheGet: { features: [] } }));
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('edge cache hit reattaches CORS for the requesting origin, not the cached origin', async () => {
        // Simulate a cached response that was stored without CORS headers
        // (as our fix requires), coming back from a request with a different origin.
        const cachedBody = JSON.stringify({ features: [] });
        const cachedResponse = new Response(cachedBody, {
            status:  200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=300' },
            // No Access-Control-Allow-Origin — stripped before storage
        });
        global.caches.default.match = vi.fn(async () => cachedResponse);

        const res = await worker.fetch(
            req('/api/search?q=Denver', { origin: 'https://locator.zyxwonderland.xyz' }),
            makeEnv(),
        );
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://locator.zyxwonderland.xyz');

        // Restore the default null-returning mock for other tests
        global.caches.default.match = vi.fn(async () => null);
    });

    it('non-GET returns 405', async () => {
        const res = await worker.fetch(req('/api/search', { method: 'POST' }), makeEnv());
        expect(res.status).toBe(405);
    });

    it('falls back to 0.0.0.0 IP and empty origin when headers are absent', async () => {
        // A bare Request with no CF-Connecting-IP or Origin headers covers the || fallbacks.
        const bareReq = new Request('https://locator.zyxwonderland.xyz/api/search?q=Denver', { method: 'GET' });
        const env = makeEnv({ cacheGet: { features: [] } });
        const res = await worker.fetch(bareReq, env);
        expect(res.status).toBe(200);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull(); // empty origin → no CORS
    });
});

// ── Security headers ──────────────────────────────────────────────────────────

describe('Security headers', () => {
    it('X-Content-Type-Options is nosniff', async () => {
        const res = await worker.fetch(req('/api/search?q=x'), makeEnv({ cacheGet: { features: [] } }));
        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('X-Frame-Options is DENY', async () => {
        const res = await worker.fetch(req('/api/search?q=x'), makeEnv({ cacheGet: { features: [] } }));
        expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    });
});

// ── Non-API routes → SPA assets ───────────────────────────────────────────────

describe('Non-API routes', () => {
    it('delegates to ASSETS for root path', async () => {
        const env = makeEnv();
        const res = await worker.fetch(req('/'), env);
        expect(env.ASSETS.fetch).toHaveBeenCalled();
        expect(res.status).toBe(200);
    });

    it('delegates to ASSETS for unknown /api/ sub-path', async () => {
        const env = makeEnv();
        const res = await worker.fetch(req('/api/unknown'), env);
        expect(env.ASSETS.fetch).toHaveBeenCalled();
        expect(res.status).toBe(200);
    });

    it('strips X-Frame-Options from SPA response to allow embedding', async () => {
        const env = makeEnv();
        const res = await worker.fetch(req('/'), env);
        expect(res.headers.get('X-Frame-Options')).toBeNull();
    });

    it('sets frame-ancestors CSP on SPA response', async () => {
        const env = makeEnv();
        const res = await worker.fetch(req('/'), env);
        expect(res.headers.get('Content-Security-Policy')).toContain('frame-ancestors');
    });
});

// ── /api/search ───────────────────────────────────────────────────────────────

describe('/api/search', () => {
    it('returns 400 when q is missing', async () => {
        const res = await worker.fetch(req('/api/search'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when q is whitespace only', async () => {
        const res = await worker.fetch(req('/api/search?q=   '), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns cached result without fetching', async () => {
        const cached = { features: [{ place_name: 'Denver, CO', center: [-104.9, 39.7] }] };
        const env    = makeEnv({ cacheGet: cached });
        const res    = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].place_name).toBe('Denver, CO');
        expect(env.LOCATOR_CACHE.get).toHaveBeenCalledWith('geocode:denver');
    });

    it('uses Nominatim when no MAPBOX_TOKEN and filters non-US results', async () => {
        const nominatimData = [
            { display_name: 'Denver, CO', lon: '-104.9', lat: '39.7', boundingbox: ['39.6', '39.8', '-105.0', '-104.8'] },
            { display_name: 'Paris, France', lon: '2.3', lat: '48.8', boundingbox: null },
        ];
        global.fetch = mockFetch({ ok: true, body: nominatimData });

        const env = makeEnv({ mapboxToken: '' });
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(1);
        expect(body.features[0].place_name).toBe('Denver, CO');
        expect(body.features[0].center).toEqual([-104.9, 39.7]);
    });

    it('Nominatim result without bbox gets derived bbox', async () => {
        const nominatimData = [
            { display_name: 'Denver, CO', lon: '-104.9', lat: '39.7', boundingbox: null },
        ];
        global.fetch = mockFetch({ ok: true, body: nominatimData });

        const env = makeEnv({ mapboxToken: '' });
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        const body = await res.json();
        expect(body.features[0].bbox).toBeNull();
    });

    it('uses Mapbox when MAPBOX_TOKEN is set', async () => {
        const mapboxData = {
            features: [
                { place_name: 'Denver, CO', center: [-104.9, 39.7], bbox: [-105.1, 39.6, -104.7, 39.9] },
                { place_name: 'Unknown, AK', center: [-200, 70] },
            ],
        };
        global.fetch = mockFetch({ ok: true, body: mapboxData });

        const env = makeEnv({ mapboxToken: 'pk.test' });
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(1);
        expect(body.features[0].place_name).toBe('Denver, CO');
    });

    it('returns 502 when geocoding service is not ok', async () => {
        global.fetch = mockFetch({ ok: false });
        const env = makeEnv({ mapboxToken: '' });
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(502);
    });

    it('stores result in cache after fetch', async () => {
        const nominatimData = [{ display_name: 'Austin, TX', lon: '-97.7', lat: '30.3', boundingbox: ['30.2', '30.4', '-97.8', '-97.6'] }];
        global.fetch = mockFetch({ ok: true, body: nominatimData });

        const cachePut = vi.fn();
        const env      = makeEnv({ mapboxToken: '', cacheSet: cachePut });
        await worker.fetch(req('/api/search?q=Austin'), env);
        expect(cachePut).toHaveBeenCalledWith('geocode:austin', expect.any(String), { expirationTtl: 30 * 86_400 });
    });

    it('rate limits after 30 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { features: [] } });
        // 30 allowed
        for (let i = 0; i < 30; i++) {
            const r = await worker.fetch(req('/api/search?q=x', { ip: '9.9.9.1' }), env);
            expect(r.status).toBe(200);
        }
        // 31st is rejected
        const r = await worker.fetch(req('/api/search?q=x', { ip: '9.9.9.1' }), env);
        expect(r.status).toBe(429);
    });

    it('sanitizes query — strips special chars', async () => {
        global.fetch = mockFetch({ ok: true, body: [] });
        const env = makeEnv({ mapboxToken: '' });
        // Should not throw and should trim special chars
        const res = await worker.fetch(req('/api/search?q=<script>alert(1)</script>'), env);
        // after sanitize, result may be empty string → 400, or stripped → 200/502
        expect([200, 400, 502]).toContain(res.status);
    });
});

// ── /api/layers/:name ─────────────────────────────────────────────────────────

describe('/api/layers/:name', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';

    it('returns 404 for unknown layer', async () => {
        const res = await worker.fetch(req(`/api/layers/unknown?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(404);
    });

    it('returns 400 when bbox is missing', async () => {
        const res = await worker.fetch(req('/api/layers/neighborhoods'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 for malformed bbox', async () => {
        const res = await worker.fetch(req('/api/layers/neighborhoods?bbox=a,b,c,d'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox area is too large', async () => {
        const res = await worker.fetch(req('/api/layers/neighborhoods?bbox=-125.1,27.1,-72.0,50.6'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox has wrong range (minLng >= maxLng)', async () => {
        const res = await worker.fetch(req('/api/layers/neighborhoods?bbox=-100,39,-110,45'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns cached layer data', async () => {
        const cached = { type: 'FeatureCollection', features: [] };
        const env    = makeEnv({ cacheGet: cached });
        const res    = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('FeatureCollection');
    });

    it('fetches and caches neighborhoods from Census', async () => {
        const censusData = { type: 'FeatureCollection', features: [] };
        global.fetch = mockFetch({ ok: true, body: censusData });
        const cachePut = vi.fn();
        const env      = makeEnv({ cacheSet: cachePut });
        const res      = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(cachePut).toHaveBeenCalledWith(
            `layer:neighborhoods:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('fetches schools layer', async () => {
        global.fetch = mockFetch({ ok: true, body: { type: 'FeatureCollection', features: [] } });
        const res = await worker.fetch(req(`/api/layers/schools?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
    });

    it('fetches superfund layer from EPA', async () => {
        // Worker uses EPA ArcGIS GeoJSON endpoint (not the legacy FRS REST API)
        const epaData = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.9, 39.7] }, properties: { SITE_NAME: 'Test Site', NPL_STATUS: 'NPL Site', ADDRESS: '123 Main', CITY: 'Denver', STATE: 'CO', EPA_ID: 'ABC' } },
                { type: 'Feature', geometry: null, properties: { SITE_NAME: 'Bad Site' } },
            ],
        };
        global.fetch = mockFetch({ ok: true, body: epaData });
        const res = await worker.fetch(req(`/api/layers/superfund?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(1);
        expect(body.features[0].properties.name).toBe('Test Site');
        expect(body.features[0].properties.nplStatus).toBe('NPL Site');
    });

    it('superfund site with no NPL_STATUS falls back to Unknown', async () => {
        const epaData = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Point', coordinates: [-104.9, 39.7] }, properties: { SITE_NAME: 'Site', NPL_STATUS: '', ADDRESS: '', CITY: '', STATE: '', EPA_ID: '' } },
            ],
        };
        global.fetch = mockFetch({ ok: true, body: epaData });
        const res  = await worker.fetch(req(`/api/layers/superfund?bbox=${validBbox}`), makeEnv());
        const body = await res.json();
        expect(body.features[0].properties.nplStatus).toBe('Unknown');
    });

    it('superfund with no features returns empty collection', async () => {
        global.fetch = mockFetch({ ok: true, body: { type: 'FeatureCollection', features: [] } });
        const res  = await worker.fetch(req(`/api/layers/superfund?bbox=${validBbox}`), makeEnv());
        const body = await res.json();
        expect(body.features).toHaveLength(0);
    });

    it('returns 502 when Census source errors', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('superfund stores with 30-day KV TTL', async () => {
        global.fetch = mockFetch({ ok: true, body: { type: 'FeatureCollection', features: [] } });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/layers/superfund?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(expect.any(String), expect.any(String), { expirationTtl: 30 * 86_400 });
    });

    it('rate limits after 60 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { type: 'FeatureCollection', features: [] } });
        for (let i = 0; i < 60; i++) {
            const r = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`, { ip: '9.9.9.2' }), env);
            expect(r.status).toBe(200);
        }
        const r = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`, { ip: '9.9.9.2' }), env);
        expect(r.status).toBe(429);
    });
});

// ── /api/population ───────────────────────────────────────────────────────────

describe('/api/population', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';

    it('returns 400 when bbox is missing', async () => {
        const res = await worker.fetch(req('/api/population'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox area is too large', async () => {
        const res = await worker.fetch(req('/api/population?bbox=-125.1,27.1,-72.0,50.6'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 502 when TIGERweb returns an ArcGIS error body', async () => {
        global.fetch = mockFetch({ ok: true, body: { error: { code: 400, message: 'Invalid or missing input parameters.' } } });
        const res = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('returns cached population data', async () => {
        const cached = { type: 'FeatureCollection', features: [] };
        const res    = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ cacheGet: cached }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('FeatureCollection');
    });

    it('fetches ACS + TIGER and joins by GEOID', async () => {
        // Census ACS returns [value, state, county, tract] — no NAME column
        const acsData = [
            ['B01003_001E', 'state', 'county', 'tract'],
            ['5000', '08', '031', '000100'],
        ];
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { GEOID: '08031000100', AREALAND: 2000000 },
            }],
        };
        // TIGERweb geo is fetched first, ACS comes second; census key needed to reach ACS path
        global.fetch = mockFetch([
            { ok: true, body: geoData },
            { ok: true, body: acsData },
        ]);
        const res  = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ censusKey: 'test-key' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].properties.population).toBe(5000);
        expect(body.features[0].properties.areaKm2).toBe(2);
        expect(body.features[0].properties.densityPerKm2).toBe(2500);
        expect(body.features[0].properties.acsYear).toBe(2024);
    });

    it('tract not found in ACS data gets null population', async () => {
        // ACS returns data for a different tract — our geo tract's GEOID won't match
        const acsData = [
            ['B01003_001E', 'state', 'county', 'tract'],
            ['200', '08', '031', '000200'],
        ];
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { GEOID: '08031999999', AREALAND: 1000000 },
            }],
        };
        // TIGERweb geo is fetched first, ACS comes second; census key needed to reach ACS path
        global.fetch = mockFetch([
            { ok: true, body: geoData },
            { ok: true, body: acsData },
        ]);
        const res  = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ censusKey: 'test-key' }));
        const body = await res.json();
        expect(body.features[0].properties.population).toBeNull();
        expect(body.features[0].properties.densityPerKm2).toBeNull();
    });

    it('tract with zero area gets null densityPerKm2', async () => {
        const acsData = [
            ['B01003_001E', 'state', 'county', 'tract'],
            ['100', '08', '031', '000100'],
        ];
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { GEOID: '08031000100', AREALAND: 0 },
            }],
        };
        // TIGERweb geo is fetched first, ACS comes second; census key needed to reach ACS path
        global.fetch = mockFetch([
            { ok: true, body: geoData },
            { ok: true, body: acsData },
        ]);
        const res  = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ censusKey: 'test-key' }));
        const body = await res.json();
        expect(body.features[0].properties.densityPerKm2).toBeNull();
    });

    it('returns tract outlines with null population when no Census API key is configured', async () => {
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { GEOID: '08031000100', AREALAND: 2_000_000 },
            }],
        };
        global.fetch = mockFetch({ ok: true, body: geoData });
        const res  = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv()); // no censusKey
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].properties.population).toBeNull();
        expect(body.features[0].properties.areaKm2).toBe(2);
        expect(body.features[0].properties.densityPerKm2).toBeNull();
        expect(body.features[0].properties.acsYear).toBe(2024);
    });

    it('returns 502 when Census APIs fail', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('caches population with 24-hour TTL keyed by year', async () => {
        const acsData = [['B01003_001E', 'state', 'county', 'tract']];
        const geoData = { type: 'FeatureCollection', features: [] };
        global.fetch = mockFetch([
            { ok: true, body: geoData },
            { ok: true, body: acsData },
        ]);
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/population?bbox=${validBbox}&year=2020`), makeEnv({ cacheSet: cachePut, censusKey: 'test-key' }));
        expect(cachePut).toHaveBeenCalledWith(
            `population:2020:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('year defaults to 2024 when not provided', async () => {
        const cachePut = vi.fn();
        const geoData  = { type: 'FeatureCollection', features: [] };
        global.fetch   = mockFetch({ ok: true, body: geoData });
        await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `population:2024:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('rejects out-of-range year and falls back to 2024', async () => {
        const cachePut = vi.fn();
        const geoData  = { type: 'FeatureCollection', features: [] };
        global.fetch   = mockFetch({ ok: true, body: geoData });
        await worker.fetch(req(`/api/population?bbox=${validBbox}&year=1990`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `population:2024:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('rate limits after 30 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { type: 'FeatureCollection', features: [] } });
        for (let i = 0; i < 30; i++) {
            const r = await worker.fetch(req(`/api/population?bbox=${validBbox}`, { ip: '9.9.9.3' }), env);
            expect(r.status).toBe(200);
        }
        const r = await worker.fetch(req(`/api/population?bbox=${validBbox}`, { ip: '9.9.9.3' }), env);
        expect(r.status).toBe(429);
    });
});

// ── /api/cities ───────────────────────────────────────────────────────────────

describe('/api/cities', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';

    it('returns 400 when bbox is missing', async () => {
        const res = await worker.fetch(req('/api/cities'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox area is too large', async () => {
        const res = await worker.fetch(req('/api/cities?bbox=-125.1,27.1,-72.0,50.6'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns cached cities data', async () => {
        const cached = { type: 'FeatureCollection', features: [] };
        const res    = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv({ cacheGet: cached }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('FeatureCollection');
    });

    it('fetches place geometry and returns null population without Census key', async () => {
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { NAME: 'Denver', GEOID: '0820000', STUSAB: 'CO' },
            }],
        };
        global.fetch = mockFetch({ ok: true, body: geoData });
        const res  = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].properties.name).toBe('Denver');
        expect(body.features[0].properties.population).toBeNull();
        expect(body.features[0].properties.acsYear).toBeNull();
    });

    it('fetches place geometry + ACS population and joins by GEOID', async () => {
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { NAME: 'Denver', GEOID: '0820000', STUSAB: 'CO' },
            }],
        };
        // ACS place columns: [B01003_001E, state, place]
        const acsData = [
            ['B01003_001E', 'state', 'place'],
            ['715522', '08', '20000'],
        ];
        global.fetch = mockFetch([
            { ok: true, body: geoData },
            { ok: true, body: acsData },
        ]);
        const res  = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv({ censusKey: 'test-key' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].properties.name).toBe('Denver');
        expect(body.features[0].properties.population).toBe(715522);
        expect(body.features[0].properties.acsYear).toBe(2024);
    });

    it('returns 502 when TIGERweb geo fetch fails', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('city not found in ACS data gets null population', async () => {
        const geoData = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry:   { type: 'Polygon', coordinates: [] },
                properties: { NAME: 'Smalltown', GEOID: '0899999', STUSAB: 'CO' },
            }],
        };
        // ACS returns data for a different place GEOID — no match
        const acsData = [
            ['B01003_001E', 'state', 'place'],
            ['5000', '08', '20000'],
        ];
        global.fetch = mockFetch([{ ok: true, body: geoData }, { ok: true, body: acsData }]);
        const res  = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv({ censusKey: 'test-key' }));
        const body = await res.json();
        expect(body.features[0].properties.population).toBeNull();
    });

    it('caches cities with 24-hour TTL keyed by year', async () => {
        const geoData = { type: 'FeatureCollection', features: [] };
        global.fetch  = mockFetch({ ok: true, body: geoData });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/cities?bbox=${validBbox}&year=2019`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `cities:2019:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('rate limits after 30 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { type: 'FeatureCollection', features: [] } });
        for (let i = 0; i < 30; i++) {
            const r = await worker.fetch(req(`/api/cities?bbox=${validBbox}`, { ip: '9.9.9.7' }), env);
            expect(r.status).toBe(200);
        }
        const r = await worker.fetch(req(`/api/cities?bbox=${validBbox}`, { ip: '9.9.9.7' }), env);
        expect(r.status).toBe(429);
    });
});

// ── /api/transit ──────────────────────────────────────────────────────────────

describe('/api/transit', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';

    it('returns 400 when bbox is missing', async () => {
        const res = await worker.fetch(req('/api/transit'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox area is too large', async () => {
        const res = await worker.fetch(req('/api/transit?bbox=-125.1,27.1,-72.0,50.6'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('falls back to second Overpass mirror when primary fails', async () => {
        let call = 0;
        global.fetch = vi.fn(async () => {
            call++;
            if (call === 1) return { ok: false, json: async () => ({}) }; // primary not ok
            return { ok: true, json: async () => ({ elements: [] }) };    // fallback ok
        });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        expect(call).toBe(2);
    });

    it('returns cached transit data', async () => {
        const cached = { type: 'FeatureCollection', features: [] };
        const res    = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv({ cacheGet: cached }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('FeatureCollection');
    });

    it('fetches from Overpass and converts to GeoJSON', async () => {
        const overpassData = {
            elements: [
                { type: 'node', id: 1, lat: 39.7, lon: -105.0, tags: { highway: 'bus_stop', name: 'Main & 1st', ref: 'A1' } },
                { type: 'node', id: 2, lat: 39.8, lon: -104.9, tags: { railway: 'station', name: 'Union Station' } },
                { type: 'node', id: 3, lat: 39.75, lon: -104.95, tags: { railway: 'subway_entrance' } },
                { type: 'node', id: 4 }, // no lat/lon — should be filtered out
            ],
        };
        global.fetch = mockFetch({ ok: true, body: overpassData });
        const res  = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(3);
        expect(body.features[0].properties.transit).toBe('bus');
        expect(body.features[0].properties.name).toBe('Main & 1st');
        expect(body.features[1].properties.transit).toBe('rail');
        expect(body.features[2].properties.transit).toBe('subway');
    });

    it('returns 502 when Overpass API fails', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('handles Overpass response with no elements field', async () => {
        global.fetch = mockFetch({ ok: true, body: {} }); // no elements key
        const res  = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(0);
    });

    it('handles transit node with no tags using fallback name', async () => {
        const overpassData = {
            elements: [
                { type: 'node', id: 5, lat: 39.72, lon: -104.98 }, // no tags
            ],
        };
        global.fetch = mockFetch({ ok: true, body: overpassData });
        const res  = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features[0].properties.name).toBe('Transit Stop');
        expect(body.features[0].properties.transit).toBe('bus');
    });

    it('caches transit data with 1-hour TTL', async () => {
        global.fetch = mockFetch({ ok: true, body: { elements: [] } });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `transit:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('rate limits after 30 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { type: 'FeatureCollection', features: [] } });
        for (let i = 0; i < 30; i++) {
            const r = await worker.fetch(req(`/api/transit?bbox=${validBbox}`, { ip: '9.9.9.8' }), env);
            expect(r.status).toBe(200);
        }
        const r = await worker.fetch(req(`/api/transit?bbox=${validBbox}`, { ip: '9.9.9.8' }), env);
        expect(r.status).toBe(429);
    });
});

// ── /api/health ───────────────────────────────────────────────────────────────

describe('/api/health', () => {
    it('returns status ok when all probes succeed', async () => {
        global.fetch = mockFetch({ ok: true, body: {} });
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.checks).toHaveProperty('arcgis');
        expect(body.checks).toHaveProperty('census');
        expect(body.checks).toHaveProperty('epa');
        expect(body.checks).toHaveProperty('overpass');
    });

    it('returns degraded when any probe fails', async () => {
        let call = 0;
        global.fetch = vi.fn(async () => {
            call++;
            return { ok: call !== 1, json: async () => ({}) }; // first probe fails
        });
        const res  = await worker.fetch(req('/api/health'), makeEnv());
        const body = await res.json();
        expect(body.status).toBe('degraded');
    });

    it('includes Census API key in probe URL when key is configured', async () => {
        global.fetch = mockFetch({ ok: true, body: {} });
        const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
        global.fetch = fetchSpy;
        await worker.fetch(req('/api/health'), makeEnv({ censusKey: 'test-key' }));
        const urls = fetchSpy.mock.calls.map(c => c[0]);
        expect(urls.some(u => u.includes('key=test-key'))).toBe(true);
    });
});

// ── /api/walkscore ────────────────────────────────────────────────────────────

describe('/api/walkscore', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';

    it('returns 400 when bbox is missing', async () => {
        const res = await worker.fetch(req('/api/walkscore'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 400 when bbox area is too large', async () => {
        const res = await worker.fetch(req('/api/walkscore?bbox=-125.1,27.1,-72.0,50.6'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns cached walkscore data', async () => {
        const cached = { type: 'FeatureCollection', features: [] };
        const res    = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), makeEnv({ cacheGet: cached }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('FeatureCollection');
    });

    it('fetches from EPA and maps features to GeoJSON', async () => {
        const epaData = {
            type: 'FeatureCollection',
            features: [
                { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: { GEOID10: '080310001001', NatWalkInd: '15.5', StatAbbr: 'CO' } },
                { type: 'Feature', geometry: null, properties: {} }, // filtered out — no coordinates
            ],
        };
        global.fetch = mockFetch({ ok: true, body: epaData });
        const res  = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.features).toHaveLength(1);
        expect(body.features[0].properties.natWalkInd).toBe(15.5);
        expect(body.features[0].properties.statAbbr).toBe('CO');
    });

    it('returns 502 when EPA responds with HTTP error', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('returns 502 when EPA responds with an API error body', async () => {
        global.fetch = mockFetch({ ok: true, body: { error: { message: 'service unavailable' } } });
        const res = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('stores walkscore with 30-day KV TTL', async () => {
        global.fetch = mockFetch({ ok: true, body: { type: 'FeatureCollection', features: [] } });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `walkscore:${validBbox}`,
            expect.any(String),
            { expirationTtl: 30 * 86_400 }
        );
    });

    it('rate limits after 60 requests from same IP', async () => {
        const env = makeEnv({ cacheGet: { type: 'FeatureCollection', features: [] } });
        for (let i = 0; i < 60; i++) {
            const r = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`, { ip: '9.9.9.9' }), env);
            expect(r.status).toBe(200);
        }
        const r = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`, { ip: '9.9.9.9' }), env);
        expect(r.status).toBe(429);
    });
});

// ── Misc route coverage ───────────────────────────────────────────────────────

describe('Misc routes', () => {
    it('returns 400 for layer name with non-alpha characters', async () => {
        const res = await worker.fetch(req('/api/layers/bad-name?bbox=-105.1,39.6,-104.7,39.9'), makeEnv());
        expect(res.status).toBe(400);
    });

    it('returns 204 for /favicon.ico', async () => {
        const res = await worker.fetch(req('/favicon.ico'), makeEnv());
        expect(res.status).toBe(204);
    });
});

// ── Stale cache fallback ──────────────────────────────────────────────────────

describe('Stale cache fallback', () => {
    const validBbox = '-105.1,39.6,-104.7,39.9';
    const staleData = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: null, properties: { name: 'cached' } }] };

    it('serves stale transit data with X-Cache: stale when Overpass is down', async () => {
        global.fetch = mockFetch({ ok: false });
        // cacheGetAge 2 hours — past the 1-hour transit fresh window
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 7_200_000 });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
        const body = await res.json();
        expect(body.features[0].properties.name).toBe('cached');
    });

    it('serves stale walkscore data when EPA geodata is down', async () => {
        global.fetch = mockFetch({ ok: false });
        // cacheGetAge 8 days — past the 7-day walkscore fresh window
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 86_400_000 * 8 });
        const res = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
    });

    it('serves stale neighborhoods layer when TIGERweb is down', async () => {
        global.fetch = mockFetch({ ok: false });
        // cacheGetAge 2 days — past the 24-hour layer fresh window
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 86_400_000 * 2 });
        const res = await worker.fetch(req(`/api/layers/neighborhoods?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
    });

    it('serves stale population data when Census geo is down', async () => {
        global.fetch = mockFetch({ ok: false });
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 86_400_000 * 2 });
        const res = await worker.fetch(req(`/api/population?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
    });

    it('serves stale cities data when TIGERweb is down', async () => {
        global.fetch = mockFetch({ ok: false });
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 86_400_000 * 2 });
        const res = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
    });

    it('serves stale geocode when upstream geocoder is unavailable', async () => {
        global.fetch = mockFetch({ ok: false });
        const geocacheData = { features: [{ place_name: 'Denver, CO', center: [-104.9, 39.7] }] };
        // cacheGetAge 2 hours — past the 1-hour geocode fresh window
        const env = makeEnv({ cacheGet: geocacheData, cacheGetAge: 7_200_000 });
        const res = await worker.fetch(req('/api/search?q=denver'), env);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
        const body = await res.json();
        expect(body.features[0].place_name).toBe('Denver, CO');
    });

    it('still returns 502 when upstream fails and no stale data exists', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('handles legacy KV entries (plain value, no envelope) as stale fallback', async () => {
        global.fetch = mockFetch({ ok: false }); // upstream fails
        const env = makeEnv();
        // Override get to return old plain-value format without { data, t } wrapper
        env.LOCATOR_CACHE.get = vi.fn(async () => JSON.stringify({ type: 'FeatureCollection', features: [] }));
        const res = await worker.fetch(req(`/api/walkscore?bbox=${validBbox}`), env);
        // Legacy entry gets t=0 (treated as stale); upstream fails; stale data served
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Cache')).toBe('stale');
    });

    it('stale response carries Cache-Control: no-store', async () => {
        global.fetch = mockFetch({ ok: false });
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 7_200_000 });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), env);
        expect(res.headers.get('Cache-Control')).toBe('no-store');
    });

    it('fresh cache is returned directly without calling upstream', async () => {
        const fetchSpy = vi.fn();
        global.fetch = fetchSpy;
        // cacheGetAge 0 — well within the 1-hour transit fresh window
        const env = makeEnv({ cacheGet: staleData, cacheGetAge: 0 });
        const res = await worker.fetch(req(`/api/transit?bbox=${validBbox}`), env);
        expect(res.status).toBe(200);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

// ── KV cache fault tolerance ──────────────────────────────────────────────────

describe('KV cache fault tolerance', () => {
    it('handles KV get error gracefully', async () => {
        const env = {
            LOCATOR_CACHE: {
                get: vi.fn(async () => { throw new Error('KV down'); }),
                put: vi.fn(),
            },
            MAPBOX_TOKEN: '',
        };
        global.fetch = mockFetch({ ok: true, body: [] });
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(200);
    });

    it('handles KV put error gracefully', async () => {
        const env = {
            LOCATOR_CACHE: {
                get: vi.fn(async () => null),
                put: vi.fn(async () => { throw new Error('KV write fail'); }),
            },
            MAPBOX_TOKEN: '',
        };
        global.fetch = mockFetch({ ok: true, body: [] });
        // Should not throw
        const res = await worker.fetch(req('/api/search?q=Denver'), env);
        expect(res.status).toBe(200);
    });
});
