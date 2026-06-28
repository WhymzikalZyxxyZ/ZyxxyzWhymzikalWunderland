'use strict';

export { SessionDO } from './sessionDO.js';

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function uid8() {
    return Array.from(crypto.getRandomValues(new Uint8Array(5)))
        .map(b => b.toString(36)).join('').slice(0, 8);
}

export default {
    async fetch(request, env) {
        try {
            const url  = new URL(request.url);
            const path = url.pathname;

            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: CORS });
            }

            if (path === '/api/session' && request.method === 'POST') {
                return Response.json({ id: uid8() }, { headers: CORS });
            }

            if (path === '/ws') {
                const sessionId = url.searchParams.get('session');
                if (!sessionId) return new Response('missing session', { status: 400 });
                if (request.headers.get('Upgrade') !== 'websocket') {
                    return new Response('expected websocket', { status: 426 });
                }
                const stub = env.SESSION_DO.get(env.SESSION_DO.idFromName(sessionId));
                return stub.fetch(request);
            }

            return new Response('not found', { status: 404 });
        } catch (e) {
            console.error('collab_unhandled', String(e));
            return new Response('internal server error', { status: 500 });
        }
    },
};
