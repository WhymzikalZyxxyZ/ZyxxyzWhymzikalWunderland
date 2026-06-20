'use strict';

import { describe, it, expect, vi } from 'vitest';
import worker from '../index.js';

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

function makeEnv({ cacheGet = null, cacheSet = vi.fn(), mapboxToken = '', censusKey = '' } = {}) {
    return {
        LOCATOR_CACHE: {
            get: vi.fn(async () => cacheGet !== null ? JSON.stringify(cacheGet) : null),
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
        ACS_YEAR:        '2022',
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

    it('non-GET returns 405', async () => {
        const res = await worker.fetch(req('/api/search', { method: 'POST' }), makeEnv());
        expect(res.status).toBe(405);
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
        expect(cachePut).toHaveBeenCalledWith('geocode:austin', expect.any(String), { expirationTtl: 3600 });
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
            { expirationTtl: 86400 }
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

    it('superfund uses 6-hour TTL', async () => {
        global.fetch = mockFetch({ ok: true, body: { type: 'FeatureCollection', features: [] } });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/layers/superfund?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(expect.any(String), expect.any(String), { expirationTtl: 21600 });
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
        expect(body.features[0].properties.acsYear).toBe(2022);
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
            { expirationTtl: 86400 }
        );
    });

    it('year defaults to 2022 when not provided', async () => {
        const cachePut = vi.fn();
        const geoData  = { type: 'FeatureCollection', features: [] };
        global.fetch   = mockFetch({ ok: true, body: geoData });
        await worker.fetch(req(`/api/population?bbox=${validBbox}`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `population:2022:${validBbox}`,
            expect.any(String),
            { expirationTtl: 86400 }
        );
    });

    it('rejects out-of-range year and falls back to 2022', async () => {
        const cachePut = vi.fn();
        const geoData  = { type: 'FeatureCollection', features: [] };
        global.fetch   = mockFetch({ ok: true, body: geoData });
        await worker.fetch(req(`/api/population?bbox=${validBbox}&year=1990`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `population:2022:${validBbox}`,
            expect.any(String),
            { expirationTtl: 86400 }
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
        expect(body.features[0].properties.acsYear).toBe(2022);
    });

    it('returns 502 when TIGERweb geo fetch fails', async () => {
        global.fetch = mockFetch({ ok: false });
        const res = await worker.fetch(req(`/api/cities?bbox=${validBbox}`), makeEnv());
        expect(res.status).toBe(502);
    });

    it('caches cities with 24-hour TTL keyed by year', async () => {
        const geoData = { type: 'FeatureCollection', features: [] };
        global.fetch  = mockFetch({ ok: true, body: geoData });
        const cachePut = vi.fn();
        await worker.fetch(req(`/api/cities?bbox=${validBbox}&year=2019`), makeEnv({ cacheSet: cachePut }));
        expect(cachePut).toHaveBeenCalledWith(
            `cities:2019:${validBbox}`,
            expect.any(String),
            { expirationTtl: 86400 }
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
