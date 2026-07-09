import { Hono }       from 'hono';
import { z }           from 'zod';
import { zValidator }  from '@hono/zod-validator';
import { and, eq, desc } from 'drizzle-orm';
import { getDb }       from '../db/client';
import { events, eventSales } from '../db/schema';
import { authMiddleware }     from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const eventSchema = z.object({
    projectId:            z.string().optional().nullable(),
    name:                 z.string().min(1),
    date:                 z.string().optional().nullable(),
    endDate:              z.string().optional().nullable(),
    startTime:            z.string().optional().nullable(),
    endTime:              z.string().optional().nullable(),
    location:             z.string().optional().nullable(),
    address:              z.string().optional().nullable(),
    attendanceExpected:   z.number().int().nonnegative().optional().nullable(),
    attendanceActual:     z.number().int().nonnegative().optional().nullable(),
    notes:                z.string().optional().nullable(),
    costTableCents:       z.number().int().nonnegative().default(0),
    costHotelCents:       z.number().int().nonnegative().default(0),
    costGasCents:         z.number().int().nonnegative().default(0),
    costOtherCents:       z.number().int().nonnegative().default(0),
    costOtherDescription: z.string().optional().nullable(),
});

const saleSchema = z.object({
    projectId:       z.string().min(1),
    quantityBrought: z.number().int().nonnegative().default(0),
    quantitySold:    z.number().int().nonnegative().default(0),
    priceCents:      z.number().int().nonnegative().default(0),
    notes:           z.string().optional().nullable(),
});

// ── Events CRUD ───────────────────────────────────────────────────────────────

app.get('/', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db.select().from(events)
        .where(eq(events.userId, c.get('userId')))
        .orderBy(desc(events.date))
        .all();
    return c.json(rows);
});

app.post('/', zValidator('json', eventSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const body  = c.req.valid('json');
    const [row] = await db.insert(events)
        .values({ ...body, userId: c.get('userId') })
        .returning();
    return c.json(row, 201);
});

app.get('/:id', async (c) => {
    const db  = getDb(c.env.DB);
    const row = await db.select().from(events)
        .where(and(eq(events.id, c.req.param('id')!), eq(events.userId, c.get('userId')))).get();
    if (!row) return c.notFound();
    return c.json(row);
});

app.patch('/:id', zValidator('json', eventSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(events)
        .set(c.req.valid('json'))
        .where(and(eq(events.id, c.req.param('id')!), eq(events.userId, c.get('userId'))))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(events)
        .where(and(eq(events.id, c.req.param('id')!), eq(events.userId, c.get('userId'))));
    return c.body(null, 204);
});

// ── Event sales items ─────────────────────────────────────────────────────────

app.get('/:id/sales', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db.select().from(eventSales)
        .where(and(eq(eventSales.eventId, c.req.param('id')!), eq(eventSales.userId, c.get('userId'))))
        .all();
    return c.json(rows);
});

app.post('/:id/sales', zValidator('json', saleSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const body  = c.req.valid('json');
    const [row] = await db.insert(eventSales)
        .values({ ...body, eventId: c.req.param('id')!, userId: c.get('userId') })
        .returning();
    return c.json(row, 201);
});

app.patch('/:id/sales/:saleId', zValidator('json', saleSchema.partial()), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(eventSales)
        .set(c.req.valid('json'))
        .where(and(eq(eventSales.id, c.req.param('saleId')!), eq(eventSales.userId, c.get('userId'))))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:id/sales/:saleId', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(eventSales)
        .where(and(eq(eventSales.id, c.req.param('saleId')!), eq(eventSales.userId, c.get('userId'))));
    return c.body(null, 204);
});

export default app;
