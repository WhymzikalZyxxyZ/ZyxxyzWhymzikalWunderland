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
never jargon for its own sake, always earning every technical term they use. \
Each section's body must run 2–4 full paragraphs (separated by \\n\\n), each at least 3 sentences. \
Pull quotes must be a single memorable sentence drawn directly from the reasoning — \
specific enough to be surprising, short enough to scan at a glance.

Respond with a single valid JSON object matching this schema exactly:
{
  "sections": [
    {
      "heading": "string",
      "body": "string — 2 to 4 rich paragraphs separated by \\n\\n",
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
5. "The Dissent" — include only if a dissent appears in the opinion text; \
   if no dissent, omit this section entirely
6. "Why It Matters" — downstream effects: precedent, real-world stakes, open questions

Produce 5–8 glossary terms. Produce 4–6 discussion questions. \
Produce 3–5 further reading items (canonical books, law review articles, or landmark cases — \
titles and descriptions only, no URLs).
Output nothing outside the JSON object.`;

const MAX_OPINION_CHARS = 25_000;

// Calls Workers AI and returns validated reading materials object
export async function generateReadingMaterials(env, { title, docket, text }) {
    const truncated = text.length > MAX_OPINION_CHARS
        ? text.slice(0, MAX_OPINION_CHARS) + '\n\n[Opinion truncated for context window]'
        : text;

    const aiResponse = await env.AI.run(env.ELINAL_MODEL, {
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: `Case: ${title} (Docket ${docket})\n\n---\n\n${truncated}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
    });

    const raw = extractText(aiResponse);
    const parsed = parseJson(raw);
    validateReadingMaterials(parsed);
    return parsed;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractText(response) {
    if (typeof response === 'string') return response;
    if (typeof response?.response === 'string') return response.response;
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
        if (typeof s.body !== 'string' || s.body.length < 100)
            throw new Error(`Section "${s.heading}" body too short`);
    }
    if (!Array.isArray(rm?.glossary))
        throw new Error('AI response missing glossary array');
    if (!Array.isArray(rm?.discussion_questions))
        throw new Error('AI response missing discussion_questions array');
    if (!Array.isArray(rm?.further_reading))
        throw new Error('AI response missing further_reading array');
}
