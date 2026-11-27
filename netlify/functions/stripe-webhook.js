/**
 * Stripe Authoritative Subscription Lifecycle Webhook
 * ===================================================
 * Endpoint: https://studios-pro.com/.netlify/functions/stripe-webhook
 * Env vars required: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT
 *
 * Handles:
 *  - checkout.session.completed  -> activates Pro + binds Stripe IDs + logs redeemed session
 *  - invoice.paid                -> extends premiumUntil on every monthly renewal
 *  - customer.subscription.deleted / invoice.payment_failed -> revokes Pro cleanly
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
  parseServiceAccount,
  fsListCollection,
  fsPatchDoc,
  fsCreateDoc,
  writeAuditLog,
} = require('./_firebase-admin');

async function findUidForStripeEvent(uidHint, customerId, subscriptionId, emailHint) {
  if (uidHint) return uidHint;
  const users = await fsListCollection('users', 500);
  if (subscriptionId) {
    const bySub = users.find((u) => u.stripeSubscriptionId === subscriptionId);
    if (bySub) return bySub.id;
  }
  if (customerId) {
    const byCust = users.find((u) => u.stripeCustomerId === customerId);
    if (byCust) return byCust.id;
  }
  if (emailHint) {
    const norm = emailHint.toLowerCase().trim();
    const byMail = users.find((u) => (u.email || '').toLowerCase().trim() === norm);
    if (byMail) return byMail.id;
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[StripeWebhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return { statusCode: 500, body: 'Webhook not configured' };
  }
  if (!parseServiceAccount()) {
    console.error('[StripeWebhook] Missing FIREBASE_SERVICE_ACCOUNT');
    return { statusCode: 500, body: 'Database admin credentials missing' };
  }

  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing Stripe-Signature header' };
  }

  let stripeEvent;
  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err.message);
    return { statusCode: 400, body: 'Webhook signature invalid' };
  }

  try {
    const type = stripeEvent.type;
    const obj = stripeEvent.data.object;

    if (type === 'checkout.session.completed' && obj.payment_status === 'paid') {
      const uid = await findUidForStripeEvent(
        obj.client_reference_id || (obj.metadata && obj.metadata.uid),
        typeof obj.customer === 'string' ? obj.customer : '',
        typeof obj.subscription === 'string' ? obj.subscription : '',
        obj.customer_details && obj.customer_details.email
      );
      if (uid) {
        const exp = new Date();
        exp.setDate(exp.getDate() + 35);
        await fsPatchDoc('users', uid, {
          isPremium: true,
          premiumUntil: exp.toISOString(),
          planType: 'stripe_monthly',
          subscriptionStatus: 'active',
          stripeSessionId: obj.id,
          stripeCustomerId: typeof obj.customer === 'string' ? obj.customer : '',
          stripeSubscriptionId: typeof obj.subscription === 'string' ? obj.subscription : '',
          updatedAt: new Date().toISOString(),
        });
        await fsCreateDoc('redeemed_sessions', obj.id, {
          uid,
          redeemedAt: new Date().toISOString(),
          source: 'webhook',
        });
        await writeAuditLog('webhook_checkout_completed', 'stripe', { uid, sessionId: obj.id });
      }
    } else if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') {
      const subId = typeof obj.subscription === 'string' ? obj.subscription : '';
      const custId = typeof obj.customer === 'string' ? obj.customer : '';
      const uid = await findUidForStripeEvent(
        obj.subscription_details && obj.subscription_details.metadata && obj.subscription_details.metadata.uid,
        custId,
        subId,
        obj.customer_email
      );
      if (uid) {
        const periodEndSec = (obj.lines && obj.lines.data && obj.lines.data[0] && obj.lines.data[0].period && obj.lines.data[0].period.end) || null;
        const exp = periodEndSec ? new Date((periodEndSec + 3 * 86400) * 1000) : new Date(Date.now() + 35 * 86400 * 1000);
        await fsPatchDoc('users', uid, {
          isPremium: true,
          premiumUntil: exp.toISOString(),
          subscriptionStatus: 'active',
          stripeCustomerId: custId,
          stripeSubscriptionId: subId,
          updatedAt: new Date().toISOString(),
        });
        await writeAuditLog('webhook_invoice_paid', 'stripe', { uid, subId, premiumUntil: exp.toISOString() });
      }
    } else if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
      const subId = type === 'customer.subscription.deleted' ? obj.id : (typeof obj.subscription === 'string' ? obj.subscription : '');
      const custId = typeof obj.customer === 'string' ? obj.customer : '';
      const uid = await findUidForStripeEvent(
        obj.metadata && obj.metadata.uid,
        custId,
        subId,
        obj.customer_email
      );
      if (uid) {
        await fsPatchDoc('users', uid, {
          isPremium: false,
          premiumUntil: null,
          subscriptionStatus: type === 'customer.subscription.deleted' ? 'canceled' : 'past_due',
          updatedAt: new Date().toISOString(),
        });
        await writeAuditLog(`webhook_${type}`, 'stripe', { uid, subId });
      }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[StripeWebhook] Handler error:', err.message);
    return { statusCode: 500, body: 'Webhook processing failed' };
  }
};
