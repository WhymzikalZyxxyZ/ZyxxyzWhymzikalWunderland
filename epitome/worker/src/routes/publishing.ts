import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, eq }    from 'drizzle-orm';
import { getDb }      from '../db/client';
import { publishing, compTitles, publishingSizes, distribution, events, manufacturers, socialLinks, projects } from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Auth + project ownership verified once for every sub-route
app.use('*', authMiddleware);
app.use('*', async (c, next) => {
    const projectId = c.req.param('projectId');
    if (projectId) {
        const db = getDb(c.env.DB);
        const p  = await db.select({ id: projects.id }).from(projects)
            .where(and(eq(projects.id, projectId), eq(projects.userId, c.get('userId')))).get();
        if (!p) return c.notFound();
    }
    await next();
});

// ── Publishing record ─────────────────────────────────────────────────────────

const pubSchema = z.object({
    pubType:            z.enum(['traditional', 'self']),
    datePublished:      z.string().optional(),
    isbn:               z.string().optional(),
    publisherName:      z.string().optional(),
    dealDetails:        z.string().optional(),
    contractStorageKey: z.string().optional(),
});

app.get('/', async (c) => {
    const db  = getDb(c.env.DB);
    const row = await db.select().from(publishing).where(eq(publishing.projectId, c.req.param('projectId')!)).get();
    return c.json(row ?? null);
});

// Upsert — eliminates the check-then-insert race condition; projectId is UNIQUE
app.put('/', zValidator('json', pubSchema), async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');
    const body      = c.req.valid('json');
    const [row]     = await db.insert(publishing)
        .values({ ...body, projectId, userId })
        .onConflictDoUpdate({
            target: publishing.projectId,
            set:    { ...body, updatedAt: new Date().toISOString() },
        })
        .returning();
    return c.json(row);
});

// ── Comp titles ───────────────────────────────────────────────────────────────

const compSchema = z.object({
    title:  z.string().min(1),
    author: z.string().min(1),
    year:   z.number().int().optional(),
    reason: z.string().optional(),
});

app.get('/comps', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(compTitles).where(eq(compTitles.projectId, c.req.param('projectId')!)).all());
});

app.post('/comps', zValidator('json', compSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(compTitles).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')! }).returning();
    return c.json(row, 201);
});

app.patch('/comps/:id', zValidator('json', compSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(compTitles).set(c.req.valid('json'))
        .where(and(eq(compTitles.id, c.req.param('id')!), eq(compTitles.projectId, c.req.param('projectId')!)))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/comps/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(compTitles)
        .where(and(eq(compTitles.id, c.req.param('id')!), eq(compTitles.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

// ── Sizes ─────────────────────────────────────────────────────────────────────

const sizeSchema = z.object({
    sizeLabel: z.string().min(1),
    format:    z.enum(['paperback', 'hardcover', 'ebook', 'audio']),
});

app.get('/sizes', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(publishingSizes).where(eq(publishingSizes.projectId, c.req.param('projectId')!)).all());
});

app.post('/sizes', zValidator('json', sizeSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(publishingSizes).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')! }).returning();
    return c.json(row, 201);
});

app.delete('/sizes/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(publishingSizes)
        .where(and(eq(publishingSizes.id, c.req.param('id')!), eq(publishingSizes.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

// ── Distribution ──────────────────────────────────────────────────────────────

const distSchema = z.object({
    channel:   z.string().min(1),
    label:     z.string().min(1),
    url:       z.string().url().optional(),
    inventory: z.number().int().nonnegative().default(0),
    onOrder:   z.number().int().nonnegative().default(0),
    notes:     z.string().optional(),
});

app.get('/distribution', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(distribution).where(eq(distribution.projectId, c.req.param('projectId')!)).all());
});

app.post('/distribution', zValidator('json', distSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(distribution).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')! }).returning();
    return c.json(row, 201);
});

app.patch('/distribution/:id', zValidator('json', distSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(distribution).set(c.req.valid('json'))
        .where(and(eq(distribution.id, c.req.param('id')!), eq(distribution.projectId, c.req.param('projectId')!)))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/distribution/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(distribution)
        .where(and(eq(distribution.id, c.req.param('id')!), eq(distribution.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

// ── Events ────────────────────────────────────────────────────────────────────

const eventSchema = z.object({
    name:     z.string().min(1),
    date:     z.string().optional(),
    location: z.string().optional(),
    notes:    z.string().optional(),
});

app.get('/events', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(events).where(eq(events.projectId, c.req.param('projectId')!)).all());
});

app.post('/events', zValidator('json', eventSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(events).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')!, userId: c.get('userId') }).returning();
    return c.json(row, 201);
});

app.patch('/events/:id', zValidator('json', eventSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(events).set(c.req.valid('json'))
        .where(and(eq(events.id, c.req.param('id')!), eq(events.projectId, c.req.param('projectId')!)))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/events/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(events)
        .where(and(eq(events.id, c.req.param('id')!), eq(events.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

// ── Manufacturers ─────────────────────────────────────────────────────────────

const mfgSchema = z.object({
    name:        z.string().min(1),
    type:        z.enum(['printer', 'distributor', 'manufacturer']),
    contactInfo: z.string().optional(),
    notes:       z.string().optional(),
});

app.get('/manufacturers', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(manufacturers).where(eq(manufacturers.projectId, c.req.param('projectId')!)).all());
});

app.post('/manufacturers', zValidator('json', mfgSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(manufacturers).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')!, userId: c.get('userId') }).returning();
    return c.json(row, 201);
});

app.patch('/manufacturers/:id', zValidator('json', mfgSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(manufacturers).set(c.req.valid('json'))
        .where(and(eq(manufacturers.id, c.req.param('id')!), eq(manufacturers.projectId, c.req.param('projectId')!)))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/manufacturers/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(manufacturers)
        .where(and(eq(manufacturers.id, c.req.param('id')!), eq(manufacturers.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

// ── Social links ──────────────────────────────────────────────────────────────

const socialSchema = z.object({
    platform: z.string().min(1),
    url:      z.string().url(),
    handle:   z.string().optional(),
});

app.get('/social', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(socialLinks).where(eq(socialLinks.projectId, c.req.param('projectId')!)).all());
});

app.post('/social', zValidator('json', socialSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(socialLinks).values({ ...c.req.valid('json'), projectId: c.req.param('projectId')! }).returning();
    return c.json(row, 201);
});

app.delete('/social/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(socialLinks)
        .where(and(eq(socialLinks.id, c.req.param('id')!), eq(socialLinks.projectId, c.req.param('projectId')!)));
    return c.body(null, 204);
});

export default app;
