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
    title: '📞 SP Nexus — Incoming Call',
    body: 'Incoming call from creator. Tap to answer in SP Nexus!',
    icon: '/logo_studios_pro.png',
    badge: '/logo_studios_pro.png',
    url: '/community/?call=true',
    tag: 'sp-call',
    vibrate: [500, 200, 500, 200, 500, 200, 1000, 400, 1000],
    requireInteraction: true,
    actions: [
      { action: 'answer', title: '📞 Answer Call' },
      { action: 'decline', title: '❌ Decline' }
    ]
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch(e) {
      data.body = event.data.text();
    }
  }

  const isCall = (data.tag && data.tag.includes('call')) || (data.title && (data.title.includes('Call') || data.title.includes('📞') || data.title.includes('📹')));

  const notifOptions = {
    body: data.body,
    icon: data.icon || '/logo_studios_pro.png',
    badge: data.badge || '/logo_studios_pro.png',
    tag: data.tag || 'sp-nexus',
    renotify: true,
    requireInteraction: data.requireInteraction !== false || isCall,
    vibrate: isCall ? [500, 200, 500, 200, 500, 200, 1000, 400, 1000] : (data.vibrate || [300, 150, 500]),
    data: { url: data.url || '/community/?call=true' }
  };

  if (isCall) {
    notifOptions.actions = [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Dismiss' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, notifOptions)
  );
});

// ── Notification Click → Focus or Open App ──────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'decline') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/community/?call=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open in a tab, focus it and trigger call answer
      for (const client of clientList) {
        if (client.url.includes('/community') && 'focus' in client) {
          client.postMessage({ type: 'SP_CALL_ANSWER_FROM_PUSH' });
          return client.focus();
        }
      }
      // Otherwise open app directly on community call screen
      return clients.openWindow(targetUrl);
    })
  );
});

