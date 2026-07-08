import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, asc }    from 'drizzle-orm';
import { getDb }      from '../db/client';
import { characters, characterImages } from '../db/schema';
import { authMiddleware }              from '../middleware/auth';
import type { Bindings, Variables }    from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const createSchema = z.object({
    name:                z.string().min(1).max(200),
    age:                 z.string().optional(),
    physicalDescription: z.string().optional(),
    notes:               z.string().optional(),
    sortOrder:           z.number().int().default(0),
});

const patchSchema = createSchema.partial();

app.get('/', async (c) => {
    const db = getDb(c.env.DB);
    const rows = await db
        .select().from(characters)
        .where(eq(characters.projectId, c.req.param('projectId')!))
        .orderBy(asc(characters.sortOrder)).all();
    return c.json(rows);
});

app.post('/', zValidator('json', createSchema), async (c) => {
    const db        = getDb(c.env.DB);
    const projectId = c.req.param('projectId')!;
    const userId    = c.get('userId');
    const [row]     = await db.insert(characters).values({ ...c.req.valid('json'), projectId, userId }).returning();
    return c.json(row, 201);
});

app.get('/:characterId', async (c) => {
    const db  = getDb(c.env.DB);
    const row = await db.select().from(characters).where(eq(characters.id, c.req.param('characterId')!)).get();
    if (!row) return c.notFound();
    const images = await db.select().from(characterImages)
        .where(eq(characterImages.characterId, row.id))
        .orderBy(asc(characterImages.sortOrder)).all();
    return c.json({ ...row, images });
});

app.patch('/:characterId', zValidator('json', patchSchema), async (c) => {
    const db    = getDb(c.env.DB);
    const [row] = await db.update(characters)
        .set({ ...c.req.valid('json'), updatedAt: new Date().toISOString() })
        .where(eq(characters.id, c.req.param('characterId')!))
        .returning();
    if (!row) return c.notFound();
    return c.json(row);
});

app.delete('/:characterId', async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(characters).where(eq(characters.id, c.req.param('characterId')!));
    return c.body(null, 204);
});

export default app;
