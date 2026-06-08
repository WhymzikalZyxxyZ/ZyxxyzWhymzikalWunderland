'use strict';

import { createClient } from 'redis';

let client = null;

async function getClient() {
    if (client) return client;
    client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    client.on('error', (e) => console.error('Redis error:', e.message));
    await client.connect();
    return client;
}

export async function getCache(key) {
    try {
        const c   = await getClient();
        const raw = await c.get(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null; // cache miss — degrade gracefully
    }
}

export async function setCache(key, value, ttlSeconds) {
    try {
        const c = await getClient();
        await c.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
        // cache write failure is non-fatal
    }
}
