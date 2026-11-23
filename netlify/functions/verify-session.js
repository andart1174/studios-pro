const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ verified: false, error: 'Method Not Allowed' })
    };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Verify-Session] STRIPE_SECRET_KEY is not configured.');
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ verified: false, error: 'Stripe secret key missing on server' })
      };
    }

    const { sessionId } = JSON.parse(event.body || '{}');

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      console.warn('[Verify-Session] Invalid sessionId format rejected:', sessionId);
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ verified: false, error: 'Invalid or missing Stripe session ID' })
      };
    }

    // Retrieve the verified checkout session directly from Stripe API
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session && session.payment_status === 'paid' && session.mode === 'subscription') {
      const nowSec = Math.floor(Date.now() / 1000);
      const createdSec = session.created || nowSec;
      // Reject replay of old checkout sessions (> 24 hours old)
      if (nowSec - createdSec > 86400) {
        console.warn(`[Verify-Session] Rejected expired session replay (${nowSec - createdSec}s old):`, session.id);
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            verified: false,
            error: 'Checkout session expired (older than 24 hours)'
          })
        };
      }

      console.log(`[Verify-Session] Successfully verified subscription session: ${session.id}`);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          verified: true,
          payment_status: session.payment_status,
          mode: session.mode,
          created: createdSec,
          customer_email: session.customer_details ? session.customer_details.email : null,
          amount_total: session.amount_total
        })
      };
    }

    console.warn(`[Verify-Session] Session ${sessionId} status is not paid:`, session ? session.payment_status : 'not found');
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        verified: false,
        payment_status: session ? session.payment_status : 'unknown',
        error: 'Payment has not been completed or verified'
      })
    };
  } catch (error) {
    console.error('[Verify-Session] Error retrieving Stripe session:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ verified: false, error: error.message })
    };
  }
};
