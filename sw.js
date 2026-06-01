'use strict';

const CACHE_NAME = 'wunderland-v2';

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
    '/js/tetris-engine.js',
    '/js/gamer/snake.js',
    '/js/snake-engine.js',
    '/js/gamer/daedalus.js',
    '/js/gamer/chess.js',
    '/js/chess-engine.js',
    '/js/gamer/checkers.js',
    '/js/checkers-engine.js',
    '/js/card-engine.js',
    '/js/gamer/blackjack.js',
    '/js/blackjack-engine.js',
    '/js/gamer/pong.js',
    '/js/pong-engine.js',
    '/js/gamer/rps.js',
    '/js/rps-engine.js',
    '/js/puzzle-engine.js',
    '/js/gamer/puzzle.js',
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

    // HTML: network-first (always fresh navigation)
    if (request.headers.get('accept')?.includes('text/html')) {
        e.respondWith(
            fetch(request)
                .then(res => { caches.open(CACHE_NAME).then(c => c.put(request, res.clone())); return res; })
                .catch(() => caches.match(request))
        );
        return;
    }

    // CSS / JS / fonts / images: cache-first
    e.respondWith(
        caches.match(request).then(cached => {
            if (cached) return cached;
            return fetch(request).then(res => {
                if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
                return res;
            });
        })
    );
});
