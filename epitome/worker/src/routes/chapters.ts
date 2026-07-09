import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { and, eq, asc, desc, sql } from 'drizzle-orm';
import { getDb }      from '../db/client';
import { chapters, projects } from '../db/schema';
import { authMiddleware }     from '../middleware/auth';
import type { Bindings, Variables } from '../types';

// ── Per-project router (mounted at /api/projects/:projectId/chapters) ─────────

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

// ── Global router (mounted at /api/chapters) — dashboard drafting feed ────────

export const chaptersGlobalRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();
chaptersGlobalRouter.use('*', authMiddleware);

chaptersGlobalRouter.get('/', async (c) => {
    const db = getDb(c.env.DB);
    const rows = await db
        .select({
            id:            chapters.id,
            projectId:     chapters.projectId,
            chapterNumber: chapters.chapterNumber,
            title:         chapters.title,
            wordCount:     chapters.wordCount,
            updatedAt:     chapters.updatedAt,
            createdAt:     chapters.createdAt,
        })
        .from(chapters)
        .where(eq(chapters.userId, c.get('userId')))
        .orderBy(desc(chapters.updatedAt))
        .limit(200)
        .all();
    return c.json(rows);
});

// ── Shared helpers ────────────────────────────────────────────────────────────

function countWords(html: string): number {
    const text = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&[a-z#0-9]+;/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    return text.length > 0 ? text.split(' ').length : 0;
}

async function syncProjectWords(db: ReturnType<typeof getDb>, projectId: string, userId: string) {
    const res = await db
        .select({ total: sql<number>`coalesce(sum(${chapters.wordCount}), 0)` })
        .from(chapters)
        .where(and(eq(chapters.projectId, projectId), eq(chapters.userId, userId)))
        .get();
    await db.update(projects)
        .set({ totalWords: res?.total ?? 0, updatedAt: new Date().toISOString() })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

async function verifyOwnership(db: ReturnType<typeof getDb>, projectId: string, userId: string) {
    return db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
}

const patchSchema = z.object({
    title:           z.string().nullable().optional(),
    content:         z.string().optional(),
    targetWordCount: z.number().int().nonnegative().optional(),
});

// ── List chapters for a project ───────────────────────────────────────────────

app.get('/', async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;
    const project   = await verifyOwnership(db, projectId, userId);
    if (!project) return c.notFound();
    const rows = await db.select().from(chapters)
        .where(and(eq(chapters.projectId, projectId), eq(chapters.userId, userId)))
        .orderBy(asc(chapters.chapterNumber))
        .all();
    return c.json(rows);
});

// ── Create chapter (auto-assigns next number) ─────────────────────────────────

app.post('/', async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;
    const project   = await verifyOwnership(db, projectId, userId);
    if (!project) return c.notFound();

    const body = await c.req.json().catch(() => ({})) as { title?: string };

    const maxRes = await db
        .select({ maxNum: sql<number>`coalesce(max(${chapters.chapterNumber}), 0)` })
        .from(chapters).where(eq(chapters.projectId, projectId)).get();
    const chapterNumber = (maxRes?.maxNum ?? 0) + 1;

    const [row] = await db.insert(chapters)
        .values({ projectId, userId, chapterNumber, title: body.title ?? null })
        .returning();
    if (!row) return c.json({ error: 'Failed to create chapter' }, 500);
    return c.json(row, 201);
});

// ── Get specific chapter ──────────────────────────────────────────────────────

app.get('/:chapterId', async (c) => {
    const db     = getDb(c.env.DB);
    const userId = c.get('userId');
    const row    = await db.select().from(chapters)
        .where(and(eq(chapters.id, c.req.param('chapterId')!), eq(chapters.userId, userId))).get();
    if (!row) return c.notFound();
    return c.json(row);
});

// ── Save chapter content / title ──────────────────────────────────────────────

app.patch('/:chapterId', zValidator('json', patchSchema), async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;
    const body      = c.req.valid('json');

    const existing = await db.select().from(chapters)
        .where(and(eq(chapters.id, c.req.param('chapterId')!), eq(chapters.userId, userId))).get();
    if (!existing) return c.notFound();

    const updates: Record<string, unknown> = { ...body, updatedAt: new Date().toISOString() };
    if (body.content !== undefined) updates['wordCount'] = countWords(body.content);

    const [row] = await db.update(chapters)
        .set(updates)
        .where(eq(chapters.id, c.req.param('chapterId')!))
        .returning();
    if (!row) return c.json({ error: 'Failed to save chapter' }, 500);

    await syncProjectWords(db, projectId, userId);
    return c.json(row);
});

// ── Delete chapter ────────────────────────────────────────────────────────────

app.delete('/:chapterId', async (c) => {
    const db        = getDb(c.env.DB);
    const userId    = c.get('userId');
    const projectId = c.req.param('projectId')!;

    const existing = await db.select().from(chapters)
        .where(and(eq(chapters.id, c.req.param('chapterId')!), eq(chapters.userId, userId))).get();
    if (!existing) return c.notFound();

    await db.delete(chapters).where(eq(chapters.id, c.req.param('chapterId')!));
    await syncProjectWords(db, projectId, userId);
    return c.body(null, 204);
});

export default app;
