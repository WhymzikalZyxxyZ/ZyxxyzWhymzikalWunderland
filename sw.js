'use strict';

const CACHE_NAME = 'wunderland-v11';

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
    '/js/gamer/solitaire.js',
    '/js/engines/solitaire-engine.js',
    '/js/gamer/poker.js',
    '/js/engines/poker-engine.js',
    '/js/gamer/five-card-draw.js',
    '/js/engines/five-card-draw-engine.js',
    '/js/gamer/gamer-chat.js',
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
    // All pages now use directory/index.html structure, so GitHub Pages serves
    // extensionless URLs natively — no path rewriting needed.
    if (request.headers.get('accept')?.includes('text/html')) {
        e.respondWith(
            fetch(request)
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
