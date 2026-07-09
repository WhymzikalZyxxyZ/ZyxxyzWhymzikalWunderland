import { Hono }   from 'hono';
import { cors }   from 'hono/cors';
import { logger } from 'hono/logger';
import type { Bindings, Variables } from './types';

import authRouter                              from './routes/auth';
import genresRouter                            from './routes/genres';
import seriesRouter                            from './routes/series';
import projectsRouter                          from './routes/projects';
import chaptersRouter, { chaptersGlobalRouter } from './routes/chapters';
import charactersRouter                        from './routes/characters';
import commissionsRouter, { commissionsGlobalRouter } from './routes/commissions';
import publishingRouter                        from './routes/publishing';
import uploadsRouter                           from './routes/uploads';
import aiRouter                                from './routes/ai';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use('*', logger());
app.use('/api/*', cors({
    origin: (origin, c) => {
        const allowed = [c.env.SITE_ORIGIN, 'https://epitome.zyxwonderland.xyz', 'http://localhost:5173'];
        if (!origin || allowed.includes(origin)) return origin ?? '';
        return '';
    },
    allowMethods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders:  ['Content-Type'],
    exposeHeaders: ['Content-Length'],
    credentials:   true,
    maxAge:        600,
}));

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/api/auth',                               authRouter);
app.route('/api/genres',                             genresRouter);
app.route('/api/series',                             seriesRouter);
app.route('/api/projects',                           projectsRouter);
app.route('/api/projects/:projectId/chapters',       chaptersRouter);
app.route('/api/projects/:projectId/characters',     charactersRouter);
app.route('/api/projects/:projectId/commissions',    commissionsRouter);
app.route('/api/projects/:projectId/publishing',     publishingRouter);
app.route('/api/chapters',                           chaptersGlobalRouter);
app.route('/api/commissions',                        commissionsGlobalRouter);
app.route('/api/uploads',                            uploadsRouter);
app.route('/api/ai',                                 aiRouter);
app.get('/api/files/*', (c) => uploadsRouter.fetch(c.req.raw, c.env, c.executionCtx as ExecutionContext));

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/api/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ── Error handling ────────────────────────────────────────────────────────────

app.onError((err, c) => {
    console.error('[epitome]', err);
    return c.json({ error: err.message }, 500);
});

app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404);
    return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
