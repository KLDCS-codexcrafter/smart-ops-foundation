/**
 * OperixGo Service Worker — S152.T4 hardened
 *
 * S152.T4 ROOT CAUSE FIX: prior v1 was cache-first on all static assets
 * including HTML and JS modules with skipWaiting+clients.claim — installed
 * browsers froze on a stale module graph; every deploy bricked them with
 * "Failed to fetch dynamically imported module".
 *
 * v2 strategy:
 *   - Kill-switch: preview hosts (lovableproject.com / lovable.app) MUST NOT
 *     be SW-controlled. Self-unregister and pass-through on those hosts.
 *   - Navigations + JS/CSS/modules: NETWORK-FIRST (cache fallback offline).
 *   - manifest / icons / fonts / images: cache-first (long-lived assets).
 *   - /api/*: network-first (unchanged).
 *   - Bumping CACHE_VERSION to opx-v2 makes the existing activate handler
 *     purge v1 caches; browsers re-fetch sw.js bytes on each navigation
 *     ignoring HTTP cache, so frozen v1 browsers SELF-HEAL on next visit.
 */

// S152.T4 · Block 3 · kill-switch — preview hosts must never be SW-cached.
const HOSTNAME = (self.location && self.location.hostname) || '';
const IS_PREVIEW_HOST =
  HOSTNAME.endsWith('lovableproject.com') ||
  HOSTNAME.endsWith('lovable.app');

if (IS_PREVIEW_HOST) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        try {
          const keys = await caches.keys();
          await Promise.allSettled(keys.map((k) => caches.delete(k)));
        } finally {
          await self.registration.unregister();
        }
      })(),
    );
  });
  // No fetch handler → all requests pass through to the network.
} else {
  // S152.T4 · Block 2 · version bump → activate purges v1 → self-heal.
  const CACHE_VERSION = 'opx-v2';
  const STATIC_CACHE = `${CACHE_VERSION}-static`;
  const API_CACHE = `${CACHE_VERSION}-api`;

  const PRECACHE = [
    '/manifest.webmanifest',
    '/favicon.ico',
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {})),
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

  /** Long-lived assets safe for cache-first. */
  function isLongLivedAsset(url) {
    const p = url.pathname;
    if (p === '/manifest.webmanifest' || p === '/favicon.ico') return true;
    if (p.startsWith('/icons/')) return true;
    return /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|woff|woff2|ttf|otf|eot)$/i.test(p);
  }

  /** JS / CSS / module requests — must be network-first to avoid frozen graphs. */
  function isCodeAsset(request, url) {
    if (request.destination === 'script' || request.destination === 'style') return true;
    return /\.(?:js|mjs|css|map)$/i.test(url.pathname);
  }

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    let url;
    try {
      url = new URL(request.url);
    } catch {
      return;
    }

    // /api/* — network-first.
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

    // Navigations + JS/CSS/modules — network-first.
    if (request.mode === 'navigate' || isCodeAsset(request, url)) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200 && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
      );
      return;
    }

    // Long-lived static assets — cache-first.
    if (isLongLivedAsset(url)) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          });
        }),
      );
      return;
    }

    // Default: pass-through (network only, no caching).
  });

  // Queue replay messaging (unchanged from v1).
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'REPLAY_QUEUE') {
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'QUEUE_REPLAY_READY' }));
      });
    }
  });
}
