import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, eq }    from 'drizzle-orm';
import { getDb }      from '../db/client';
import { series }          from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const createSchema = z.object({
    name:        z.string().min(1).max(200),
    description: z.string().optional(),
});

const patchSchema = createSchema.partial();

app.get('/', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(series).where(eq(series.userId, c.get('userId'))).all());
});

app.post('/', zValidator('json', createSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.insert(series).values({ ...c.req.valid('json'), userId: c.get('userId') }).returning();
    return c.json(row, 201);
});

app.get('/:id', async (c) => {
    const db  = getDb(c.env.DB);
    const row = await db.select().from(series)
        .where(and(eq(series.id, c.req.param('id')!), eq(series.userId, c.get('userId')))).get();
    if (!row) return c.notFound();
    return c.json(row);
});

app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(series)
        .set({ ...c.req.valid('json'), updatedAt: new Date().toISOString() })
        .where(and(eq(series.id, c.req.param('id')!), eq(series.userId, c.get('userId'))))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(series)
        .where(and(eq(series.id, c.req.param('id')!), eq(series.userId, c.get('userId'))));
    return c.body(null, 204);
});

export default app;
