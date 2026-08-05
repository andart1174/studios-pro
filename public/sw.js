// ═══════════════════════════════════════════════════════════════
// 🔔 SP NEXUS PUSH & BACKGROUND ALERTS SERVICE WORKER
// ═══════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Push Notification Event
self.addEventListener('push', (event) => {
  let data = {
    title: '📞 Incoming Call from SP Nexus',
    body: 'Tap to answer call in SP Nexus!',
    icon: '/logo_studios_pro.png',
    url: '/community/'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = Object.assign(data, json);
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo_studios_pro.png',
    badge: '/logo_studios_pro.png',
    tag: data.tag || 'sp-nexus-push',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 500, 200, 500],
    data: { url: data.url || '/community/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Click (Focus or Open App Window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/community/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/community/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
