'use strict';

import { describe, it, expect, vi } from 'vitest';
import { generateReadingMaterials, validateReadingMaterials } from '../pipeline.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECTION = (heading) => ({
    heading,
    body: 'This is a sufficiently long body paragraph for testing purposes. '.repeat(3),
    key_terms:  [],
    pull_quote: 'A compelling sentence.',
});

const VALID_RM = {
    sections: [
        SECTION('Background & Context'),
        SECTION('The Question Before the Court'),
        SECTION('What the Court Decided'),
        SECTION('The Reasoning'),
    ],
    glossary:             [{ term: 'Habeas corpus', definition: 'Latin: "you shall have the body."' }],
    discussion_questions: ['What was at stake?'],
    further_reading:      [{ title: 'The Constitution', description: 'A foundational document.' }],
};

function makeEnv({ aiResponse = VALID_RM } = {}) {
    return {
        AI: { run: vi.fn().mockResolvedValue({ response: JSON.stringify(aiResponse) }) },
        ELINAL_MODEL:   '@cf/meta/llama-3.3-70b-instruct',
        PROMPT_VERSION: 'v1',
    };
}

// ── generateReadingMaterials ──────────────────────────────────────────────────

describe('generateReadingMaterials', () => {
    it('returns parsed reading materials for valid AI JSON response', async () => {
        const env = makeEnv();
        const rm  = await generateReadingMaterials(env, {
            title: 'Test v. State', docket: '24-1', text: 'Opinion text '.repeat(30),
        });
        expect(rm).toMatchObject({
            sections:             expect.arrayContaining([expect.objectContaining({ heading: 'Background & Context' })]),
            glossary:             expect.any(Array),
            discussion_questions: expect.any(Array),
            further_reading:      expect.any(Array),
        });
        expect(env.AI.run).toHaveBeenCalledWith(
            '@cf/meta/llama-3.3-70b-instruct',
            expect.objectContaining({ response_format: { type: 'json_object' } }),
        );
    });

    it('unwraps JSON from markdown code fences', async () => {
        const env = makeEnv();
        env.AI.run = vi.fn().mockResolvedValue({
            response: '```json\n' + JSON.stringify(VALID_RM) + '\n```',
        });
        const rm = await generateReadingMaterials(env, { title: 'T', docket: '1', text: 'x'.repeat(300) });
        expect(rm.sections).toBeDefined();
    });

    it('handles string AI responses', async () => {
        const env = makeEnv();
        env.AI.run = vi.fn().mockResolvedValue(JSON.stringify(VALID_RM));
        const rm = await generateReadingMaterials(env, { title: 'T', docket: '1', text: 'x'.repeat(300) });
        expect(rm.sections).toBeDefined();
    });

    it('truncates long opinions before sending to AI', async () => {
        const env = makeEnv();
        const longText = 'x'.repeat(50_000);
        await generateReadingMaterials(env, { title: 'T', docket: '1', text: longText });
        const call = env.AI.run.mock.calls[0][1];
        const userMsg = call.messages.find(m => m.role === 'user').content;
        expect(userMsg).toContain('[Opinion truncated');
        expect(userMsg.length).toBeLessThan(50_000);
    });

    it('throws when AI response is not valid JSON', async () => {
        const env = makeEnv();
        env.AI.run = vi.fn().mockResolvedValue({ response: 'not json' });
        await expect(
            generateReadingMaterials(env, { title: 'T', docket: '1', text: 'x'.repeat(300) }),
        ).rejects.toThrow('not valid JSON');
    });

    it('throws when AI response fails validation', async () => {
        const env = makeEnv();
        env.AI.run = vi.fn().mockResolvedValue({ response: '{"sections": []}' });
        await expect(
            generateReadingMaterials(env, { title: 'T', docket: '1', text: 'x'.repeat(300) }),
        ).rejects.toThrow('sections');
    });
});

// ── validateReadingMaterials ──────────────────────────────────────────────────

describe('validateReadingMaterials', () => {
    it('passes for valid reading materials', () => {
        expect(() => validateReadingMaterials(VALID_RM)).not.toThrow();
    });

    it('throws when sections is empty', () => {
        expect(() => validateReadingMaterials({ ...VALID_RM, sections: [] })).toThrow();
    });

    it('throws when sections has fewer than 4 entries', () => {
        expect(() => validateReadingMaterials({ ...VALID_RM, sections: [SECTION('Only')] })).toThrow('too few sections');
    });

    it('throws when glossary is missing', () => {
        const { glossary: _, ...rm } = VALID_RM;
        expect(() => validateReadingMaterials(rm)).toThrow('glossary');
    });

    it('throws when discussion_questions is missing', () => {
        const { discussion_questions: _, ...rm } = VALID_RM;
        expect(() => validateReadingMaterials(rm)).toThrow('discussion_questions');
    });

    it('throws when further_reading is missing', () => {
        const { further_reading: _, ...rm } = VALID_RM;
        expect(() => validateReadingMaterials(rm)).toThrow('further_reading');
    });

    it('throws for null input', () => {
        expect(() => validateReadingMaterials(null)).toThrow();
    });
});
