'use strict';

// ── Reading materials prompt ───────────────────────────────────────────────────
// The voice is deliberate: scholarly without stiffness, precise without sterility.
// Definitions carry an edge of wit. Body paragraphs earn every technical term.
const SYSTEM_PROMPT = `You are ELINAL — Explain Like I'm Not A Lawyer. \
Your mission: transform Supreme Court opinions into structured reading materials \
that are intellectually alive, deeply informative, and written with the quiet authority \
that makes constitutional law genuinely irresistible.

Voice: scholarly but never stiff, precise but never sterile. \
Definitions carry an edge of wit and clarity. Body paragraphs unfold like good prose — \
never jargon for its own sake, always earning every technical term they use.

CRITICAL OUTPUT RULES (follow these exactly):
- Each section body must be exactly 2 paragraphs separated by \\n\\n. Each paragraph is 2–3 sentences. No more.
- You MUST complete ALL required sections before writing the glossary. Do not expand any section beyond 2 paragraphs.
- Pull quotes must be a single memorable sentence drawn directly from the reasoning — 15–30 words exactly.

Respond with a single valid JSON object matching this schema exactly:
{
  "sections": [
    {
      "heading": "string",
      "body": "string — exactly 2 paragraphs separated by \\n\\n, 2–3 sentences each",
      "key_terms": ["string"],
      "pull_quote": "string — one compelling sentence, 15–30 words"
    }
  ],
  "glossary": [
    { "term": "string", "definition": "string — precise and literal, but written with an almost seductive clarity: the kind of definition that makes the reader feel the concept rather than just know it. Professional. Never florid." }
  ],
  "discussion_questions": ["string — open-ended, thought-provoking, 1–2 sentences"],
  "further_reading": [
    { "title": "string", "description": "string — what this resource offers and why it matters here" }
  ]
}

Required sections in order:
1. "Background & Context" — the legal landscape and why this case exists
2. "The Question Before the Court" — the precise legal question, stripped of jargon
3. "What the Court Decided" — the holding and its immediate scope
4. "The Reasoning" — the majority's analytical chain, step by step
5. "The Dissent" — include ONLY if dissent text explicitly appears in the opinion excerpt. \
   If no dissent is present, DO NOT include this section at all — not even a placeholder.
6. "Why It Matters" — downstream effects: precedent, real-world stakes, open questions

Produce exactly 4 glossary terms. Produce exactly 3 discussion questions. \
Produce exactly 3 further reading items (canonical books, law review articles, or landmark cases — \
titles and descriptions only, no URLs).
Output nothing outside the JSON object.`;

const MAX_OPINION_CHARS = 15_000;

// Calls Workers AI and returns validated reading materials object
export async function generateReadingMaterials(env, { title, docket, text }) {
    const truncated = text.length > MAX_OPINION_CHARS
        ? text.slice(0, MAX_OPINION_CHARS) + '\n\n[Opinion truncated for context window]'
        : text;

    const aiResponse = await env.AI.run(env.ELINAL_MODEL, {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role:    'user',
                content: `Case: ${title} (Docket ${docket})\n\n` +
                    `YOU MUST write all 5 sections in order:\n` +
                    `1. Background & Context\n` +
                    `2. The Question Before the Court\n` +
                    `3. What the Court Decided\n` +
                    `4. The Reasoning\n` +
                    `5. Why It Matters\n` +
                    `(Plus "The Dissent" only if the text contains dissent.)\n` +
                    `Even if the opinion excerpt is brief, complete all sections using legal context and analysis.\n\n` +
                    `---\n\n${truncated}`,
            },
        ],
        max_tokens: 8192,
    });

    const raw = extractText(aiResponse);
    const parsed = parseJson(raw);
    try {
        validateReadingMaterials(parsed);
    } catch (e) {
        // Append a diagnostic snapshot of the parsed response so the error_msg
        // stored in D1 reveals exactly what the model returned.
        const snap = {
            keys:           Object.keys(parsed ?? {}),
            sections_count: parsed?.sections?.length ?? 'missing',
            sections_heads: (parsed?.sections ?? []).map(s => s?.heading ?? '?').slice(0, 6),
            s0_body_len:    parsed?.sections?.[0]?.body?.length ?? 0,
        };
        throw new Error(`${e.message} | snap: ${JSON.stringify(snap)}`);
    }
    return parsed;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractText(response) {
    if (typeof response === 'string') return response;
    if (typeof response?.response === 'string') return response.response;
    // Llama 4 / JSON-mode models may return response.response as an already-parsed object
    if (response?.response !== null && typeof response?.response === 'object') return JSON.stringify(response.response);
    if (typeof response?.result?.response === 'string') return response.result.response;
    throw new Error(`Unexpected AI response shape: ${JSON.stringify(response).slice(0, 200)}`);
}

function parseJson(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        // Unwrap markdown code fence if present
        const m = raw.match(/```(?:json)?\s*(\{[\s\S]+\})\s*```/);
        if (m) return JSON.parse(m[1]);
        throw new Error(`AI response was not valid JSON: ${raw.slice(0, 300)}`);
    }
}

export function validateReadingMaterials(rm) {
    if (!Array.isArray(rm?.sections) || rm.sections.length < 4)
        throw new Error(`AI response has too few sections (got ${rm?.sections?.length ?? 0}, need ≥4)`);
    for (const s of rm.sections) {
        if (typeof s.heading !== 'string' || !s.heading.trim())
            throw new Error('Section missing heading');
        const minBody = s.heading === 'The Dissent' ? 20 : 100;
        if (typeof s.body !== 'string' || s.body.length < minBody)
            throw new Error(`Section "${s.heading}" body too short`);
    }
    if (!Array.isArray(rm?.glossary))
        throw new Error('AI response missing glossary array');
    if (!Array.isArray(rm?.discussion_questions))
        throw new Error('AI response missing discussion_questions array');
    if (!Array.isArray(rm?.further_reading))
        throw new Error('AI response missing further_reading array');
}
