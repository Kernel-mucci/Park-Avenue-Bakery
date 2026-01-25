// api/webhook.js
// This receives notifications from Clover when payments complete

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    
    console.log('Webhook received:', event);
    
    // Handle different event types
    switch(event.type) {
      case 'payment.created':
        console.log('✅ Payment successful:', event.data);
        // TODO: Send confirmation email, update database, etc.
        break;
        
      case 'payment.failed':
        console.log('❌ Payment failed:', event.data);
        // TODO: Notify customer, log error
        break;
        
      case 'payment.refunded':
        console.log('💰 Payment refunded:', event.data);
        // TODO: Update order status
        break;
        
      default:
        console.log('Unknown event type:', event.type);
    }
    
    // Always respond 200 to acknowledge receipt
    return res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
