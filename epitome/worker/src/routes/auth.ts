import { Hono }           from 'hono';
import { z }              from 'zod';
import { zValidator }     from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { eq }             from 'drizzle-orm';
import { getDb }          from '../db/client';
import { users, sessions } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const SESSION_TTL = 60 * 60 * 24 * 7;

// ── PBKDF2 helpers ────────────────────────────────────────────────────────────

const hex   = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string)     => new Uint8Array((s.match(/../g) ?? []).map(h => parseInt(h, 16)));

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key  = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
    return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts     = stored.split(':');
    const saltHex   = parts[0] ?? '';
    const storedHex = parts[1] ?? '';
    const salt      = unhex(saltHex);
    const key       = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits      = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
    const newBytes  = new Uint8Array(bits);
    const prevBytes = unhex(storedHex);
    if (newBytes.length !== prevBytes.length) return false;
    let diff = 0;
    for (let i = 0; i < newBytes.length; i++) diff |= (newBytes[i] ?? 0) ^ (prevBytes[i] ?? 0);
    return diff === 0;
}

function cookieOpts(isProd: boolean) {
    return { httpOnly: true, secure: isProd, sameSite: isProd ? ('Strict' as const) : ('Lax' as const), path: '/', maxAge: SESSION_TTL };
}

const credSchema = z.object({
    username: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_.-]+$/, 'Alphanumeric, . _ - only'),
    password: z.string().min(8).max(128),
});

// ── Sign up ───────────────────────────────────────────────────────────────────

app.post('/signup', zValidator('json', credSchema), async (c) => {
    const db   = getDb(c.env.DB);
    const body = c.req.valid('json');

    const existing = await db.select().from(users).where(eq(users.username, body.username)).get();
    if (existing) return c.json({ error: 'Username already taken' }, 409);

    const passwordHash  = await hashPassword(body.password);
    const userResult    = await db.insert(users).values({ username: body.username, passwordHash }).returning();
    const user          = userResult[0];
    if (!user) return c.json({ error: 'Failed to create user' }, 500);

    const expiresAt     = new Date(Date.now() + SESSION_TTL * 1000).toISOString();
    const sessionResult = await db.insert(sessions).values({ userId: user.userId, expiresAt }).returning();
    const session       = sessionResult[0];
    if (!session) return c.json({ error: 'Failed to create session' }, 500);

    setCookie(c, 'ep_session', session.sessionId, cookieOpts(c.env.ENVIRONMENT === 'production'));
    return c.json({ userId: user.userId, username: user.username }, 201);
});

// ── Log in ────────────────────────────────────────────────────────────────────

app.post('/login', zValidator('json', credSchema), async (c) => {
    const db   = getDb(c.env.DB);
    const body = c.req.valid('json');

    const user = await db.select().from(users).where(eq(users.username, body.username)).get();
    if (!user || !user.isActive) return c.json({ error: 'Invalid credentials' }, 401);

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) return c.json({ error: 'Invalid credentials' }, 401);

    const expiresAt     = new Date(Date.now() + SESSION_TTL * 1000).toISOString();
    const sessionResult = await db.insert(sessions).values({ userId: user.userId, expiresAt }).returning();
    const session       = sessionResult[0];
    if (!session) return c.json({ error: 'Failed to create session' }, 500);

    setCookie(c, 'ep_session', session.sessionId, cookieOpts(c.env.ENVIRONMENT === 'production'));
    return c.json({ userId: user.userId, username: user.username });
});

// ── Log out ───────────────────────────────────────────────────────────────────

app.post('/logout', authMiddleware, async (c) => {
    const db = getDb(c.env.DB);
    await db.delete(sessions).where(eq(sessions.userId, c.get('userId')));
    deleteCookie(c, 'ep_session', { path: '/' });
    return c.json({ ok: true });
});

// ── Current user ──────────────────────────────────────────────────────────────

app.get('/me', authMiddleware, async (c) => {
    const db   = getDb(c.env.DB);
    const user = await db.select({ userId: users.userId, username: users.username, createdAt: users.createdAt })
        .from(users).where(eq(users.userId, c.get('userId'))).get();
    if (!user) return c.json({ error: 'Not found' }, 404);
    return c.json(user);
});

export default app;
