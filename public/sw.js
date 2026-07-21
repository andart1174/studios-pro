// SP Nexus PWA Service Worker — scope: /community/ ONLY
// Version 4 — AR Viewer safe (never intercepts /apps/ or cross-origin)
const CACHE_NAME = 'sp-nexus-v4';
const urlsToCache = [
  '/community/',
  '/manifest.json',
  '/logo_studios_pro.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Delete ALL old caches to force clean update
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // SAFETY 1: Never intercept cross-origin requests
  if (url.origin !== self.location.origin) return;

  // SAFETY 2: Never intercept /apps/, /ar-viewer/, /viewer/, /convert/ paths
  const blockedPaths = ['/apps/', '/ar-viewer/', '/viewer/', '/convert/', '/ar-viewer'];
  if (blockedPaths.some(p => url.pathname.startsWith(p))) return;

  // SAFETY 3: Only handle GET requests
  if (e.request.method !== 'GET') return;

  // Only cache /community/ related requests
  if (!url.pathname.startsWith('/community') && url.pathname !== '/manifest.json' && url.pathname !== '/logo_studios_pro.png') return;

  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request)).catch(() => fetch(e.request))
  );
});
