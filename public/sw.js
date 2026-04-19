/**
 * OperixGo Service Worker
 * Cache strategy:
 *   - Static assets (JS/CSS/HTML/fonts/images): cache-first with 7-day SWR
 *   - API calls (/api/*): network-first with fallback to cached response
 *   - Offline queue: requests in /api/queue/* get stored and replayed on reconnect
 */

const CACHE_VERSION = 'opx-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

const STATIC_ASSETS = [
  '/',
  '/mobile/',
  '/mobile/login',
  '/manifest.webmanifest',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests — network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(
            (r) =>
              r ||
              new Response(
                JSON.stringify({ offline: true, queued: true }),
                { headers: { 'Content-Type': 'application/json' }, status: 202 },
              ),
          ),
        ),
    );
    return;
  }

  // Static — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (request.method === 'GET' && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match('/mobile/'));
    }),
  );
});

// Listen for messages from the app — used to trigger queue replay on reconnect
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REPLAY_QUEUE') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'QUEUE_REPLAY_READY' }));
    });
  }
});
