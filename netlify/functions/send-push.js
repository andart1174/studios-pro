// ═══════════════════════════════════════════════════════════════
// 📞 SP NEXUS – FCM PUSH NOTIFICATION (Netlify Function)
// Uses Firebase Cloud Messaging HTTP API — most reliable for Android
// ═══════════════════════════════════════════════════════════════

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || '';
const FCM_LEGACY_URL = 'https://fcm.googleapis.com/fcm/send';

// Fallback: web-push for browsers that don't support FCM
const webpush = require('web-push');
const VAPID_PUBLIC_KEY  = 'BOT1swSZfG17hNyhMVepjZqHt6eGAr2zQmr0CHa9JBbJETi_6-FdLNrlVhPNzTEo9Dvyb1jPL6eoZTgdfyTFPzk';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gt_fRAb9c6LYB0TXg4VlmhhqCpAfEUzzmneSwUz7Rb0';

webpush.setVapidDetails('mailto:andart1174@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { fcmToken, subscription, payload } = body;

    const title = payload?.title || '📞 SP Nexus — Incoming Call';
    const bodyText = payload?.body || 'Tap to answer!';
    const icon = payload?.icon || '/logo_studios_pro.png';
    const url = payload?.url || '/community/?call=true';
    const tag = payload?.tag || 'sp-call';

    // ── Method 1: FCM (most reliable on Android Chrome) ──────────
    if (fcmToken && FCM_SERVER_KEY) {
      const fcmPayload = {
        to: fcmToken,
        priority: 'high',
        notification: {
          title,
          body: bodyText,
          icon,
          badge: '/logo_studios_pro.png',
          tag,
          click_action: url,
          require_interaction: true,
          vibrate: [400, 150, 400, 150, 600]
        },
        data: {
          title,
          body: bodyText,
          icon,
          url,
          tag
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title,
            body: bodyText,
            icon,
            badge: '/logo_studios_pro.png',
            requireInteraction: true,
            vibrate: [400, 150, 400, 150, 600]
          },
          fcm_options: { link: url }
        }
      };

      const fcmRes = await fetch(FCM_LEGACY_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'key=' + FCM_SERVER_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      });

      const fcmJson = await fcmRes.json();
      if (fcmJson.success === 1) {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, method: 'fcm' }) };
      }
      console.warn('[FCM] Send failed:', JSON.stringify(fcmJson));
    }

    // ── Method 2: Raw Web Push fallback ──────────────────────────
    if (subscription && subscription.endpoint) {
      const notifPayload = JSON.stringify({ title, body: bodyText, icon, badge: '/logo_studios_pro.png', url, tag, requireInteraction: true, vibrate: [400, 150, 400] });
      await webpush.sendNotification(subscription, notifPayload);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, method: 'webpush' }) };
    }

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No valid token or subscription provided' }) };

  } catch (err) {
    console.error('Push send error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
