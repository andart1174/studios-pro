const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
  getCorsHeaders,
  verifyFirebaseIdToken,
  parseServiceAccount,
  fsGetDoc,
  fsCreateDoc,
  fsPatchDoc,
  writeAuditLog,
} = require('./_firebase-admin');

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ verified: false, error: 'Method Not Allowed' }),
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ verified: false, error: 'Payment verification unavailable' }),
      };
    }

    // Require authenticated Firebase user so paid sessions cannot be replayed or probed anonymously
    const auth = await verifyFirebaseIdToken(event);
    if (!auth.ok) {
      return {
        statusCode: auth.status || 401,
        headers,
        body: JSON.stringify({ verified: false, error: 'Sign in required to verify payment' }),
      };
    }

    const { sessionId } = JSON.parse(event.body || '{}');
    if (!sessionId || typeof sessionId !== 'string' || !/^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ verified: false, error: 'Invalid Stripe session ID' }),
      };
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.payment_status !== 'paid' || session.mode !== 'subscription') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          payment_status: session ? session.payment_status : 'unknown',
          error: 'Payment has not been completed',
        }),
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const createdSec = session.created || nowSec;
    if (nowSec - createdSec > 86400) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ verified: false, error: 'Checkout session expired' }),
      };
    }

    // Enforce UID ownership when session was bound at checkout time
    if (session.client_reference_id && session.client_reference_id !== auth.uid) {
      console.warn(`[Verify-Session] UID mismatch: token=${auth.uid} session=${session.client_reference_id}`);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ verified: false, error: 'This checkout session belongs to another account' }),
      };
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 35); // 30-day cycle + 5-day renewal buffer
    const premiumUntil = expiryDate.toISOString();

    // Prevent cross-account session replay & grant Pro strictly server-side
    if (parseServiceAccount()) {
      const existing = await fsGetDoc('redeemed_sessions', session.id);
      if (existing && existing.uid && existing.uid !== auth.uid) {
        console.warn(`[Verify-Session] Replay blocked: session=${session.id} already redeemed by ${existing.uid}`);
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ verified: false, error: 'This checkout session has already been redeemed' }),
        };
      }

      if (!existing) {
        await fsCreateDoc('redeemed_sessions', session.id, {
          uid: auth.uid,
          email: auth.email || '',
          redeemedAt: new Date().toISOString(),
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : '',
        });
      }

      await fsPatchDoc('users', auth.uid, {
        email: auth.email || '',
        isPremium: true,
        premiumUntil,
        planType: 'stripe_monthly',
        subscriptionStatus: 'active',
        stripeSessionId: session.id,
        stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : '',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : '',
        updatedAt: new Date().toISOString(),
      });

      await writeAuditLog('stripe_session_verified', auth.email || auth.uid, {
        uid: auth.uid,
        sessionId: session.id,
        premiumUntil,
      });
    }

    // Never expose customer_email or internal fields publicly
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified: true,
        payment_status: session.payment_status,
        mode: session.mode,
        premiumUntil,
      }),
    };
  } catch (error) {
    console.error('[Verify-Session] Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ verified: false, error: 'Verification error. Please contact support.' }),
    };
  }
};
