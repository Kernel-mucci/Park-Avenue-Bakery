// api/webhook.js
// Receives notifications from Clover when payments complete

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.CLOVER_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-clover-signature'] || req.headers['x-webhook-signature'] || '';
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      )) {
        console.error('Webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      console.warn('CLOVER_WEBHOOK_SECRET not set — webhook signature verification is disabled');
    }

    const event = req.body;

    if (!event || !event.type) {
      return res.status(400).json({ error: 'Invalid event payload' });
    }

    // Handle different event types
    switch(event.type) {
      case 'payment.created':
        console.log('Payment successful for order');
        // TODO: Send confirmation email, update database
        break;

      case 'payment.failed':
        console.log('Payment failed');
        // TODO: Notify customer, log error
        break;

      case 'payment.refunded':
        console.log('Payment refunded');
        // TODO: Update order status
        break;

      default:
        console.log('Unknown event type:', event.type);
    }

    // Always respond 200 to acknowledge receipt
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
