const express = require('express');
const billingService = require('../lib/services/BillingService');

const router = express.Router();

router.post('/create-customer', async (req, res) => {
  try {
    const { email, name, agentId } = req.body;
    if (!email || !agentId) {
      return res.status(400).json({ error: 'Missing required fields: email, agentId' });
    }

    const customer = await billingService.createCustomer({ id: agentId, email, name });
    return res.json({
      success: true,
      customerId: customer.id,
      mock: customer.mock || false
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create customer', message: error.message });
  }
});

router.post('/create-subscription', async (req, res) => {
  try {
    const { customerId, priceId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing required field: customerId' });
    }

    const subscription = await billingService.createSubscription(customerId, priceId);
    return res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      mock: subscription.mock || false
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create subscription', message: error.message });
  }
});

router.post('/setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing required field: customerId' });
    }

    const setupIntent = await billingService.createSetupIntent(customerId);
    return res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      mock: setupIntent.mock || false
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create setup intent', message: error.message });
  }
});

router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const result = await billingService.getSubscriptionStatus(req.params.subscriptionId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get subscription status', message: error.message });
  }
});

router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId, immediate } = req.body;
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing required field: subscriptionId' });
    }

    const subscription = await billingService.cancelSubscription(subscriptionId, immediate);
    return res.json({
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      mock: subscription.mock || false
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
  }
});

router.post('/subscriptions', async (req, res) => {
  try {
    const { userId, tier, interval, paymentMethodId, trial } = req.body;
    if (!userId || !tier) {
      return res.status(400).json({ error: 'Missing required fields: userId, tier' });
    }

    const result = await billingService.createCompleteSubscription({
      userId,
      tier,
      interval: interval || 'month',
      paymentMethodId,
      trial: trial || false
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create subscription', message: error.message });
  }
});

router.get('/subscriptions/:userId', async (req, res) => {
  try {
    const result = await billingService.getUserSubscriptionStatus(req.params.userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get subscription status', message: error.message });
  }
});

router.post('/subscriptions/:subscriptionId/change', async (req, res) => {
  try {
    const { newTier, newInterval, effectiveImmediately, prorationBehavior } = req.body;
    if (!newTier) {
      return res.status(400).json({ error: 'Missing required field: newTier' });
    }

    const result = await billingService.changePlan({
      subscriptionId: req.params.subscriptionId,
      newTier,
      newInterval,
      effectiveImmediately: effectiveImmediately !== false,
      prorationBehavior: prorationBehavior || 'create_prorations'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change plan', message: error.message });
  }
});

router.post('/subscriptions/:subscriptionId/preview-change', async (req, res) => {
  try {
    const { newTier, newInterval } = req.body;
    if (!newTier) {
      return res.status(400).json({ error: 'Missing required field: newTier' });
    }

    const result = await billingService.previewPlanChange({
      subscriptionId: req.params.subscriptionId,
      newTier,
      newInterval
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to preview change', message: error.message });
  }
});

router.post('/subscriptions/:subscriptionId/cancel', async (req, res) => {
  try {
    const result = await billingService.cancelManagedSubscription({
      subscriptionId: req.params.subscriptionId,
      immediate: req.body.immediate || false,
      reason: req.body.reason,
      feedback: req.body.feedback
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel subscription', message: error.message });
  }
});

router.post('/subscriptions/:subscriptionId/reactivate', async (req, res) => {
  try {
    const result = await billingService.reactivateSubscription(req.params.subscriptionId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reactivate subscription', message: error.message });
  }
});

router.get('/subscriptions/:subscriptionId/cycle', async (req, res) => {
  try {
    const result = await billingService.getBillingCycleInfo(req.params.subscriptionId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get billing cycle info', message: error.message });
  }
});

router.get('/subscriptions/:subscriptionId/renewals', async (req, res) => {
  try {
    const result = await billingService.getRenewalHistory(req.params.subscriptionId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get renewal history', message: error.message });
  }
});

router.get('/upcoming-renewals', async (req, res) => {
  try {
    const result = await billingService.getUpcomingRenewals({
      days: req.query.days ? parseInt(req.query.days, 10) : 30,
      userId: req.query.userId
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get upcoming renewals', message: error.message });
  }
});

router.get('/portal/config', async (_req, res) => {
  try {
    return res.json({ success: true, config: billingService.getPortalConfig() });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get portal configuration', message: error.message });
  }
});

router.post('/portal/session', async (req, res) => {
  try {
    const { customerId, returnUrl, locale } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Missing required field: customerId' });
    }

    const session = await billingService.createPortalSession(customerId, { returnUrl, locale });
    return res.json({ success: true, ...session });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create portal session', message: error.message });
  }
});

router.get('/portal/subscriptions/:customerId', async (req, res) => {
  try {
    const result = await billingService.getCustomerSubscriptions(req.params.customerId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get subscriptions', message: error.message });
  }
});

router.get('/portal/invoices/:customerId', async (req, res) => {
  try {
    const result = await billingService.getCustomerInvoices(req.params.customerId, {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      startingAfter: req.query.startingAfter
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get invoices', message: error.message });
  }
});

router.get('/portal/payment-methods/:customerId', async (req, res) => {
  try {
    const result = await billingService.getCustomerPaymentMethods(req.params.customerId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get payment methods', message: error.message });
  }
});

router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    let event;

    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = billingService.verifyWebhookSignature(req.body, signature);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : JSON.parse(req.body.toString());
    }

    const result = await billingService.handleWebhook(event);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: 'Webhook processing failed', message: error.message });
  }
});

router.get('/analytics/:userId', async (req, res) => {
  try {
    const result = await billingService.getSubscriptionAnalytics(req.params.userId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get analytics', message: error.message });
  }
});

router.post('/sync', async (_req, res) => {
  try {
    const result = await billingService.syncAllSubscriptions();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to sync subscriptions', message: error.message });
  }
});

router.get('/status', async (_req, res) => {
  try {
    const result = await billingService.initializeBilling();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get billing status', message: error.message });
  }
});

module.exports = router;
