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

    if (session && session.payment_status === 'paid') {
      console.log(`[Verify-Session] Successfully verified session: ${session.id} (mode: ${session.mode})`);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          verified: true,
          payment_status: session.payment_status,
          mode: session.mode,
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
