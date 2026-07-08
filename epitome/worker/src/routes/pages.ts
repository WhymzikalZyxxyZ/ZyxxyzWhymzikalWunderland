import { Hono }       from 'hono';
import { z }           from 'zod';
import { zValidator }  from '@hono/zod-validator';
import { eq, asc, sql } from 'drizzle-orm';
import { getDb }       from '../db/client';
import { pages, projects } from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

function wordCount(html: string): number {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 0 ? text.split(' ').length : 0;
}

async function syncProjectWords(db: ReturnType<typeof getDb>, projectId: string) {
    const res = await db
        .select({ total: sql<number>`sum(${pages.wordCount})` })
        .from(pages)
        .where(eq(pages.projectId, projectId))
        .get();
    await db
        .update(projects)
        .set({ totalWords: res?.total ?? 0, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, projectId));
}

const patchSchema = z.object({
    title:   z.string().optional(),
    content: z.string().optional(),
});

// ── List pages for a project ──────────────────────────────────────────────────

app.get('/', async (c) => {
    const db   = getDb(c.env.DB);
    const rows = await db
        .select()
        .from(pages)
        .where(eq(pages.projectId, c.req.param('projectId')!))
        .orderBy(asc(pages.pageDate))
        .all();
    return c.json(rows);
});

// ── Get or create today's page ────────────────────────────────────────────────

app.post('/today', async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;

    const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project || project.userId !== userId) return c.notFound();

    const today    = new Date().toISOString().slice(0, 10);
    const existing = await db
        .select()
        .from(pages)
        .where(eq(pages.projectId, projectId))
        .all();

    const todayPage = existing.find(p => p.pageDate === today);
    if (todayPage) return c.json(todayPage);

    const [page] = await db
        .insert(pages)
        .values({ projectId, userId, pageDate: today })
        .returning();
    return c.json(page, 201);
});

// ── Get specific page ─────────────────────────────────────────────────────────

app.get('/:pageId', async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');
    const page   = await db.select().from(pages).where(eq(pages.id, c.req.param('pageId')!)).get();
    if (!page || page.userId !== userId) return c.notFound();
    return c.json(page);
});

// ── Save page ─────────────────────────────────────────────────────────────────

app.patch('/:pageId', zValidator('json', patchSchema), async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;
    const body      = c.req.valid('json');

    const existing = await db.select().from(pages).where(eq(pages.id, c.req.param('pageId')!)).get();
    if (!existing || existing.userId !== userId) return c.notFound();

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
    if (body.content !== undefined) updates['wordCount'] = wordCount(body.content);

    const [page] = await db
        .update(pages)
        .set(updates)
        .where(eq(pages.id, c.req.param('pageId')!))
        .returning();

    await syncProjectWords(db, projectId);
    return c.json(page);
});

// ── Delete page ───────────────────────────────────────────────────────────────

app.delete('/:pageId', async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;

    const existing = await db.select().from(pages).where(eq(pages.id, c.req.param('pageId')!)).get();
    if (!existing || existing.userId !== userId) return c.notFound();

    await db.delete(pages).where(eq(pages.id, c.req.param('pageId')!));
    await syncProjectWords(db, projectId);
    return c.body(null, 204);
});

export default app;
