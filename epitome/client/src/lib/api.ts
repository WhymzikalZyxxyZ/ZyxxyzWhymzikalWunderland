const BASE = '/api';

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body:    body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(data.error ?? `${method} ${path} → ${res.status}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export const api = {
    get:    <T>(path: string)                => req<T>('GET',    path),
    post:   <T>(path: string, body: unknown) => req<T>('POST',   path, body),
    put:    <T>(path: string, body: unknown) => req<T>('PUT',    path, body),
    patch:  <T>(path: string, body: unknown) => req<T>('PATCH',  path, body),
    delete: <T>(path: string)                => req<T>('DELETE', path),
};

export async function uploadFile(path: string, file: File, extra?: Record<string, string>): Promise<{ key: string }> {
    const fd = new FormData();
    fd.append('file', file);
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    const res = await fetch(`${BASE}${path}`, { method: 'POST', credentials: 'include', body: fd });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json() as Promise<{ key: string }>;
}
