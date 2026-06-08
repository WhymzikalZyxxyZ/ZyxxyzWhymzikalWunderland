'use strict';

import { Router } from 'express';
import { getCache, setCache } from '../middleware/cache.js';
import { TTL } from '../config/ttl.js';

const router = Router();

// US bounding box — reject any geocoding result outside this range
const US_BOUNDS = { minLng: -180, minLat: 18, maxLng: -66, maxLat: 72 };

router.get('/', async (req, res) => {
    const q = sanitizeQuery(req.query.q);
    if (!q) return res.status(400).json({ error: 'q parameter is required' });

    const cacheKey = `geocode:${q.toLowerCase()}`;
    const cached   = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const token = process.env.MAPBOX_TOKEN;
    const url   = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
        + `?types=place,postcode&country=us&access_token=${token}`;

    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(502).json({ error: 'Geocoding service unavailable' });

    const data     = await upstream.json();
    const features = (data.features || []).filter(f => withinUS(f.bbox || f.center));

    const result = { features };
    await setCache(cacheKey, result, TTL.geocoding);
    res.json(result);
});

function sanitizeQuery(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim().slice(0, 100);
    // Strip characters that are not alphanumeric, spaces, commas, hyphens, or periods
    return trimmed.replace(/[^a-zA-Z0-9 ,.\-]/g, '') || null;
}

function withinUS([lng, lat]) {
    return lng >= US_BOUNDS.minLng && lng <= US_BOUNDS.maxLng
        && lat >= US_BOUNDS.minLat && lat <= US_BOUNDS.maxLat;
}

export default router;
