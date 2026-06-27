'use strict';

import { fetchWithTimeout, stripHtml } from './utils.js';

const CL_BASE = 'https://www.courtlistener.com/api/rest/v4';

function clHeaders(apiToken) {
    const h = { 'Accept': 'application/json', 'User-Agent': 'ELINAL/1.0 (elinal.zyxwonderland.xyz)' };
    if (apiToken) h['Authorization'] = `Token ${apiToken}`;
    return h;
}

// Returns the ISO date string (YYYY-MM-DD) for Oct 1 of the current SCOTUS term.
// The term opens in October; opinions filed Oct–Dec belong to that year's term,
// Jan–Sep belong to the prior year's term.
export function currentTermStartDate() {
    const now       = new Date();
    const year      = now.getUTCFullYear();
    const month     = now.getUTCMonth() + 1;
    const startYear = month >= 10 ? year : year - 1;
    return `${startYear}-10-01`;
}

// Returns array of opinion stubs for current-term SCOTUS combined opinions.
// Filters to date_filed >= Oct 1 of the current term so re-running ingest
// does not re-queue all-time historical opinions on every cron cycle.
export async function fetchRecentOpinions({ limit = 20, apiToken } = {}) {
    const since = currentTermStartDate();
    const url = `${CL_BASE}/opinions/?court=scotus&type=010combined`
        + `&date_filed__gte=${since}&order_by=-date_filed&page_size=${limit}&format=json`;
    const r = await fetchWithTimeout(url, { headers: clHeaders(apiToken) }, 15_000);
    if (!r.ok) throw new Error(`CourtListener opinions API ${r.status}`);
    const data = await r.json();

    return (data.results ?? []).map(op => ({
        cl_opinion_id: op.id,
        cl_cluster_id: extractLastId(op.cluster),
        title:         op.cluster_title || op.case_name || 'Unknown',
        decided_date:  op.date_filed ?? null,
        term:          decidedTerm(op.date_filed),
        docket:        normaliseDocket(op.docket_number) || `cl-${op.id}`,
    }));
}

// Fetches the plain text of a single opinion from CourtListener
export async function fetchOpinionText(cl_opinion_id, { apiToken } = {}) {
    if (!cl_opinion_id) throw new Error('cl_opinion_id is required');
    const url = `${CL_BASE}/opinions/${cl_opinion_id}/?format=json`;
    const r   = await fetchWithTimeout(url, { headers: clHeaders(apiToken) }, 20_000);
    if (!r.ok) throw new Error(`CourtListener opinion ${cl_opinion_id} returned ${r.status}`);
    const data = await r.json();
    const text = data.plain_text?.trim() || stripHtml(data.html_with_citations || '');
    if (!text || text.length < 200) throw new Error('Opinion text too short or missing');
    return text;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractLastId(url) {
    if (!url) return null;
    const m = String(url).match(/\/(\d+)\/?$/);
    return m ? parseInt(m[1], 10) : null;
}

// Returns 2-digit term string, e.g. "24" for the 2024–2025 term.
// SCOTUS term runs Oct–June; opinions filed Oct–Dec belong to that calendar year's term.
export function decidedTerm(dateStr) {
    if (!dateStr) return null;
    const d     = new Date(dateStr);
    const year  = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    return String(month >= 10 ? year : year - 1).slice(-2);
}

// Strips spaces and normalises docket format (e.g. "24-1234")
export function normaliseDocket(raw) {
    if (!raw) return null;
    return String(raw).replace(/\s+/g, '').replace(/[^\d-]/g, '') || null;
}
