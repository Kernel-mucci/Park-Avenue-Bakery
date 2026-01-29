// api/create-checkout.js
// Vercel Serverless Function for Clover Hosted Checkout

// Server-side price catalog to prevent client-side price tampering
const PRICE_CATALOG = {
    // Test item (keep for testing)
    'test-1': 0.50,

    // Breads
    'bread-1': 7.75,   // 7 Grain Pan Loaf
    'bread-2': 4.00,   // Baguette
    'bread-3': 7.50,   // Big Sky Country Loaf
    'bread-4': 8.25,   // Blackfoot
    'bread-5': 5.50,   // Boules
    'bread-6': 4.00,   // Ciabatta
    'bread-7': 9.25,   // Cranberry Wild Rice
    'bread-8': 2.50,   // Demi Baguette
    'bread-9': 4.00,   // Epi
    'bread-10': 1.00,  // Ficelli
    'bread-11': 6.50,  // Focaccia
    'bread-12': 7.25,  // French Pan Loaf
    'bread-13': 9.25,  // Golden Raisin Pecan
    'bread-14': 5.50,  // Jocko
    'bread-15': 1.25,  // Mini Ciabatta
    'bread-16': 8.50,  // Norwegian Farm
    'bread-17': 7.50,  // Old World Italian
    'bread-18': 5.50,  // Pizza Dough
    'bread-19': 7.45,  // Potato Rolls (6-pack)
    'bread-20': 8.25,  // Rustic Multigrain
    'bread-21': 8.00,  // Sourdough
    'bread-22': 8.00,  // Sourdough Rustic Loaf

    // Bars
    'bar-1': 4.50,     // Flourless Brownies
    'bar-2': 4.50,     // Lemon Bars
    'bar-3': 4.50,     // Chocolate Chip Peanut Butter Bar
    'bar-4': 4.00,     // Pumpkin Bars
    'bar-5': 4.00,     // Raspberry Crumble Bars
    'bar-6': 4.50,     // Revel Bars
    'bar-7': 4.50,     // Salted Caramel Bars
    'bar-8': 4.50,     // Samoa Bars
    'bar-9': 4.50,     // Truffle Brownies
    'bar-10': 4.50,    // Turtle Brownie

    // Cookies
    'cookie-1': 2.75,  // Brown Butter Chocolate Chip Cookie
    'cookie-2': 3.00,  // Carrot Coconut Cookie
    'cookie-3': 2.50,  // Coconut Oatmeal Cookie
    'cookie-4': 2.75,  // Flourless Peanut Butter Chocolate Chip
    'cookie-5': 2.50,  // Molasses Cookie
    'cookie-6': 2.75,  // Monster Cookie
    'cookie-7': 2.50,  // Peanut Butter Cookie
    'cookie-8': 2.50,  // Snickerdoodle
    'cookie-9': 3.50   // Sugar Cookies - Assorted
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

        // Build pickup note for Clover order
        const pickupDate = orderData.customer.pickupDate || '';
        const pickupTime = orderData.customer.pickupTime || '';
        const customerNotes = orderData.customer.notes || '';

        let orderNote = '';
        if (pickupDate && pickupTime) {
            orderNote = `Pickup: ${pickupDate} at ${pickupTime}`;
        }
        if (customerNotes) {
            orderNote += orderNote ? ` | Notes: ${customerNotes}` : `Notes: ${customerNotes}`;
        }

        // Add a hidden $0 line item with pickup info (Clover doesn't persist shoppingCart.note)
        // This ensures pickup info is stored with the order and visible in dashboard
        if (pickupDate && pickupTime) {
            lineItems.push({
                name: `[PICKUP: ${pickupDate} @ ${pickupTime}]`,
                price: 0,
                unitQty: 1
            });
        }

        // Build checkout request payload
        const checkoutPayload = {
            customer: {
                email: String(orderData.customer.email),
                firstName: firstName,
                lastName: lastName,
                phoneNumber: String(orderData.customer.phone || '')
            },
            shoppingCart: {
                lineItems: lineItems,
                note: orderNote || undefined
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
