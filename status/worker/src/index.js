'use strict';

export { StatusDO } from './statusDO.js';

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function cors(res) {
    const r = new Response(res.body, res);
    for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
    return r;
}

async function probe(url) {
    const start = Date.now();
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
        return { ok: res.ok, latency_ms: Date.now() - start };
    } catch {
        return { ok: false, latency_ms: Date.now() - start };
    }
}

export default {
    async scheduled(event, env) {
        const services = JSON.parse(env.SERVICES);
        const results  = await Promise.all(services.map(async svc => {
            const { ok, latency_ms } = await probe(svc.url);
            return { id: svc.id, ok, latency_ms, ts: Date.now() };
        }));

        const id  = env.STATUS_DO.idFromName('singleton');
        const stub = env.STATUS_DO.get(id);
        await stub.fetch(new Request(
            `https://do/record?retention=${env.RETENTION_DAYS}`,
            { method: 'POST', body: JSON.stringify(results), headers: { 'Content-Type': 'application/json' } }
        ));
    },

    async fetch(request, env) {
        const url  = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS });
        }

        const id   = env.STATUS_DO.idFromName('singleton');
        const stub = env.STATUS_DO.get(id);

        if (path === '/api/status') {
            const services = JSON.parse(env.SERVICES);
            const res = await stub.fetch(new Request(
                `https://do/current?services=${encodeURIComponent(JSON.stringify(services))}`
            ));
            return cors(res);
        }

        if (path === '/api/sparkline') {
            const services   = JSON.parse(env.SERVICES);
            const validIds   = new Set(services.map(s => s.id));
            const svc        = url.searchParams.get('svc') || '';
            if (!validIds.has(svc)) {
                return new Response(JSON.stringify({ error: 'Unknown service id' }), {
                    status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
                });
            }
            const n   = Math.max(1, Math.min(360, parseInt(url.searchParams.get('n') || '90', 10)));
            const res = await stub.fetch(new Request(`https://do/sparkline?svc=${encodeURIComponent(svc)}&n=${n}`));
            return cors(res);
        }

        return new Response('not found', { status: 404 });
    },
};
