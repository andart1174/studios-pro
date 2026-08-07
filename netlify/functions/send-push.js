// ═══════════════════════════════════════════════════════════════
// 📞 SP NEXUS – FCM HTTP v1 PUSH NOTIFICATION (Netlify Function)
// Uses Firebase Cloud Messaging HTTP v1 API (legacy is disabled)
// ═══════════════════════════════════════════════════════════════

const webpush = require('web-push');

const VAPID_PUBLIC_KEY  = 'BB4NZz68GILkyhZABHbtLoxzr9OtLK7kGArDbSLjONJc3uMPJUk3N5awDPGIU1QEGIY-a4zH27JDX_Q_qNdp0fQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gt_fRAb9c6LYB0TXg4VlmhhqCpAfEUzzmneSwUz7Rb0';
const FCM_PROJECT_ID    = 'studios-pro';
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT || null;

webpush.setVapidDetails('mailto:andart1174@gmail.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Get OAuth2 access token from service account for FCM v1 API
async function getFCMAccessToken(serviceAccountJson) {
  try {
    const sa = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // Simple JWT signing (using Node.js crypto)
    const crypto = require('crypto');
    const encode = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signingInput = encode(header) + '.' + encode(claim);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(sa.private_key, 'base64url');
    const jwt = signingInput + '.' + signature;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
    });
    const data = await res.json();
    return data.access_token || null;
  } catch(e) {
    console.warn('getFCMAccessToken error:', e.message);
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { fcmToken, subscription, payload } = body;

    const title   = payload?.title || '📞 SP Nexus — Incoming Call';
    const bodyTxt = payload?.body  || 'Tap to answer!';
    const icon    = payload?.icon  || '/logo_studios_pro.png';
    const url     = payload?.url   || '/community/?call=true';
    const tag     = payload?.tag   || 'sp-call';

    // ── Method 1: FCM HTTP v1 API (requires Service Account) ──────
    if (fcmToken && FIREBASE_SERVICE_ACCOUNT) {
      const accessToken = await getFCMAccessToken(FIREBASE_SERVICE_ACCOUNT);
      if (accessToken) {
        const fcmV1Url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
        const message = {
          message: {
            token: fcmToken,
            notification: { title, body: bodyTxt },
            webpush: {
              headers: { Urgency: 'high' },
              notification: {
                title, body: bodyTxt, icon,
                badge: '/logo_studios_pro.png',
                requireInteraction: true,
                vibrate: [400, 150, 400, 150, 600],
                tag
              },
              fcm_options: { link: url }
            },
            data: { title, body: bodyTxt, icon, url, tag }
          }
        };

        const fcmRes = await fetch(fcmV1Url, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });

        if (fcmRes.ok) {
          return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, method: 'fcm_v1' }) };
        }
        const errJson = await fcmRes.json().catch(() => ({}));
        console.warn('[FCM v1] Failed:', JSON.stringify(errJson));
      }
    }

    // ── Method 2: Raw Web Push (VAPID) ───────────────────────────
    if (subscription && subscription.endpoint) {
      const notifPayload = JSON.stringify({
        title, body: bodyTxt, icon,
        badge: '/logo_studios_pro.png',
        url, tag,
        requireInteraction: true,
        vibrate: [400, 150, 400, 150, 600]
      });
      await webpush.sendNotification(subscription, notifPayload);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ ok: true, method: 'webpush' }) };
    }

    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'No valid token or subscription' }) };

  } catch (err) {
    console.error('Push error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
