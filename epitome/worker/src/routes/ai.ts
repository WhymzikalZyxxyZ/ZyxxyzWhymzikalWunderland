import { Hono }      from 'hono';
import { z }          from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Bindings } from '../types';

const app = new Hono<{ Bindings: Bindings }>();

const analyzeSchema = z.object({
    blurb:  z.string().min(10).max(2000),
    genre:  z.string().optional(),
    type:   z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert in book retail discoverability on Amazon, Barnes & Noble, and independent retailers. Analyze blurbs for genre signals, tropes, and search-term density. Return ONLY valid JSON — no markdown, no explanation.`;

function buildPrompt(blurb: string, genre?: string, type?: string): string {
    const context = [genre && `Genre: ${genre}`, type && `Type: ${type}`].filter(Boolean).join(', ');
    return `${context ? `Context: ${context}\n\n` : ''}Blurb:\n${blurb}\n\nReturn JSON:\n{"searchabilityScore":1-10,"missingKeywords":["..."],"strengths":["..."],"suggestedRevision":"...","topTropes":["..."]}`;
}

app.post('/blurb', zValidator('json', analyzeSchema), async (c) => {
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
