// SP Nexus Community PWA Service Worker — scope: /community/ ONLY
const CACHE_NAME = 'sp-nexus-community-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['/community/', '/manifest.json', '/logo_studios_pro.png']))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Only handle same-origin GET requests for /community/ path
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  if (!url.pathname.startsWith('/community')) return;
  
  e.respondWith(
    caches.match(e.request)
      .then(res => res || fetch(e.request))
      .catch(() => fetch(e.request))
  );
});
