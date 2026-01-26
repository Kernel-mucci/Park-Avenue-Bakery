// api/create-checkout.js
// Version 2 - Direct redirect to Clover checkout (simplest approach)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderData } = req.body;

  if (!orderData || !orderData.totals || orderData.totals.total <= 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  const CLOVER_MERCHANT_ID = process.env.CLOVER_MERCHANT_ID;

  if (!CLOVER_MERCHANT_ID) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log('Creating checkout link for order:', orderData.orderNumber);
    console.log('Amount:', orderData.totals.total);

    // Build Clover's hosted checkout URL with parameters
    // This is Clover's simple checkout link format
    const amountInCents = Math.round(orderData.totals.total * 100);
    
    const checkoutUrl = `https://www.clover.com/online-checkout/${CLOVER_MERCHANT_ID}?amount=${amountInCents}&note=${encodeURIComponent(`Order ${orderData.orderNumber}`)}`;

    console.log('Checkout URL:', checkoutUrl);

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
