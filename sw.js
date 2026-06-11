'use strict';

const CACHE_NAME = 'wunderland-v6';

// Static assets to pre-cache on install
const PRECACHE = [
    '/',
    '/css/styles.css',
    '/js/script.js',
    '/js/utils.js',
    '/js/index.js',
    '/js/username-gen.js',
    '/favicon.svg',
    '/manifest.json',
    '/404.html',
    '/gamer/games',
    '/js/gamer/tetris.js',
    '/js/engines/tetris-engine.js',
    '/js/gamer/snake.js',
    '/js/engines/snake-engine.js',
    '/js/gamer/daedalus.js',
    '/js/gamer/chess.js',
    '/js/engines/chess-engine.js',
    '/js/gamer/checkers.js',
    '/js/engines/checkers-engine.js',
    '/js/engines/card-engine.js',
    '/js/gamer/blackjack.js',
    '/js/engines/blackjack-engine.js',
    '/js/gamer/pong.js',
    '/js/engines/pong-engine.js',
    '/js/gamer/rps.js',
    '/js/engines/rps-engine.js',
    '/js/engines/puzzle-engine.js',
    '/js/gamer/puzzle.js',
    '/mail/',
    '/mail/css/app.css',
    '/mail/js/app.js',
    '/mail/js/api.js',
    '/mail/js/compose.js',
];

self.addEventListener('install', e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const { request } = e;

    // Only handle GET requests to same origin
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // HTML: network-first (always fresh navigation); only cache 2xx responses.
    // Rewrite extensionless paths (e.g. /technologist/apps) to .html so GitHub
    // Pages serves the right file; cache under the original extensionless URL.
    if (request.headers.get('accept')?.includes('text/html')) {
        const u = new URL(request.url);
        const seg = u.pathname.split('/').pop();
        const fetchUrl = (seg && !seg.includes('.'))
            ? new URL(u.pathname + '.html', u.origin).href
            : request.url;
        e.respondWith(
            fetch(fetchUrl)
                .then(res => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then(c => c.put(request, clone));
                    }
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // CSS / JS / fonts / images: cache-first
    e.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, clone));
                }
                return res;
            });
        })
    );
});
