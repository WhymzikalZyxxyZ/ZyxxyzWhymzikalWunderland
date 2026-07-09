/**
 * Tests for src/lib/api.ts
 *
 * All fetch calls are intercepted via vi.stubGlobal — no real HTTP is made.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, uploadFile } from '../lib/api';

// ── Fetch stub helpers ────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown, contentType = 'application/json') {
    const response = new Response(
        contentType === 'application/json' ? JSON.stringify(body) : String(body),
        { status, headers: { 'Content-Type': contentType } },
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

function mockFetchError(message: string) {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error(message)));
}

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
    vi.unstubAllGlobals();
});

// ── api.get ───────────────────────────────────────────────────────────────────

describe('api.get()', () => {
    it('calls fetch with GET method and credentials:include', async () => {
        mockFetch(200, { ok: true });
        await api.get('/test-path');
        const stub = fetch as ReturnType<typeof vi.fn>;
        expect(stub).toHaveBeenCalledOnce();
        const [url, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/test-path');
        expect(init.method).toBe('GET');
        expect(init.credentials).toBe('include');
    });

    it('resolves with the parsed JSON response body', async () => {
        mockFetch(200, { userId: 'abc', username: 'writer' });
        const result = await api.get<{ userId: string; username: string }>('/auth/me');
        expect(result.userId).toBe('abc');
        expect(result.username).toBe('writer');
    });

    it('throws an Error with the server error message on non-ok response', async () => {
        mockFetch(401, { error: 'Unauthorized' });
        await expect(api.get('/protected')).rejects.toThrow('Unauthorized');
    });

    it('throws a fallback Error when response body is not parseable JSON', async () => {
        mockFetch(500, '<html>Server Error</html>', 'text/html');
        await expect(api.get('/bad-html')).rejects.toThrow();
    });

    it('throws with a fallback message when error body has no error field', async () => {
        mockFetch(400, { message: 'something went wrong' });
        await expect(api.get('/weird-error')).rejects.toThrow('GET /weird-error → 400');
    });

    it('returns undefined for 204 No Content responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        const result = await api.get('/no-content');
        expect(result).toBeUndefined();
    });
});

// ── api.post ──────────────────────────────────────────────────────────────────

describe('api.post()', () => {
    it('calls fetch with POST method and serialises body as JSON', async () => {
        mockFetch(201, { id: '1' });
        await api.post('/projects', { title: 'New Book', type: 'novel' });
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('POST');
        expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
        expect(JSON.parse(init.body as string)).toMatchObject({ title: 'New Book', type: 'novel' });
    });

    it('resolves with the parsed JSON response', async () => {
        mockFetch(201, { project: { id: 'proj-1' } });
        const result = await api.post<{ project: { id: string } }>('/projects', {});
        expect(result.project.id).toBe('proj-1');
    });

    it('throws on a 409 conflict with the server error message', async () => {
        mockFetch(409, { error: 'Username already taken' });
        await expect(api.post('/auth/signup', { username: 'x', password: 'y' })).rejects.toThrow('Username already taken');
    });
});

// ── api.patch ─────────────────────────────────────────────────────────────────

describe('api.patch()', () => {
    it('calls fetch with PATCH method', async () => {
        mockFetch(200, { id: '1', status: 'revising' });
        await api.patch('/projects/1', { status: 'revising' });
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('PATCH');
    });

    it('sends the body as JSON', async () => {
        mockFetch(200, {});
        await api.patch('/projects/1', { title: 'Updated Title' });
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(init.body as string)).toMatchObject({ title: 'Updated Title' });
    });
});

// ── api.put ───────────────────────────────────────────────────────────────────

describe('api.put()', () => {
    it('calls fetch with PUT method', async () => {
        mockFetch(200, {});
        await api.put('/resource/1', { value: 42 });
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('PUT');
    });
});

// ── api.delete ────────────────────────────────────────────────────────────────

describe('api.delete()', () => {
    it('calls fetch with DELETE method and no body', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        await api.delete('/projects/1');
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(init.method).toBe('DELETE');
        expect(init.body).toBeUndefined();
    });

    it('throws on 404 when resource not found', async () => {
        mockFetch(404, { error: 'Not found' });
        await expect(api.delete('/projects/nonexistent')).rejects.toThrow('Not found');
    });
});

// ── uploadFile ────────────────────────────────────────────────────────────────

describe('uploadFile()', () => {
    it('calls fetch with POST method and FormData body', async () => {
        mockFetch(200, { key: 'covers/uploaded.jpg' });
        const file = new File(['img data'], 'cover.jpg', { type: 'image/jpeg' });
        await uploadFile('/uploads/covers', file);

        const stub = fetch as ReturnType<typeof vi.fn>;
        const [url, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('/api/uploads/covers');
        expect(init.method).toBe('POST');
        expect(init.body).toBeInstanceOf(FormData);
    });

    it('resolves with { key } on success', async () => {
        mockFetch(200, { key: 'covers/my-art.png' });
        const file = new File([''], 'art.png', { type: 'image/png' });
        const result = await uploadFile('/uploads', file);
        expect(result.key).toBe('covers/my-art.png');
    });

    it('appends extra form fields when provided', async () => {
        mockFetch(200, { key: 'ok' });
        const file = new File([''], 'x.jpg', { type: 'image/jpeg' });
        await uploadFile('/uploads', file, { projectId: 'proj-1', label: 'Cover Art' });

        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        const fd = init.body as FormData;
        expect(fd.get('projectId')).toBe('proj-1');
        expect(fd.get('label')).toBe('Cover Art');
    });

    it('throws when upload response is not ok', async () => {
        mockFetch(413, 'File too large', 'text/plain');
        const file = new File(['x'.repeat(1000)], 'huge.jpg', { type: 'image/jpeg' });
        await expect(uploadFile('/uploads', file)).rejects.toThrow('Upload failed: 413');
    });

    it('sends credentials:include with the request', async () => {
        mockFetch(200, { key: 'k' });
        const file = new File([''], 'f.jpg', { type: 'image/jpeg' });
        await uploadFile('/uploads', file);
        const stub = fetch as ReturnType<typeof vi.fn>;
        const [, init] = stub.mock.calls[0] as [string, RequestInit];
        expect(init.credentials).toBe('include');
    });
});
