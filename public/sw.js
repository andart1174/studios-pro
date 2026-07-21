const CACHE_NAME = 'sp-nexus-v1';
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
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // CRITICAL: Only intercept same-origin requests (studios-pro.com).
  // Never intercept cross-origin fetches (catbox.moe, tmpfiles.org, firebase, etc.)
  // to avoid breaking AR model downloads, Firebase, and external APIs.
  if (url.origin !== self.location.origin) {
    return; // Let browser handle cross-origin requests normally
  }

  // Also skip non-GET requests (POST, PUT, etc.)
  if (e.request.method !== 'GET') {
    return;
  }

  // For same-origin GET requests: serve from cache, fallback to network
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request)).catch(() => fetch(e.request))
  );
});
