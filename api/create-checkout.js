// api/create-checkout.js
// Vercel Serverless Function for Clover Hosted Checkout
// FIXED: Using correct production endpoint

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
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

    const CLOVER_API_KEY = process.env.CLOVER_API_KEY;
    const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

    if (!CLOVER_API_KEY || !CLOVER_MERCHANT_ID) {
        console.error('Missing Clover credentials');
        return res.status(500).json({ error: 'Server configuration error - missing credentials' });
    }

    try {
        console.log('=== Clover Checkout Request ===');
        console.log('Order Number:', orderData.orderNumber);
        console.log('Merchant ID:', CLOVER_MERCHANT_ID);
        console.log('Total Amount:', orderData.totals.total);

        // Parse customer name
        const nameParts = orderData.customer.fullName ? orderData.customer.fullName.split(' ') : ['Customer'];
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';

        // Build line items (prices in cents)
        const lineItems = orderData.items.map(item => ({
            name: item.name,
            price: Math.round(item.price * 100), // Convert to cents
            unitQty: item.quantity
        }));

        // Build checkout request payload
        const checkoutPayload = {
            customer: {
                email: orderData.customer.email,
                firstName: firstName,
                lastName: lastName,
                phoneNumber: orderData.customer.phone || ''
            },
            shoppingCart: {
                lineItems: lineItems
            },
            redirectUrls: {
                success: 'https://park-avenue-bakery.vercel.app/order-confirmation.html',
                failure: 'https://park-avenue-bakery.vercel.app/checkout.html?error=payment_failed',
                cancel: 'https://park-avenue-bakery.vercel.app/checkout.html?error=payment_cancelled'
            }
        };

        console.log('Checkout Payload:', JSON.stringify(checkoutPayload, null, 2));

        // CORRECT PRODUCTION ENDPOINT
        const CLOVER_CHECKOUT_URL = 'https://www.clover.com/invoicingcheckoutservice/v1/checkouts';

        console.log('Calling Clover API:', CLOVER_CHECKOUT_URL);

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
        console.log('Clover Response Status:', cloverResponse.status);
        console.log('Clover Response Body:', responseText);

        if (!cloverResponse.ok) {
            console.error('Clover API Error:', cloverResponse.status, responseText);
            
            // Try to parse error details
            let errorMessage = `Clover API returned ${cloverResponse.status}`;
            try {
                const errorData = JSON.parse(responseText);
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }

            return res.status(cloverResponse.status).json({
                error: 'Payment service error',
                details: errorMessage,
                status: cloverResponse.status
            });
        }

        // Parse successful response
        const checkoutData = JSON.parse(responseText);
        
        console.log('Checkout Session Created:', checkoutData.checkoutSessionId);
        console.log('Checkout URL:', checkoutData.href);

        if (!checkoutData.href) {
            console.error('No checkout URL in response:', checkoutData);
            return res.status(500).json({
                error: 'Invalid response from payment service',
                details: 'No checkout URL returned'
            });
        }

        // Return the checkout URL
        return res.status(200).json({
            checkoutUrl: checkoutData.href,
            sessionId: checkoutData.checkoutSessionId,
            expirationTime: checkoutData.expirationTime
        });

    } catch (error) {
        console.error('Server Error:', error.message);
        console.error('Stack:', error.stack);
        
        return res.status(500).json({
            error: 'Failed to create payment session',
            details: error.message
        });
    }
}
