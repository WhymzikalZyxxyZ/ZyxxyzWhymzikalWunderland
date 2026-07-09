import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, eq, desc } from 'drizzle-orm';
import { getDb }      from '../db/client';
import { commissions }     from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

// ── Global router (all user commissions, for Dashboard Sales tab) ─────────────

export const commissionsGlobalRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
commissionsGlobalRouter.use('*', authMiddleware);
commissionsGlobalRouter.get('/', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(commissions)
        .where(eq(commissions.userId, c.get('userId')))
        .orderBy(desc(commissions.createdAt))
        .all());
});

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const createSchema = z.object({
    who:         z.string().min(1).max(200),
    amountCents: z.number().int().nonnegative().optional(),
    description: z.string().min(1),
    deadline:    z.string().optional(),
    done:        z.boolean().default(false),
});

const patchSchema = createSchema.partial();

app.get('/', async (c) => {
    const db = getDb(c.env.DB);
    return c.json(await db.select().from(commissions)
        .where(and(eq(commissions.projectId, c.req.param('projectId')!), eq(commissions.userId, c.get('userId'))))
        .all());
});

app.post('/', zValidator('json', createSchema), async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');
    const [row]     = await db.insert(commissions).values({ ...c.req.valid('json'), projectId, userId }).returning();
    return c.json(row, 201);
});

app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(commissions).set(c.req.valid('json'))
        .where(and(eq(commissions.id, c.req.param('id')!), eq(commissions.userId, c.get('userId'))))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:id', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(commissions)
        .where(and(eq(commissions.id, c.req.param('id')!), eq(commissions.userId, c.get('userId'))));
    return c.body(null, 204);
});

export default app;
