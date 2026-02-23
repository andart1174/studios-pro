const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { priceType, email } = JSON.parse(event.body);

        let sessionConfig = {
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [],
            mode: '',
            success_url: `${process.env.URL}/?payment_success=true`,
            cancel_url: `${process.env.URL}/?payment_cancel=true`,
        };

        if (priceType === 'premium') {
            // 35$ Subscription
            sessionConfig.mode = 'subscription';
            sessionConfig.line_items = [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Studios-Pro Premium' },
                    unit_amount: 3500,
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }];
        } else {
            // 2$ One-time Export
            sessionConfig.mode = 'payment';
            sessionConfig.line_items = [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Single Export - Studios-Pro' },
                    unit_amount: 200,
                },
                quantity: 1,
            }];
        }

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
