// ═══════════════════════════════════════════════════════════════
// 🔔 SP NEXUS – WEB PUSH SERVICE WORKER v5
// Handles real Web Push notifications (calls & messages)
// even when app is completely closed
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Incoming Web Push Event ──────────────────────────────────────
self.addEventListener('push', event => {
  let data = {
    title: '📞 SP Nexus',
    body: 'You have a new notification',
    icon: '/logo_studios_pro.png',
    badge: '/logo_studios_pro.png',
    url: '/community/',
    tag: 'sp-nexus',
    vibrate: [300, 150, 300, 150, 500],
    requireInteraction: true
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch(e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo_studios_pro.png',
      badge: data.badge || '/logo_studios_pro.png',
      tag: data.tag || 'sp-nexus',
      renotify: true,
      requireInteraction: data.requireInteraction !== false,
      vibrate: data.vibrate || [300, 150, 500],
      data: { url: data.url || '/community/' }
    })
  );
});

// ── Notification Click → Focus or Open App ──────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/community/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it and signal to answer call
      for (const client of clientList) {
        if (client.url.includes('/community/') && 'focus' in client) {
          client.postMessage({ type: 'SP_CALL_ANSWER_FROM_PUSH' });
          return client.focus();
        }
      }
      // Otherwise open app directly on call screen
      return clients.openWindow(targetUrl);
    })
  );
});
