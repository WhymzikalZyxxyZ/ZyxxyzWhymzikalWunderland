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
    it('maps CourtListener results to opinion stubs', async () => {
        mockFetch({
            results: [{
                id: 12345, cluster: 'https://cl.example/clusters/99/',
                cluster_title: 'Test v. State', case_name: null,
                date_filed: '2025-04-15', docket_number: '24-1234',
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

    it('falls back to case_name when cluster_title is absent', async () => {
        mockFetch({ results: [{ id: 1, cluster_title: '', case_name: 'Fallback v. US', date_filed: '2025-01-01', docket_number: '24-1' }] });
        const [op] = await fetchRecentOpinions();
        expect(op.title).toBe('Fallback v. US');
    });

    it('uses cl-{id} docket when docket_number is absent', async () => {
        mockFetch({ results: [{ id: 777, cluster_title: 'T', date_filed: '2025-01-01', docket_number: null }] });
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

    it('includes date_filed__gte term filter in the request URL', async () => {
        mockFetch({ results: [] });
        await fetchRecentOpinions();
        const calledUrl = global.fetch.mock.calls[0][0];
        expect(calledUrl).toContain('date_filed__gte=');
        expect(calledUrl).toMatch(/date_filed__gte=\d{4}-10-01/);
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
