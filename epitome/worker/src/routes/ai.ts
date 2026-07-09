import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', authMiddleware);

const analyzeSchema = z.object({
    blurb:  z.string().min(10).max(2000),
    genre:  z.string().max(100).optional(),
    type:   z.string().max(100).optional(),
});

const SYSTEM_PROMPT = `You are an expert in book retail discoverability on Amazon, Barnes & Noble, and independent retailers. Analyze blurbs for genre signals, tropes, and search-term density. Return ONLY valid JSON — no markdown, no explanation.`;

const AI_RATE_LIMIT     = 20;
const AI_RATE_LIMIT_TTL = 86_400; // 24 hours in seconds

function buildPrompt(blurb: string, genre?: string, type?: string): string {
    const context = [genre && `Genre: ${genre}`, type && `Type: ${type}`].filter(Boolean).join(', ');
    return `${context ? `Context: ${context}\n\n` : ''}Blurb:\n${blurb}\n\nReturn JSON:\n{"searchabilityScore":1-10,"missingKeywords":["..."],"strengths":["..."],"suggestedRevision":"...","topTropes":["..."]}`;
}

app.post('/blurb', zValidator('json', analyzeSchema), async (c) => {
    const userId        = c.get('userId');
    const today         = new Date().toISOString().slice(0, 10);
    const rateLimitKey  = `rate:ai:${userId}:${today}`;
    const currentStr    = await c.env.STORAGE.get(rateLimitKey);
    const current       = parseInt(currentStr ?? '0', 10);
    if (current >= AI_RATE_LIMIT) {
        return c.json({ error: 'Daily analysis limit reached — return tomorrow.' }, 429);
    }
    await c.env.STORAGE.put(rateLimitKey, String(current + 1), { expirationTtl: AI_RATE_LIMIT_TTL });

    const { blurb, genre, type } = c.req.valid('json');

    const result = await c.env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as Parameters<Ai['run']>[0],
        {
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user',   content: buildPrompt(blurb, genre, type) },
            ],
        } as Parameters<Ai['run']>[1],
    ) as { response?: string };

    const raw = result.response ?? '';

    let parsed: unknown;
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
    } catch {
        parsed = { raw };
    }

    return c.json(parsed);
});

export default app;
