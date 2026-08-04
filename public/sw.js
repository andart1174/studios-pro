// ═══════════════════════════════════════════════════════════════
// 🌐 SP NEXUS SERVICE WORKER — PWA & WEB PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
const CACHE_NAME = 'sp-nexus-pwa-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// 🔔 NATIVE PUSH NOTIFICATION EVENT
self.addEventListener('push', (e) => {
  let data = { title: 'SP Nexus 🌐', body: 'New activity on SP Nexus!', icon: '/sp_coin_logo.png', url: '/community/' };
  try {
    if (e.data) data = e.data.json();
  } catch(err) {}

  const options = {
    body: data.body,
    icon: data.icon || '/sp_coin_logo.png',
    badge: '/sp_coin_logo.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/community/' }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow(e.notification.data.url || '/community/')
  );
});
