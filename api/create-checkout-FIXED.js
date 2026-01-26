// api/create-checkout.js
// FIXED VERSION - Uses correct Clover Ecommerce API

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get order data from checkout page
  const { orderData } = req.body;

  // Validate order
  if (!orderData || !orderData.totals || orderData.totals.total <= 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  // Get Clover credentials from environment variables
  const CLOVER_API_KEY = process.env.CLOVER_API_KEY;
  const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

  if (!CLOVER_API_KEY || !CLOVER_MERCHANT_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get the return URL dynamically
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const returnUrl = `${protocol}://${host}/order-confirmation.html`;

    console.log('Creating Clover order for:', orderData.orderNumber);
    console.log('Amount:', orderData.totals.total);

    // Call Clover Ecommerce API (correct endpoint for hosted checkout)
    const cloverResponse = await fetch(
      `https://api.clover.com/v1/orders`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOVER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Clover-Merchant-Id': CLOVER_MERCHANT_ID
        },
        body: JSON.stringify({
          currency: 'usd',
          total: Math.round(orderData.totals.total * 100), // Convert to cents
          taxAmount: 0,
          note: `Order ${orderData.orderNumber}`,
          state: 'open',
          manualTransaction: false,
          groupLineItems: false,
          testMode: false
        })
      }
    );

    const responseText = await cloverResponse.text();
    console.log('Clover response status:', cloverResponse.status);
    console.log('Clover response:', responseText);

    if (!cloverResponse.ok) {
      console.error('Clover API error:', responseText);
      throw new Error(`Clover API returned ${cloverResponse.status}: ${responseText}`);
    }

    const cloverOrder = JSON.parse(responseText);

    // Create a checkout link for the order
    const checkoutUrl = `https://www.clover.com/online-checkout/${CLOVER_MERCHANT_ID}/${cloverOrder.id}`;

    console.log('Checkout URL created:', checkoutUrl);

    // Return checkout URL to browser
    return res.status(200).json({ 
      checkoutUrl: checkoutUrl,
      orderId: cloverOrder.id
    });

  } catch (error) {
    console.error('Error creating checkout:', error.message);
    return res.status(500).json({ 
      error: 'Failed to create payment session',
      details: error.message
    });
  }
}
