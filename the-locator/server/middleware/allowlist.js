'use strict';

import { ALLOWED_DOMAINS } from '../config/domains.js';

// Validates that the request originates from a registered embed domain.
// Checks Origin first, falls back to Referer for same-origin navigations.
export function allowlist(req, res, next) {
    const origin  = req.headers['origin']  || '';
    const referer = req.headers['referer'] || '';

    const source = origin || new URL(referer || 'http://unknown').origin;

    if (isAllowed(source)) return next();

    res.status(403).json({ error: 'Domain not registered for embed access' });
}

function isAllowed(origin) {
    if (!origin || origin === 'null') return false;
    try {
        const { hostname } = new URL(origin);
        return ALLOWED_DOMAINS.some(pattern => matchesDomain(hostname, pattern));
    } catch {
        return false;
    }
}

// Supports exact matches and wildcard subdomain patterns (*.example.com)
function matchesDomain(hostname, pattern) {
    if (pattern.startsWith('*.')) {
        const base = pattern.slice(2);
        return hostname === base || hostname.endsWith('.' + base);
    }
    return hostname === pattern;
}
