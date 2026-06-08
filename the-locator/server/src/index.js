'use strict';

import 'dotenv/config';
import express        from 'express';
import searchRoute    from './routes/search.js';
import layersRoute    from './routes/layers.js';
import populationRoute from './routes/population.js';
import embedRoute     from './routes/embed.js';
import { allowlist }  from './middleware/allowlist.js';
import { rateLimiter, strictLimiter } from './middleware/rateLimit.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options',    'nosniff');
    res.setHeader('X-Frame-Options',           'DENY');
    res.setHeader('Referrer-Policy',           'no-referrer');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
});

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/search',     strictLimiter, searchRoute);
app.use('/api/layers',     rateLimiter,   allowlist, layersRoute);
app.use('/api/population', strictLimiter, allowlist, populationRoute);
app.use('/embed.js',       allowlist, embedRoute);

app.listen(PORT, () => console.log(`The Locator server running on :${PORT}`));
