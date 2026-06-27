'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    listOpinions, countOpinions, getOpinion, getReadingMaterials,
    listPending, upsertOpinion, setOpinionStatus, saveReadingMaterials,
} from '../db.js';

// ── Mock D1 builder ───────────────────────────────────────────────────────────

function makeDB({ firstResult = null, allResults = [], changes = 1 } = {}) {
    const stmt = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(firstResult),
        all:   vi.fn().mockResolvedValue({ results: allResults }),
        run:   vi.fn().mockResolvedValue({ meta: { changes } }),
    };
    return { prepare: vi.fn().mockReturnValue(stmt), _stmt: stmt };
}

const OPINION = {
    docket: '24-1234', term: '24', title: 'Test v. State',
    decided_date: '2025-06-15', cl_opinion_id: 9999, cl_cluster_id: 8888,
};

const RM_ROW = {
    docket: '24-1234',
    prompt_version: 'v1', model: '@cf/meta/llama-3.3-70b-instruct',
    generated_at: '2025-06-15T12:00:00Z',
    sections: '[]', glossary: '[]', discussion: '[]', further_reading: '[]',
};

// ── listOpinions ──────────────────────────────────────────────────────────────

describe('listOpinions', () => {
    it('fetches without term filter', async () => {
        const db = makeDB({ allResults: [OPINION] });
        const result = await listOpinions(db);
        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('status = \'ready\''));
        expect(result).toHaveLength(1);
    });

    it('binds term parameter when provided', async () => {
        const db = makeDB({ allResults: [] });
        await listOpinions(db, { term: '24' });
        expect(db._stmt.bind).toHaveBeenCalled();
    });

    it('respects limit and offset', async () => {
        const db = makeDB({ allResults: [] });
        await listOpinions(db, { limit: 5, offset: 10 });
        expect(db._stmt.bind).toHaveBeenCalledWith(5, 10);
    });
});

// ── countOpinions ─────────────────────────────────────────────────────────────

describe('countOpinions', () => {
    it('returns the total count', async () => {
        const db = makeDB({ firstResult: { total: 42 } });
        const total = await countOpinions(db);
        expect(total).toBe(42);
    });

    it('returns 0 when row is null', async () => {
        const db = makeDB({ firstResult: null });
        const total = await countOpinions(db);
        expect(total).toBe(0);
    });

    it('binds term when provided', async () => {
        const db = makeDB({ firstResult: { total: 3 } });
        await countOpinions(db, { term: '24' });
        expect(db._stmt.bind).toHaveBeenCalledWith('24');
    });
});

// ── getOpinion ────────────────────────────────────────────────────────────────

describe('getOpinion', () => {
    it('returns the opinion row', async () => {
        const db = makeDB({ firstResult: OPINION });
        const row = await getOpinion(db, '24-1234');
        expect(row).toEqual(OPINION);
        expect(db._stmt.bind).toHaveBeenCalledWith('24-1234');
    });

    it('returns null when not found', async () => {
        const db = makeDB({ firstResult: null });
        expect(await getOpinion(db, '99-9999')).toBeNull();
    });
});

// ── getReadingMaterials ───────────────────────────────────────────────────────

describe('getReadingMaterials', () => {
    it('returns the reading materials row', async () => {
        const db = makeDB({ firstResult: RM_ROW });
        const row = await getReadingMaterials(db, '24-1234');
        expect(row).toEqual(RM_ROW);
    });

    it('returns null when not found', async () => {
        const db = makeDB({ firstResult: null });
        expect(await getReadingMaterials(db, '99-9999')).toBeNull();
    });
});

// ── listPending ───────────────────────────────────────────────────────────────

describe('listPending', () => {
    it('returns pending opinions up to limit', async () => {
        const db = makeDB({ allResults: [OPINION] });
        const result = await listPending(db);
        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('pending'));
        expect(result).toHaveLength(1);
    });

    it('uses default limit of 4', async () => {
        const db = makeDB({ allResults: [] });
        await listPending(db);
        expect(db._stmt.bind).toHaveBeenCalledWith(4);
    });
});

// ── upsertOpinion ─────────────────────────────────────────────────────────────

describe('upsertOpinion', () => {
    it('returns true when a new row is inserted (changes = 1)', async () => {
        const db = makeDB({ changes: 1 });
        expect(await upsertOpinion(db, OPINION)).toBe(true);
    });

    it('returns false when the docket already exists (changes = 0)', async () => {
        const db = makeDB({ changes: 0 });
        expect(await upsertOpinion(db, OPINION)).toBe(false);
    });

    it('coerces null for optional fields', async () => {
        const db = makeDB({ changes: 1 });
        await upsertOpinion(db, { docket: '24-1', term: '24', title: 'Test' });
        expect(db._stmt.bind).toHaveBeenCalledWith(
            '24-1', '24', 'Test', null, null, null,
        );
    });
});

// ── setOpinionStatus ──────────────────────────────────────────────────────────

describe('setOpinionStatus', () => {
    it('updates status and clears error_msg when not provided', async () => {
        const db = makeDB();
        await setOpinionStatus(db, '24-1234', 'ready');
        expect(db._stmt.bind).toHaveBeenCalledWith('ready', null, '24-1234');
    });

    it('persists error_msg when provided', async () => {
        const db = makeDB();
        await setOpinionStatus(db, '24-1234', 'error', 'timeout');
        expect(db._stmt.bind).toHaveBeenCalledWith('error', 'timeout', '24-1234');
    });
});

// ── saveReadingMaterials ──────────────────────────────────────────────────────

describe('saveReadingMaterials', () => {
    const RM = {
        sections: [{ heading: 'H', body: 'B', key_terms: [], pull_quote: 'Q' }],
        glossary: [{ term: 'T', definition: 'D' }],
        discussion_questions: ['Q1'],
        further_reading: [{ title: 'R', description: 'Desc' }],
    };

    it('serialises arrays to JSON and binds all params', async () => {
        const db = makeDB();
        await saveReadingMaterials(db, '24-1234', RM, '@cf/meta/llama-3.3-70b-instruct', 'v1');
        expect(db._stmt.bind).toHaveBeenCalledWith(
            '24-1234',
            'v1',
            '@cf/meta/llama-3.3-70b-instruct',
            JSON.stringify(RM.sections),
            JSON.stringify(RM.glossary),
            JSON.stringify(RM.discussion_questions),
            JSON.stringify(RM.further_reading),
        );
    });
});
