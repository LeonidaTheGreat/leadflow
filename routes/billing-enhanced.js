/**
 * Enhanced Billing API Routes
 * Complete endpoints for subscription management
 */

const express = require('express');
const router = express.Router();
const billing = require('../lib/billing-enhanced');

// ==================== SUBSCRIPTION LIFECYCLE ====================

/**
 * POST /api/billing/subscriptions
 * Create a new subscription
 * Body: { userId, tier, interval, paymentMethodId, trial }
 */
router.post('/subscriptions', async (req, res) => {
  try {
    const { userId, tier, interval, paymentMethodId, trial } = req.body;

    if (!userId || !tier) {
      return res.status(400).json({
        error: 'Missing required fields: userId, tier'
      });
    }

    const result = await billing.createCompleteSubscription({
      userId,
      tier,
      interval: interval || 'month',
      paymentMethodId,
      trial: trial || false
    });

    res.json(result);

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/subscriptions/:userId
 * Get user's subscription status
 */
router.get('/subscriptions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await billing.getUserSubscriptionStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      message: error.message
    });
  }
});

/**
 * POST /api/billing/subscriptions/:subscriptionId/change
 * Change subscription plan (upgrade/downgrade)
 * Body: { newTier, newInterval, effectiveImmediately, prorationBehavior }
 */
router.post('/subscriptions/:subscriptionId/change', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newTier, newInterval, effectiveImmediately, prorationBehavior } = req.body;

    if (!newTier) {
      return res.status(400).json({
        error: 'Missing required field: newTier'
      });
    }

    const result = await billing.changePlan({
      subscriptionId,
      newTier,
      newInterval,
      effectiveImmediately: effectiveImmediately !== false,
      prorationBehavior: prorationBehavior || 'create_prorations'
    });

    res.json(result);

  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({
      error: 'Failed to change plan',
      message: error.message
    });
  }
});

/**
 * POST /api/billing/subscriptions/:subscriptionId/preview-change
 * Preview plan change (proration, new amount)
 * Body: { newTier, newInterval }
 */
router.post('/subscriptions/:subscriptionId/preview-change', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newTier, newInterval } = req.body;

    if (!newTier) {
      return res.status(400).json({
        error: 'Missing required field: newTier'
      });
    }

    const result = await billing.previewPlanChange({
      subscriptionId,
      newTier,
      newInterval
    });

    res.json(result);

  } catch (error) {
    console.error('Preview change error:', error);
    res.status(500).json({
      error: 'Failed to preview change',
      message: error.message
    });
  }
});

/**
 * POST /api/billing/subscriptions/:subscriptionId/cancel
 * Cancel subscription
 * Body: { immediate, reason, feedback }
 */
router.post('/subscriptions/:subscriptionId/cancel', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { immediate, reason, feedback } = req.body;

    const result = await billing.cancelSubscription({
      subscriptionId,
      immediate: immediate || false,
      reason,
      feedback
    });

    res.json(result);

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

/**
 * POST /api/billing/subscriptions/:subscriptionId/reactivate
 * Reactivate a subscription scheduled for cancellation
 */
router.post('/subscriptions/:subscriptionId/reactivate', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const result = await billing.reactivateSubscription(subscriptionId);
    res.json(result);
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      error: 'Failed to reactivate subscription',
      message: error.message
    });
  }
});

// ==================== BILLING CYCLE ====================

/**
 * GET /api/billing/subscriptions/:subscriptionId/cycle
 * Get billing cycle information
 */
router.get('/subscriptions/:subscriptionId/cycle', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const cycleInfo = await billing.billingCycleManager.getBillingCycleInfo(subscriptionId);
    res.json(cycleInfo);
  } catch (error) {
    console.error('Get billing cycle error:', error);
    res.status(500).json({
      error: 'Failed to get billing cycle info',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/subscriptions/:subscriptionId/renewals
 * Get renewal history
 */
router.get('/subscriptions/:subscriptionId/renewals', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const history = await billing.billingCycleManager.getRenewalHistory(subscriptionId);
    res.json(history);
  } catch (error) {
    console.error('Get renewals error:', error);
    res.status(500).json({
      error: 'Failed to get renewal history',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/upcoming-renewals
 * Get upcoming renewals (admin endpoint)
 * Query: { days, userId }
 */
router.get('/upcoming-renewals', async (req, res) => {
  try {
    const { days, userId } = req.query;
    const renewals = await billing.billingCycleManager.getUpcomingRenewals({
      days: days ? parseInt(days, 10) : 30,
      userId
    });
    res.json(renewals);
  } catch (error) {
    console.error('Get upcoming renewals error:', error);
    res.status(500).json({
      error: 'Failed to get upcoming renewals',
      message: error.message
    });
  }
});

// ==================== CUSTOMER PORTAL ====================

/**
 * POST /api/billing/portal/session
 * Create customer portal session
 * Body: { customerId, returnUrl }
 */
router.post('/portal/session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: 'Missing required field: customerId'
      });
    }

    const session = await billing.createCustomerPortal(customerId, {
      returnUrl: returnUrl || `${process.env.APP_URL}/dashboard`
    });

    res.json(session);

  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/portal/config
 * Get portal configuration
 */
router.get('/portal/config', async (req, res) => {
  try {
    const config = billing.stripePortal.getPortalConfig();
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get portal config error:', error);
    res.status(500).json({
      error: 'Failed to get portal configuration',
      message: error.message
    });
  }
});

// ==================== WEBHOOKS ====================

/**
 * POST /api/billing/webhooks
 * Stripe webhook endpoint
 * Must be configured BEFORE express.json() middleware to preserve raw body
 */
router.post('/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    let event;

    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      // Verify signature
      event = billing.verifyWebhookSignature(req.body, signature);
    } else {
      // Development mode - parse directly
      event = JSON.parse(req.body);
    }

    const result = await billing.handleWebhook(event);
    res.json(result);

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/billing/analytics/:userId
 * Get subscription analytics for a user
 */
router.get('/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const analytics = await billing.getSubscriptionAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

// ==================== ADMIN/SYNC ====================

/**
 * POST /api/billing/sync
 * Sync all subscriptions from Stripe (admin)
 */
router.post('/sync', async (req, res) => {
  try {
    const result = await billing.syncAllSubscriptions();
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Failed to sync subscriptions',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/status
 * Get billing module status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await billing.initializeBilling();
    res.json(status);
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({
      error: 'Failed to get billing status',
      message: error.message
    });
  }
});

// ==================== LEGACY COMPATIBILITY ====================

// Re-export legacy routes for backward compatibility
router.post('/create-customer', async (req, res) => {
  try {
    const { email, name, agentId } = req.body;
    const { getOrCreateCustomer } = require('../lib/subscription-service');
    const customer = await getOrCreateCustomer(agentId);
    res.json({
      success: true,
      customerId: customer.id
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create customer',
      message: error.message
    });
  }
});

router.post('/create-subscription', async (req, res) => {
  // Redirect to new endpoint
  req.url = '/subscriptions';
  router.handle(req, res);
});

module.exports = router;
