import type { Opinion, ReadingMaterials } from './types';

export interface OpinionsResponse {
    opinions: Opinion[];
    total:    number;
    limit:    number;
    offset:   number;
}

async function apiFetch<T>(path: string): Promise<T> {
    const r = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
        const body = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `API ${r.status}: ${r.statusText}`);
    }
    return r.json() as Promise<T>;
}

export function fetchOpinions(
    params: { term?: string; limit?: number; offset?: number } = {},
): Promise<OpinionsResponse> {
    const q = new URLSearchParams();
    if (params.term   != null) q.set('term',   params.term);
    if (params.limit  != null) q.set('limit',  String(params.limit));
    if (params.offset != null) q.set('offset', String(params.offset));
    const qs = q.toString();
    return apiFetch(`/api/opinions${qs ? `?${qs}` : ''}`);
}

export function fetchOpinion(docket: string): Promise<Opinion> {
    return apiFetch(`/api/opinions/${encodeURIComponent(docket)}`);
}

export function fetchReadingMaterials(docket: string): Promise<ReadingMaterials> {
    return apiFetch(`/api/opinions/${encodeURIComponent(docket)}/reading`);
}
