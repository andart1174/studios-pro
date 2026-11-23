const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

function resolveTrustedOrigin(originHeader) {
    const fallback = process.env.SITE_URL || 'https://studios-pro.com';
    if (!originHeader || typeof originHeader !== 'string') return fallback;
    try {
        const u = new URL(originHeader);
        const host = u.hostname.toLowerCase();
        if (
            host === 'studios-pro.com' ||
            host === 'www.studios-pro.com' ||
            host.endsWith('.netlify.app') ||
            host === 'localhost' ||
            host === '127.0.0.1'
        ) {
            return `${u.protocol}//${u.host}`;
        }
    } catch (_) {}
    return fallback;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { email, origin, refStudio } = JSON.parse(event.body || '{}');

        const baseUrl = resolveTrustedOrigin(origin);
        let successParams = `?payment_success=true&type=premium&session_id={CHECKOUT_SESSION_ID}`;
        const safeRef = refStudio ? String(refStudio).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : '';
        if (safeRef) successParams += `&ref=${safeRef}`;

        const sessionConfig = {
            payment_method_types: ['card'],
            customer_email: email && typeof email === 'string' && email.includes('@') ? email : undefined,
            mode: 'subscription',
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
            body: JSON.stringify({ id: session.id, url: session.url }),
        };
    } catch (error) {
        console.error('Stripe Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
