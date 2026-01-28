// api/create-checkout.js
// Vercel Serverless Function for Clover Hosted Checkout

// Server-side price catalog to prevent client-side price tampering
const PRICE_CATALOG = {
    'test-1': 0.50,
    '1': 8.50,
    '2': 4.50,
    '3': 7.50,
    '4': 5.00,
    '5': 6.50,
    '6': 10.50
};

export default async function handler(req, res) {
    // Restrict CORS to the production domain (set ALLOWED_ORIGIN in Vercel env vars)
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://park-avenue-bakery.vercel.app';
    const requestOrigin = req.headers.origin;

    if (requestOrigin === allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderData } = req.body;

    // Validate order data
    if (!orderData || !orderData.totals || orderData.totals.total <= 0) {
        return res.status(400).json({ error: 'Invalid order data' });
    }

    if (!orderData.customer || !orderData.customer.email) {
        return res.status(400).json({ error: 'Customer email is required' });
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    const CLOVER_API_KEY = process.env.CLOVER_API_KEY;
    const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

    if (!CLOVER_API_KEY || !CLOVER_MERCHANT_ID) {
        console.error('Missing Clover credentials');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // Validate and enforce server-side prices for each item
        const lineItems = [];
        let computedSubtotal = 0;

        for (const item of orderData.items) {
            if (!item.id || !item.name || !item.quantity) {
                return res.status(400).json({ error: 'Invalid item in order' });
            }

            const quantity = Math.floor(Number(item.quantity));
            if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
                return res.status(400).json({ error: `Invalid quantity for item: ${item.name}` });
            }

            // Enforce server-side price from catalog
            const serverPrice = PRICE_CATALOG[String(item.id)];
            if (serverPrice === undefined) {
                return res.status(400).json({ error: `Unknown item: ${item.name}` });
            }

            computedSubtotal += serverPrice * quantity;

            lineItems.push({
                name: String(item.name).substring(0, 127),
                price: Math.round(serverPrice * 100), // Convert to cents
                unitQty: quantity
            });
        }

        // Parse customer name
        const nameParts = orderData.customer.fullName ? String(orderData.customer.fullName).split(' ') : ['Customer'];
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        // Build redirect URLs from environment or default
        const siteUrl = process.env.SITE_URL || 'https://park-avenue-bakery.vercel.app';

        // Build checkout request payload
        const checkoutPayload = {
            customer: {
                email: String(orderData.customer.email),
                firstName: firstName,
                lastName: lastName,
                phoneNumber: String(orderData.customer.phone || '')
            },
            shoppingCart: {
                lineItems: lineItems
            },
            redirectUrls: {
                success: `${siteUrl}/order-confirmation.html`,
                failure: `${siteUrl}/checkout.html?error=payment_failed`,
                cancel: `${siteUrl}/checkout.html?error=payment_cancelled`
            }
        };

        // CORRECT PRODUCTION ENDPOINT
        const CLOVER_CHECKOUT_URL = 'https://www.clover.com/invoicingcheckoutservice/v1/checkouts';

        const cloverResponse = await fetch(CLOVER_CHECKOUT_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOVER_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Clover-Merchant-Id': CLOVER_MERCHANT_ID
            },
            body: JSON.stringify(checkoutPayload)
        });

        const responseText = await cloverResponse.text();

        if (!cloverResponse.ok) {
            console.error('Clover API Error:', cloverResponse.status);
            return res.status(502).json({
                error: 'Payment service is temporarily unavailable. Please try again.'
            });
        }

        // Parse successful response
        const checkoutData = JSON.parse(responseText);

        if (!checkoutData.href) {
            console.error('No checkout URL in Clover response');
            return res.status(502).json({
                error: 'Payment service returned an invalid response. Please try again.'
            });
        }

        // Return the checkout URL
        return res.status(200).json({
            checkoutUrl: checkoutData.href,
            sessionId: checkoutData.checkoutSessionId,
            expirationTime: checkoutData.expirationTime
        });

    } catch (error) {
        console.error('Checkout error:', error.message);
        return res.status(500).json({
            error: 'Unable to create payment session. Please try again or contact us at (406) 449-8424.'
        });
    }
}
