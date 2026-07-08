import { Hono }   from 'hono';
import { z }       from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq }      from 'drizzle-orm';
import { getDb }   from '../db/client';
import { genres }  from '../db/schema';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

const createSchema = z.object({
    name:     z.string().min(1).max(100),
    parentId: z.string().uuid().optional(),
});

app.get('/', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db.select().from(genres).all();
    return c.json(rows);
});

app.post('/', zValidator('json', createSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const body  = c.req.valid('json');
    const [row] = await db.insert(genres).values(body).returning();
    return c.json(row, 201);
});

app.delete('/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(genres).where(eq(genres.id, c.req.param('id')!));
    return c.body(null, 204);
});

export default app;
