import { Hono }       from 'hono';
import { z }           from 'zod';
import { zValidator }  from '@hono/zod-validator';
import { and, eq, desc } from 'drizzle-orm';
import { getDb }       from '../db/client';
import { inventory, salesRecords } from '../db/schema';
import { authMiddleware }          from '../middleware/auth';
import type { Bindings, Variables } from '../types';

// ── Per-project inventory router ──────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const inventorySchema = z.object({
    channel:      z.enum(['inperson', 'online', 'kdp']),
    platform:     z.string().optional().nullable(),
    label:        z.string().min(1),
    costCents:    z.number().int().nonnegative().default(0),
    priceCents:   z.number().int().nonnegative().default(0),
    stockCount:   z.number().int().nonnegative().default(0),
    stockOnOrder: z.number().int().nonnegative().default(0),
    available:    z.boolean().default(true),
    availableUrl: z.string().url().optional().nullable(),
});

const saleSchema = z.object({
    inventoryId:  z.string().optional().nullable(),
    channel:      z.enum(['inperson', 'online', 'kdp']),
    platform:     z.string().optional().nullable(),
    quantity:     z.number().int().positive().default(1),
    revenueCents: z.number().int().nonnegative().default(0),
    royaltyCents: z.number().int().optional().nullable(),
    pagesRead:    z.number().int().nonnegative().optional().nullable(),
    saleDate:     z.string().optional().nullable(),
    notes:        z.string().optional().nullable(),
    source:       z.string().default('manual'),
});

// ── Inventory CRUD ────────────────────────────────────────────────────────────

app.get('/', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db.select().from(inventory)
        .where(and(eq(inventory.projectId, c.req.param('projectId')!), eq(inventory.userId, c.get('userId'))))
        .all();
    return c.json(rows);
});

app.post('/', zValidator('json', inventorySchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(inventory)
        .values({ ...c.req.valid('json'), projectId: c.req.param('projectId')!, userId: c.get('userId') })
        .returning();
    return c.json(row, 201);
});

// ── Sales records (declared before /:itemId to avoid Hono dynamic-segment shadowing) ────

app.get('/sales', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db.select().from(salesRecords)
        .where(and(eq(salesRecords.projectId, c.req.param('projectId')!), eq(salesRecords.userId, c.get('userId'))))
        .orderBy(desc(salesRecords.saleDate))
        .all();
    return c.json(rows);
});

app.post('/sales', zValidator('json', saleSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(salesRecords)
        .values({ ...c.req.valid('json'), projectId: c.req.param('projectId')!, userId: c.get('userId') })
        .returning();
    return c.json(row, 201);
});

app.delete('/sales/:saleId', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(salesRecords)
        .where(and(eq(salesRecords.id, c.req.param('saleId')!), eq(salesRecords.userId, c.get('userId'))));
    return c.body(null, 204);
});

// ── Inventory item CRUD (dynamic segment — after all static /sales routes) ────

app.patch('/:itemId', zValidator('json', inventorySchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const body  = { ...c.req.valid('json'), updatedAt: new Date().toISOString() };
    const [row] = await db.update(inventory).set(body)
        .where(and(eq(inventory.id, c.req.param('itemId')!), eq(inventory.userId, c.get('userId'))))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:itemId', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(inventory)
        .where(and(eq(inventory.id, c.req.param('itemId')!), eq(inventory.userId, c.get('userId'))));
    return c.body(null, 204);
});

export default app;
