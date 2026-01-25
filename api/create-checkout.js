// api/create-checkout.js
// This handles payment creation securely

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
    // Call Clover API to create checkout session
    const cloverResponse = await fetch('https://api.clover.com/v3/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOVER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        merchantId: CLOVER_MERCHANT_ID,
        amount: Math.round(orderData.totals.total * 100), // Convert to cents
        currency: 'usd',
        customer: {
          email: orderData.customer.email,
          firstName: orderData.customer.fullName.split(' ')[0],
          lastName: orderData.customer.fullName.split(' ').slice(1).join(' ') || ''
        },
        metadata: {
          orderNumber: orderData.orderNumber,
          pickupDate: orderData.customer.pickupDate,
          pickupTime: orderData.customer.pickupTime,
          items: JSON.stringify(orderData.items)
        }
      })
    });

    if (!cloverResponse.ok) {
      const errorData = await cloverResponse.json();
      console.error('Clover API error:', errorData);
      throw new Error('Clover payment setup failed');
    }

    const cloverData = await cloverResponse.json();

    // Return checkout URL to browser
    return res.status(200).json({ 
      checkoutUrl: cloverData.url
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    return res.status(500).json({ 
      error: 'Failed to create payment session'
    });
  }
}
