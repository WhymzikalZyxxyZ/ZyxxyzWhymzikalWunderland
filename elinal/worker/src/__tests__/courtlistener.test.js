'use strict';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchRecentOpinions, fetchOpinionText,
    decidedTerm, normaliseDocket, currentTermStartDate,
} from '../courtlistener.js';

// ── fetch mock ────────────────────────────────────────────────────────────────

function mockFetch(body, { status = 200, ok = true } = {}) {
    global.fetch = vi.fn().mockResolvedValue({
        ok,
        status,
        json: vi.fn().mockResolvedValue(body),
    });
}

// ── currentTermStartDate ──────────────────────────────────────────────────────

describe('currentTermStartDate', () => {
    afterEach(() => { vi.useRealTimers(); });

    it('returns prior-year Oct 1 when current month is before October', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-27T12:00:00Z'));
        expect(currentTermStartDate()).toBe('2025-10-01');
    });

    it('returns current-year Oct 1 when current month is October or later', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));
        expect(currentTermStartDate()).toBe('2025-10-01');
    });

    it('returns current-year Oct 1 on Oct 1 itself', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-10-01T00:00:00Z'));
        expect(currentTermStartDate()).toBe('2025-10-01');
    });
});

// ── fetchRecentOpinions ───────────────────────────────────────────────────────

describe('fetchRecentOpinions', () => {
    it('maps CourtListener search results to opinion stubs', async () => {
        mockFetch({
            results: [{
                cluster_id: 99, caseName: 'Test v. State', caseNameFull: '',
                dateFiled: '2025-04-15', docketNumber: '24-1234',
                opinions: [{ id: 12345 }],
            }],
        });
        const opinions = await fetchRecentOpinions({ limit: 5 });
        expect(opinions).toHaveLength(1);
        expect(opinions[0]).toMatchObject({
            cl_opinion_id: 12345,
            cl_cluster_id: 99,
            title:         'Test v. State',
            decided_date:  '2025-04-15',
            term:          '24',
            docket:        '24-1234',
        });
    });

    it('falls back to caseNameFull when caseName is absent', async () => {
        mockFetch({ results: [{ cluster_id: 1, caseName: '', caseNameFull: 'Fallback v. US', dateFiled: '2025-01-01', docketNumber: '24-1', opinions: [{ id: 1 }] }] });
        const [op] = await fetchRecentOpinions();
        expect(op.title).toBe('Fallback v. US');
    });

    it('filters out results with no opinions', async () => {
        mockFetch({ results: [
            { cluster_id: 1, caseName: 'A', dateFiled: '2025-01-01', docketNumber: '24-1', opinions: [] },
            { cluster_id: 2, caseName: 'B', dateFiled: '2025-01-02', docketNumber: '24-2', opinions: [{ id: 2 }] },
        ]});
        const ops = await fetchRecentOpinions();
        expect(ops).toHaveLength(1);
        expect(ops[0].cl_cluster_id).toBe(2);
    });

    it('uses cl-{cluster_id} docket when docketNumber is absent', async () => {
        mockFetch({ results: [{ cluster_id: 777, caseName: 'T', dateFiled: '2025-01-01', docketNumber: null, opinions: [{ id: 1 }] }] });
        const [op] = await fetchRecentOpinions();
        expect(op.docket).toBe('cl-777');
    });

    it('returns empty array when results is empty', async () => {
        mockFetch({ results: [] });
        expect(await fetchRecentOpinions()).toHaveLength(0);
    });

    it('throws on non-ok response', async () => {
        mockFetch({}, { status: 500, ok: false });
        await expect(fetchRecentOpinions()).rejects.toThrow('500');
    });

    it('uses the /search/ endpoint with filed_after term filter in the URL', async () => {
        mockFetch({ results: [] });
        await fetchRecentOpinions();
        const calledUrl = global.fetch.mock.calls[0][0];
        expect(calledUrl).toContain('/search/');
        expect(calledUrl).toContain('filed_after=');
        expect(calledUrl).toMatch(/filed_after=\d{4}-10-01/);
    });

    it('sends Authorization header when apiToken is provided', async () => {
        mockFetch({ results: [] });
        await fetchRecentOpinions({ apiToken: 'test-token' });
        const calledOpts = global.fetch.mock.calls[0][1];
        expect(calledOpts.headers['Authorization']).toBe('Token test-token');
    });

    it('omits Authorization header when apiToken is absent', async () => {
        mockFetch({ results: [] });
        await fetchRecentOpinions();
        const calledOpts = global.fetch.mock.calls[0][1];
        expect(calledOpts.headers['Authorization']).toBeUndefined();
    });
});

// ── fetchOpinionText ──────────────────────────────────────────────────────────

describe('fetchOpinionText', () => {
    it('returns plain_text when present', async () => {
        const text = 'This is the opinion.'.repeat(20);
        mockFetch({ plain_text: text, html_with_citations: '' });
        expect(await fetchOpinionText(12345)).toBe(text);
    });

    it('strips HTML tags when plain_text is absent', async () => {
        mockFetch({
            plain_text: '',
            html_with_citations: '<p>Some <b>HTML</b> text.</p> '.repeat(20),
        });
        const text = await fetchOpinionText(12345);
        expect(text).not.toMatch(/<[^>]+>/);
        expect(text.length).toBeGreaterThan(0);
    });

    it('throws when text is too short', async () => {
        mockFetch({ plain_text: 'too short', html_with_citations: '' });
        await expect(fetchOpinionText(12345)).rejects.toThrow('too short');
    });

    it('throws on non-ok response', async () => {
        mockFetch({}, { status: 404, ok: false });
        await expect(fetchOpinionText(12345)).rejects.toThrow('404');
    });

    it('throws when cl_opinion_id is falsy', async () => {
        await expect(fetchOpinionText(null)).rejects.toThrow('required');
    });

    it('sends Authorization header when apiToken is provided', async () => {
        const text = 'Opinion text here.'.repeat(20);
        mockFetch({ plain_text: text });
        await fetchOpinionText(12345, { apiToken: 'test-token' });
        const calledOpts = global.fetch.mock.calls[0][1];
        expect(calledOpts.headers['Authorization']).toBe('Token test-token');
    });
});

// ── decidedTerm ───────────────────────────────────────────────────────────────

describe('decidedTerm', () => {
    it('returns null for null input', () => {
        expect(decidedTerm(null)).toBeNull();
    });

    it('assigns Oct–Dec opinions to that calendar year', () => {
        expect(decidedTerm('2024-10-15')).toBe('24');
        expect(decidedTerm('2024-12-31')).toBe('24');
    });

    it('assigns Jan–Jun opinions to the prior year\'s term', () => {
        expect(decidedTerm('2025-01-01')).toBe('24');
        expect(decidedTerm('2025-06-30')).toBe('24');
    });

    it('assigns Jul–Sep ambiguously to the prior year', () => {
        // Jul–Sep: not a typical opinion month but handled
        expect(decidedTerm('2025-07-01')).toBe('24');
    });
});

// ── normaliseDocket ───────────────────────────────────────────────────────────

describe('normaliseDocket', () => {
    it('returns null for null input', () => {
        expect(normaliseDocket(null)).toBeNull();
    });

    it('strips spaces', () => {
        expect(normaliseDocket('24 - 1234')).toBe('24-1234');
    });

    it('returns null for non-numeric strings', () => {
        expect(normaliseDocket('ABC')).toBeNull();
    });
});
