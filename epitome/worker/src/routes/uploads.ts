import { Hono }    from 'hono';
import { and, eq }  from 'drizzle-orm';
import { getDb }    from '../db/client';
import { projects, characters, characterImages, projectArt } from '../db/schema';
import { authMiddleware }  from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type FileMeta = { contentType: string };

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_DOC_TYPES   = new Set(['application/pdf']);
const MAX_IMAGE_BYTES      = 10 * 1024 * 1024;  // 10 MB
const MAX_DOC_BYTES        = 25 * 1024 * 1024;  // 25 MB

async function storeFile(
    kv: KVNamespace,
    prefix: string,
    file: File,
    allowedTypes: Set<string>,
    maxBytes: number,
): Promise<string> {
    if (!allowedTypes.has(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
    }
    if (file.size > maxBytes) {
        throw new Error(`File exceeds ${maxBytes / 1024 / 1024} MB limit`);
    }
    const key      = `${prefix}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const buffer   = await file.arrayBuffer();
    const metadata: FileMeta = { contentType: file.type };
    await kv.put(key, buffer, { metadata });
    return key;
}

// ── Serve stored files (public, no auth) ─────────────────────────────────────

app.get('/files/*', async (c) => {
    const key = c.req.path.replace('/api/files/', '');
    const { value, metadata } = await c.env.STORAGE.getWithMetadata<FileMeta>(key, { type: 'arrayBuffer' });
    if (!value) return c.notFound();
    return new Response(value, {
        headers: {
            'Content-Type':  metadata?.contentType ?? 'application/octet-stream',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
});

// All upload mutations require auth
app.use('/projects/*',   authMiddleware);
app.use('/characters/*', authMiddleware);

// ── Project cover ─────────────────────────────────────────────────────────────

app.post('/projects/:projectId/cover', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');

    const project = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();

    const formData = await c.req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    try {
        const key   = await storeFile(c.env.STORAGE, 'covers', file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
        const [row] = await db.update(projects)
            .set({ coverKey: key, updatedAt: new Date().toISOString() })
            .where(eq(projects.id, projectId))
            .returning();
        if (!row) return c.notFound();
        return c.json({ key });
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

// ── Alt covers ────────────────────────────────────────────────────────────────

app.post('/projects/:projectId/alt-covers', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');

    const project = await db.select().from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();

    const formData = await c.req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    try {
        const key      = await storeFile(c.env.STORAGE, 'covers/alt', file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
        const existing = JSON.parse(project.altCoverKeys) as string[];
        await db.update(projects)
            .set({ altCoverKeys: JSON.stringify([...existing, key]), updatedAt: new Date().toISOString() })
            .where(eq(projects.id, projectId));
        return c.json({ key });
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

// ── Project art / mood board ──────────────────────────────────────────────────

app.post('/projects/:projectId/art', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');

    const project = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();

    const formData = await c.req.formData();
    const file     = formData.get('file') as File | null;
    const label    = formData.get('label') as string | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    try {
        const key      = await storeFile(c.env.STORAGE, 'art', file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
        const existing = await db.select().from(projectArt).where(eq(projectArt.projectId, projectId)).all();
        const [row]    = await db.insert(projectArt)
            .values({ projectId, userId, storageKey: key, label: label ?? undefined, sortOrder: existing.length })
            .returning();
        return c.json(row, 201);
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

app.get('/projects/:projectId/art', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');
    const project   = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();
    return c.json(await db.select().from(projectArt).where(eq(projectArt.projectId, projectId)).all());
});

app.delete('/projects/:projectId/art/:artId', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');
    const project   = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();

    const row = await db.select().from(projectArt)
        .where(and(eq(projectArt.id, c.req.param('artId')!), eq(projectArt.projectId, projectId))).get();
    if (row) {
        await c.env.STORAGE.delete(row.storageKey);
        await db.delete(projectArt).where(eq(projectArt.id, row.id));
    }
    return c.body(null, 204);
});

// ── Character images ──────────────────────────────────────────────────────────

app.post('/characters/:characterId/images', async (c) => {
    const db          = getDb(c.env.DB);
    const characterId = c.req.param('characterId')!;
    const userId      = c.get('userId');

    const character = await db.select({ id: characters.id }).from(characters)
        .where(and(eq(characters.id, characterId), eq(characters.userId, userId))).get();
    if (!character) return c.notFound();

    const formData = await c.req.formData();
    const file     = formData.get('file') as File | null;
    const caption  = formData.get('caption') as string | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    try {
        const key      = await storeFile(c.env.STORAGE, 'characters', file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES);
        const existing = await db.select().from(characterImages).where(eq(characterImages.characterId, characterId)).all();
        const [row]    = await db.insert(characterImages)
            .values({ characterId, storageKey: key, caption: caption ?? undefined, sortOrder: existing.length })
            .returning();
        return c.json(row, 201);
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

// ── Publishing contract ───────────────────────────────────────────────────────

app.post('/projects/:projectId/contract', async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');

    const project = await db.select({ id: projects.id }).from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId))).get();
    if (!project) return c.notFound();

    const formData = await c.req.formData();
    const file     = formData.get('file') as File | null;
    if (!file) return c.json({ error: 'No file provided' }, 400);

    try {
        const { publishing } = await import('../db/schema');
        const key   = await storeFile(c.env.STORAGE, 'contracts', file, ALLOWED_DOC_TYPES, MAX_DOC_BYTES);
        const [row] = await db.update(publishing)
            .set({ contractStorageKey: key, updatedAt: new Date().toISOString() })
            .where(eq(publishing.projectId, projectId))
            .returning();
        if (!row) return c.json({ error: 'No publishing record found — create one first' }, 404);
        return c.json({ key });
    } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
    }
});

export default app;
