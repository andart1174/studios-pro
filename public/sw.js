const CACHE_NAME = 'sp-nexus-v3';
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
  // Remove ALL old caches when activating new SW version
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // CRITICAL: Never intercept cross-origin requests.
  // This allows AR viewer model downloads, Firebase, catbox.moe, tmpfiles.org to work normally.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests
  if (e.request.method !== 'GET') {
    return;
  }

  // Skip AR viewer and apps paths — never cache these, always fetch fresh
  if (url.pathname.startsWith('/apps/') || url.pathname.startsWith('/ar-viewer/')) {
    return;
  }

  // For same-origin GET requests on community pages: serve from cache, fallback to network
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request)).catch(() => fetch(e.request))
  );
});
