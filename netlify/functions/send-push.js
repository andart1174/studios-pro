/**
 * Hardened Push Notification Endpoint (Admin-Authenticated + SSRF-Protected)
 * Replaces previously unauthenticated open FCM/WebPush relay.
 */

const webpush = require('web-push');
const {
  getCorsHeaders,
  requireAdmin,
  getProjectId,
  getServiceAccountAccessToken,
  parseServiceAccount,
} = require('./_firebase-admin');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:andart1174@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  'notify.windows.com',
];

function isTrustedPushEndpoint(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return ALLOWED_PUSH_HOSTS.some((allowed) => h === allowed || h.endsWith(`.${allowed}`));
  } catch (_) {
    return false;
  }
}

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Require verified Admin Firebase token (closes anonymous spam/SSRF vector)
  const auth = await requireAdmin(event);
  if (!auth.ok) {
    return { statusCode: auth.status || 401, headers, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { fcmToken, subscription, payload } = body;

    const title = String(payload?.title || 'Studios-Pro Notification').slice(0, 120);
    const bodyTxt = String(payload?.body || '').slice(0, 300);
    const icon = '/logo_studios_pro.png';
    const url = typeof payload?.url === 'string' && payload.url.startsWith('/') ? payload.url : '/';
    const tag = String(payload?.tag || 'sp-notif').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

    if (fcmToken && typeof fcmToken === 'string' && parseServiceAccount()) {
      const accessToken = await getServiceAccountAccessToken('https://www.googleapis.com/auth/firebase.messaging');
      if (accessToken) {
        const fcmRes = await fetch(
          `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(getProjectId())}/messages:send`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: {
                token: fcmToken,
                notification: { title, body: bodyTxt },
                webpush: { notification: { title, body: bodyTxt, icon, tag }, fcm_options: { link: url } },
              },
            }),
          }
        );
        if (fcmRes.ok) {
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, method: 'fcm_v1' }) };
        }
      }
    }

    if (subscription && subscription.endpoint && VAPID_PRIVATE_KEY) {
      if (!isTrustedPushEndpoint(subscription.endpoint)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Untrusted push endpoint' }) };
      }
      await webpush.sendNotification(subscription, JSON.stringify({ title, body: bodyTxt, icon, url, tag }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, method: 'webpush' }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No valid token or subscription' }) };
  } catch (err) {
    console.error('[Send-Push] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Notification delivery failed' }) };
  }
};
