// ═══════════════════════════════════════════════════════════════
// 📞 SP NEXUS – WEB PUSH SEND NOTIFICATION (Netlify Function)
// Sends a Web Push notification to a subscriber when called
// ═══════════════════════════════════════════════════════════════
const webpush = require('web-push');

const VAPID_PUBLIC_KEY  = 'BOT1swSZfG17hNyhMVepjZqHt6eGAr2zQmr0CHa9JBbJETi_6-FdLNrlVhPNzTEo9Dvyb1jPL6eoZTgdfyTFPzk';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gt_fRAb9c6LYB0TXg4VlmhhqCpAfEUzzmneSwUz7Rb0';

webpush.setVapidDetails(
  'mailto:andart1174@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  // Allow CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { subscription, payload } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing subscription' }) };
    }

    const notifPayload = JSON.stringify({
      title: payload?.title || '📞 Incoming Call — SP Nexus',
      body:  payload?.body  || 'Tap to answer!',
      icon:  payload?.icon  || '/logo_studios_pro.png',
      badge: '/logo_studios_pro.png',
      url:   payload?.url   || '/community/?call=true',
      tag:   payload?.tag   || 'sp-call',
      vibrate: [400, 150, 400, 150, 600],
      requireInteraction: true
    });

    await webpush.sendNotification(subscription, notifPayload);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Web Push send error:', err);
    return {
      statusCode: err.statusCode || 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Push failed' })
    };
  }
};
