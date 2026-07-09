import { Hono }       from 'hono';
import { z }           from 'zod';
import { zValidator }  from '@hono/zod-validator';
import { eq, desc, sql } from 'drizzle-orm';
import { getDb }       from '../db/client';
import { projects } from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const PROJECT_TYPES    = ['novel', 'short_story', 'essay', 'poetry', 'novella'] as const;
const PROJECT_STATUSES = ['concept', 'drafting', 'revising', 'querying', 'on_hold', 'published'] as const;

const createSchema = z.object({
    title:           z.string().min(1).max(300),
    type:            z.enum(PROJECT_TYPES),
    status:          z.enum(PROJECT_STATUSES).default('drafting'),
    seriesId:        z.string().uuid().optional(),
    seriesNumber:    z.number().int().positive().optional(),
    genreId:         z.string().uuid().optional(),
    blurb:           z.string().optional(),
    summary:         z.string().optional(),
    targetWordCount: z.number().int().positive().optional(),
    pubType:         z.enum(['traditional', 'self']).optional(),
});

const patchSchema = createSchema.extend({
    mainCoverKey: z.string().nullable().optional(),
}).partial();

// ── Dashboard aggregates ──────────────────────────────────────────────────────

app.get('/stats', async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');

    const row = await db
        .select({
            total:     sql<number>`count(*)`,
            totalWords: sql<number>`sum(${projects.totalWords})`,
            concept:   sql<number>`sum(case when ${projects.status}='concept'   then 1 else 0 end)`,
            drafting:  sql<number>`sum(case when ${projects.status}='drafting'  then 1 else 0 end)`,
            revising:  sql<number>`sum(case when ${projects.status}='revising'  then 1 else 0 end)`,
            querying:  sql<number>`sum(case when ${projects.status}='querying'  then 1 else 0 end)`,
            on_hold:   sql<number>`sum(case when ${projects.status}='on_hold'   then 1 else 0 end)`,
            published: sql<number>`sum(case when ${projects.status}='published' then 1 else 0 end)`,
        })
        .from(projects)
        .where(eq(projects.userId, userId))
        .get();

    return c.json(row ?? { total: 0, totalWords: 0, concept: 0, drafting: 0, revising: 0, querying: 0, on_hold: 0, published: 0 });
});

// ── List ──────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, c.get('userId')))
        .orderBy(desc(projects.updatedAt))
        .all();
    return c.json(rows);
});

// ── Create (also creates today's page) ───────────────────────────────────────

app.post('/', zValidator('json', createSchema), async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');
    const body   = c.req.valid('json');

    const projectResult = await db.insert(projects).values({ ...body, userId }).returning();
    const project       = projectResult[0];
    if (!project) return c.json({ error: 'Failed to create project' }, 500);

    return c.json({ project }, 201);
});

// ── Single ────────────────────────────────────────────────────────────────────

app.get('/:id', async (c) => {
    const db  = getDb(c.env.DB);
    const row = await db
        .select()
        .from(projects)
        .where(eq(projects.id, c.req.param('id')))
        .get();
    if (!row || row.userId !== c.get('userId')) return c.notFound();
    return c.json(row);
});

// ── Update ────────────────────────────────────────────────────────────────────

app.patch('/:id', zValidator('json', patchSchema), async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');
    const body   = c.req.valid('json');

    const existing = await db.select().from(projects).where(eq(projects.id, c.req.param('id'))).get();
    if (!existing || existing.userId !== userId) return c.notFound();

    const [row] = await db
        .update(projects)
        .set({ ...body, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, c.req.param('id')))
        .returning();
    return c.json(row);
});

// ── Delete ────────────────────────────────────────────────────────────────────

app.delete('/:id', async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');

    const existing = await db.select().from(projects).where(eq(projects.id, c.req.param('id'))).get();
    if (!existing || existing.userId !== userId) return c.notFound();

    await db.delete(projects).where(eq(projects.id, c.req.param('id')));
    return c.body(null, 204);
});

export default app;
