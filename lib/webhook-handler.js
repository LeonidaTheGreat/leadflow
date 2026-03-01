/**
 * Stripe Webhook Handler
 * Express middleware for handling Stripe webhooks
 */

const { handleWebhook } = require('./billing');

/**
 * Stripe webhook handler middleware
 * Must be registered BEFORE express.json() to preserve raw body
 */
function stripeWebhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.warn('⚠️ Stripe webhook received without signature');
    // Allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return res.status(400).send('Webhook signature missing');
    }
  }

  // Verify webhook signature in production
  if (process.env.NODE_ENV === 'production' && process.env.STRIPE_WEBHOOK_SECRET) {
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      // Process verified event
      handleWebhook(event)
        .then(() => res.json({ received: true }))
        .catch(err => {
          console.error('Webhook processing error:', err);
          res.status(500).send('Webhook processing failed');
        });
      
      return;
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  // Development mode: process without verification
  const event = req.body;
  
  if (!event || !event.type) {
    return res.status(400).send('Invalid webhook payload');
  }

  handleWebhook(event)
    .then(() => res.json({ received: true }))
    .catch(err => {
      console.error('Webhook processing error:', err);
      res.status(500).send('Webhook processing failed');
    });
}

module.exports = { stripeWebhookHandler };
