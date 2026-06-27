'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runScraper } from '../scraper.js';

// ── Dependency mocks ──────────────────────────────────────────────────────────

// Mock courtlistener.js and pipeline.js at the module level
vi.mock('../courtlistener.js', () => ({
    fetchRecentOpinions: vi.fn(),
    fetchOpinionText:    vi.fn(),
}));
vi.mock('../pipeline.js', () => ({
    generateReadingMaterials: vi.fn(),
}));

import { fetchRecentOpinions, fetchOpinionText }  from '../courtlistener.js';
import { generateReadingMaterials }                from '../pipeline.js';

const STUB = {
    docket: '24-1234', term: '24', title: 'Test v. State',
    decided_date: '2025-04-15', cl_opinion_id: 9999,
};

const VALID_RM = {
    sections:             [{ heading: 'H', body: 'B', key_terms: [], pull_quote: 'Q' }],
    glossary:             [],
    discussion_questions: [],
    further_reading:      [],
};

function makeDB(changes = 1) {
    const stmt = {
        bind:  vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
        all:   vi.fn().mockResolvedValue({ results: [] }),
        run:   vi.fn().mockResolvedValue({ meta: { changes } }),
    };
    return { prepare: vi.fn().mockReturnValue(stmt), _stmt: stmt };
}

function makeCache() {
    return { get: vi.fn().mockResolvedValue(null), put: vi.fn().mockResolvedValue(undefined) };
}

function makeEnv(dbChanges = 1) {
    return {
        ELINAL_DB:      makeDB(dbChanges),
        ELINAL_CACHE:   makeCache(),
        ELINAL_MODEL:   '@cf/meta/llama-3.3-70b-instruct',
        PROMPT_VERSION: 'v1',
        AI:             { run: vi.fn() },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ── runScraper ────────────────────────────────────────────────────────────────

describe('runScraper', () => {
    it('returns zero counts when no new opinions exist', async () => {
        fetchRecentOpinions.mockResolvedValue([]);
        const env    = makeEnv(0);
        const result = await runScraper(env);
        expect(result).toMatchObject({ fetched: 0, inserted: 0, processed: 0, errors: 0 });
    });

    it('inserts new opinions and increments inserted count', async () => {
        fetchRecentOpinions.mockResolvedValue([STUB]);
        // listPending returns nothing → processed = 0
        const env = makeEnv(1);
        const result = await runScraper(env);
        expect(result.fetched).toBe(1);
        expect(result.inserted).toBe(1);
    });

    it('processes pending opinions and updates status to ready', async () => {
        fetchRecentOpinions.mockResolvedValue([]);
        // Make listPending return one pending opinion
        const env = makeEnv(0);
        env.ELINAL_DB._stmt.all.mockResolvedValueOnce({ results: [STUB] });
        fetchOpinionText.mockResolvedValue('Opinion text. '.repeat(50));
        generateReadingMaterials.mockResolvedValue(VALID_RM);

        const result = await runScraper(env);
        expect(result.processed).toBe(1);
        expect(result.errors).toBe(0);
        // setOpinionStatus('ready') is called via db.prepare
        expect(env.ELINAL_DB.prepare).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE opinions SET status'),
        );
    });

    it('increments error count when text fetch fails', async () => {
        fetchRecentOpinions.mockResolvedValue([]);
        const env = makeEnv(0);
        env.ELINAL_DB._stmt.all.mockResolvedValueOnce({ results: [STUB] });
        fetchOpinionText.mockRejectedValue(new Error('network error'));

        const result = await runScraper(env);
        expect(result.errors).toBe(1);
        expect(result.processed).toBe(0);
    });

    it('increments error count when AI generation fails', async () => {
        fetchRecentOpinions.mockResolvedValue([]);
        const env = makeEnv(0);
        env.ELINAL_DB._stmt.all.mockResolvedValueOnce({ results: [STUB] });
        fetchOpinionText.mockResolvedValue('Opinion text. '.repeat(50));
        generateReadingMaterials.mockRejectedValue(new Error('AI error'));

        const result = await runScraper(env);
        expect(result.errors).toBe(1);
    });

    it('handles CourtListener discovery failure gracefully', async () => {
        fetchRecentOpinions.mockRejectedValue(new Error('timeout'));
        const result = await runScraper(makeEnv());
        expect(result).toMatchObject({ fetched: 0, inserted: 0, processed: 0, errors: 0 });
    });

    it('caches reading materials in KV after processing', async () => {
        fetchRecentOpinions.mockResolvedValue([]);
        const env = makeEnv(0);
        env.ELINAL_DB._stmt.all.mockResolvedValueOnce({ results: [STUB] });
        fetchOpinionText.mockResolvedValue('Opinion text. '.repeat(50));
        generateReadingMaterials.mockResolvedValue(VALID_RM);

        await runScraper(env);
        expect(env.ELINAL_CACHE.put).toHaveBeenCalledWith(
            `rm:${STUB.docket}`,
            expect.stringContaining(STUB.docket),
        );
    });
});
