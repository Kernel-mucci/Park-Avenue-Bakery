// api/create-checkout.js
// Version 3 - Uses correct Clover invoicing checkout service

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderData } = req.body;

  if (!orderData || !orderData.totals || orderData.totals.total <= 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  const CLOVER_API_KEY = process.env.CLOVER_API_KEY;
  const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

  if (!CLOVER_API_KEY || !CLOVER_MERCHANT_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log('Creating Clover checkout for order:', orderData.orderNumber);
    console.log('Amount:', orderData.totals.total);
    console.log('Merchant ID:', CLOVER_MERCHANT_ID);

    // Build the checkout request
    const checkoutRequest = {
      customer: {
        email: orderData.customer.email,
        firstName: orderData.customer.fullName.split(' ')[0],
        lastName: orderData.customer.fullName.split(' ').slice(1).join(' ') || orderData.customer.fullName
      },
      shoppingCart: {
        lineItems: orderData.items.map(item => ({
          name: item.name,
          price: Math.round(item.price * 100), // Convert to cents
          unitQty: item.quantity
        }))
      }
    };

    console.log('Checkout request:', JSON.stringify(checkoutRequest, null, 2));

    // Call Clover's invoicing checkout service
    const cloverResponse = await fetch(
      `https://checkout.clover.com/invoicingcheckoutservice/v1/checkouts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOVER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Clover-Merchant-Id': CLOVER_MERCHANT_ID
        },
        body: JSON.stringify(checkoutRequest)
      }
    );

    const responseText = await cloverResponse.text();
    console.log('Clover response status:', cloverResponse.status);
    console.log('Clover response:', responseText);

    if (!cloverResponse.ok) {
      console.error('Clover API error:', responseText);
      throw new Error(`Clover API returned ${cloverResponse.status}: ${responseText}`);
    }

    const checkoutData = JSON.parse(responseText);
    
    // Clover returns an href field with the checkout URL
    const checkoutUrl = checkoutData.href;

    if (!checkoutUrl) {
      throw new Error('No checkout URL returned from Clover');
    }

    console.log('Checkout URL generated:', checkoutUrl);

    return res.status(200).json({ 
      checkoutUrl: checkoutUrl
    });

  } catch (error) {
    console.error('Error creating checkout:', error.message);
    return res.status(500).json({ 
      error: 'Failed to create payment session',
      details: error.message
    });
  }
}
