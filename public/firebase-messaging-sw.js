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

  const title = data.title || '📞 SP Nexus';
  const body  = data.body  || 'You have a new notification';
  const icon  = data.icon  || '/logo_studios_pro.png';
  const url   = data.url   || '/community/';
  const tag   = data.tag   || 'sp-nexus-fcm';

  return self.registration.showNotification(title, {
    body,
    icon,
    badge: '/logo_studios_pro.png',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 150, 400, 150, 600, 200, 600],
    data: { url }
  });
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/community/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/community/') && 'focus' in client) {
          client.postMessage({ type: 'SP_CALL_ANSWER_FROM_PUSH' });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
