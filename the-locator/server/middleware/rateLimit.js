'use strict';

import rateLimit from 'express-rate-limit';

// Standard limit: layer/population data endpoints
export const rateLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests — slow down' },
});

// Strict limit: geocoding (billed per call)
export const strictLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Search rate limit reached — try again shortly' },
});
