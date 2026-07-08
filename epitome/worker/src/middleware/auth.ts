import { createMiddleware } from 'hono/factory';
import { getCookie }        from 'hono/cookie';
import { eq }               from 'drizzle-orm';
import { getDb }            from '../db/client';
import { sessions }         from '../db/schema';
import type { Bindings, Variables } from '../types';

export const authMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(
    async (c, next) => {
        const sessionId = getCookie(c, 'ep_session');
        if (!sessionId) return c.json({ error: 'Unauthorized' }, 401);

        const db      = getDb(c.env.DB);
        const session = await db
            .select()
            .from(sessions)
            .where(eq(sessions.sessionId, sessionId))
            .get();

        if (!session || session.expiresAt < new Date().toISOString()) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        c.set('userId', session.userId);
        await next();
    },
);
