// ═══════════════════════════════════════════════════════════════
// 🔔 SP NEXUS – BACKGROUND CALL & MESSAGE SERVICE WORKER
// ═══════════════════════════════════════════════════════════════
const SW_VERSION = 'sp-nexus-v4';
const POLL_INTERVAL_MS = 8000; // Poll Firestore every 8 seconds

let pollingTimer = null;
let lastSeenCallId = null;
let myUidCached = null;
let firebaseConfigCached = null;

// ── Install & Activate ──────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Messages from app page ──────────────────────────────────────
self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SP_SW_INIT') {
    myUidCached = msg.uid || null;
    firebaseConfigCached = msg.firebaseConfig || null;
    if (myUidCached && firebaseConfigCached) {
      startBackgroundPolling();
    }
  }

  if (msg.type === 'SP_SW_STOP') {
    stopBackgroundPolling();
  }

  if (msg.type === 'SP_SW_UPDATE_UID') {
    myUidCached = msg.uid;
    if (!myUidCached) stopBackgroundPolling();
  }
});

// ── Background Polling Loop ─────────────────────────────────────
function startBackgroundPolling() {
  stopBackgroundPolling();
  pollNow();
  pollingTimer = setInterval(pollNow, POLL_INTERVAL_MS);
}

function stopBackgroundPolling() {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
}

async function pollNow() {
  if (!myUidCached || !firebaseConfigCached) return;

  // Check if any client tab is active and focused
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const hasVisibleClient = allClients.some(c => c.visibilityState === 'visible');
  // Only notify if no visible client — avoid double notification when app is open
  if (hasVisibleClient) return;

  try {
    const projectId = firebaseConfigCached.projectId;
    const apiKey = firebaseConfigCached.apiKey;

    // Query sp_calls where calleeUid == myUid and status == calling
    const callUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
    const callBody = {
      structuredQuery: {
        from: [{ collectionId: 'sp_calls' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'calleeUid' }, op: 'EQUAL', value: { stringValue: myUidCached } } },
              { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'calling' } } }
            ]
          }
        },
        limit: 1
      }
    };

    const res = await fetch(callUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callBody)
    });

    if (!res.ok) return;
    const results = await res.json();

    if (results && results[0] && results[0].document) {
      const doc = results[0].document;
      const fields = doc.fields || {};
      const callDocId = doc.name.split('/').pop();

      if (callDocId === lastSeenCallId) return; // Already notified for this call
      lastSeenCallId = callDocId;

      const callerName = fields.callerName?.stringValue || 'Creator';
      const isVideo = fields.isVideo?.booleanValue || false;
      const callerAv = fields.callerAv?.stringValue || '/logo_studios_pro.png';

      const notifTitle = isVideo
        ? `📹 Incoming Video Call from @${callerName}`
        : `📞 Incoming Voice Call from @${callerName}`;

      await self.registration.showNotification(notifTitle, {
        body: 'Tap here to answer in SP Nexus!',
        icon: callerAv,
        badge: '/logo_studios_pro.png',
        tag: 'sp-call-' + callDocId,
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 150, 400, 150, 600, 200, 600],
        data: { url: '/community/?call=true&chatId=' + callDocId }
      });
    } else {
      // No active call — reset so we can detect future calls
      lastSeenCallId = null;
    }
  } catch(e) {
    // Silent fail — network may be down
  }
}

// ── Push (from FCM server if configured) ───────────────────────
self.addEventListener('push', event => {
  let data = {
    title: '📞 Incoming Call — SP Nexus',
    body: 'Tap to answer!',
    icon: '/logo_studios_pro.png',
    url: '/community/'
  };
  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch(e) { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo_studios_pro.png',
      badge: '/logo_studios_pro.png',
      tag: data.tag || 'sp-nexus-push',
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 150, 300, 150, 500],
      data: { url: data.url || '/community/' }
    })
  );
});

// ── Notification Click ──────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url)
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
      return clients.openWindow(targetUrl);
    })
  );
});
