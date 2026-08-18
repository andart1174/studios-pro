// ═══════════════════════════════════════════════════════════════
// 🔔 SP NEXUS – FIREBASE CLOUD MESSAGING SERVICE WORKER
// Much more reliable than Web Push API on Android
// ═══════════════════════════════════════════════════════════════

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBNB1Whl4DCQPLGiCmAOpW7yXK1uGZXc9c",
  authDomain: "studios-pro.firebaseapp.com",
  projectId: "studios-pro",
  storageBucket: "studios-pro.firebasestorage.app",
  messagingSenderId: "337301506363",
  appId: "1:337301506363:web:68b84724390b830bbf4f1e"
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage(payload => {
  const data = payload.data || payload.notification || {};

  const title = data.title || '📞 SP Nexus — Incoming Call';
  const body  = data.body  || 'Tap to answer in SP Nexus!';
  const icon  = data.icon  || '/logo_studios_pro.png';
  const url   = data.url   || '/community/?call=true';
  const tag   = data.tag   || 'sp-call';

  const isCall = (tag && tag.includes('call')) || (title && (title.includes('Call') || title.includes('📞') || title.includes('📹')));

  const notifOptions = {
    body,
    icon,
    badge: '/logo_studios_pro.png',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: isCall ? [500, 200, 500, 200, 500, 200, 1000, 400, 1000] : [400, 150, 400],
    data: { url }
  };

  if (isCall) {
    notifOptions.actions = [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Dismiss' }
    ];
  }

  return self.registration.showNotification(title, notifOptions);
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'decline') {
    return;
  }

  const url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/community/?call=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/community') && 'focus' in client) {
          client.postMessage({ type: 'SP_CALL_ANSWER_FROM_PUSH' });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

