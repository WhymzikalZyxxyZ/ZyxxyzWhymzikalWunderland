'use strict';

import { Router }  from 'express';
import { readFile } from 'fs/promises';
import { resolve }  from 'path';

const router = Router();

// Serves the embed.js client bundle.
// The allowlist middleware runs before this route; unregistered domains never reach here.
router.get('/', async (req, res) => {
    try {
        const bundlePath = resolve('dist', 'embed.js');
        const bundle     = await readFile(bundlePath, 'utf8');
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min — short so updates propagate
        res.send(bundle);
    } catch {
        res.status(503).json({ error: 'Embed bundle not available' });
    }
});

export default router;
