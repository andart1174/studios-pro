const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const {
  resolveTrustedOrigin,
  getCorsHeaders,
  verifyFirebaseIdToken,
} = require('./_firebase-admin');

exports.handler = async (event) => {
  const headers = getCorsHeaders(event);
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Payment service unavailable' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { origin, refStudio } = body;

    // Bind checkout session to verified Firebase user when authenticated
    const auth = await verifyFirebaseIdToken(event);
    const verifiedUid = auth.ok ? auth.uid : null;
    const verifiedEmail = auth.ok && auth.email ? auth.email : undefined;

    // Never allow fake placeholder emails like customer@example.com
    const rawEmail = (!verifiedEmail && typeof body.email === 'string' && body.email.includes('@') && !body.email.endsWith('@example.com'))
      ? body.email.trim().toLowerCase()
      : undefined;

    const baseUrl = resolveTrustedOrigin(origin || event.headers.origin || event.headers.Origin);
    let successParams = `?payment_success=true&type=premium&session_id={CHECKOUT_SESSION_ID}`;
    const safeRef = refStudio ? String(refStudio).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : '';
    if (safeRef) successParams += `&ref=${encodeURIComponent(safeRef)}`;

    const sessionConfig = {
      payment_method_types: ['card'],
      customer_email: verifiedEmail || rawEmail || undefined,
      client_reference_id: verifiedUid || undefined,
      metadata: verifiedUid ? { uid: verifiedUid, email: verifiedEmail || '' } : {},
      mode: 'subscription',
      subscription_data: verifiedUid ? { metadata: { uid: verifiedUid, email: verifiedEmail || '' } } : undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Studios-Pro Premium (Unlimited Access)' },
          unit_amount: 1000,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/${successParams}`,
      cancel_url: `${baseUrl}/?payment_cancel=true`,
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error) {
    console.error('[Create-Checkout] Stripe Error:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unable to initialize checkout session. Please try again.' }),
    };
  }
};
