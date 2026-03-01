/**
 * Billing API Routes
 * Endpoints for agent billing operations
 */

const express = require('express');
const router = express.Router();
const portalRoutes = require('./portal');
const { 
  createCustomer, 
  createSubscription, 
  createSetupIntent,
  getSubscriptionStatus,
  cancelSubscription,
  createPortalSession,
  getPortalConfig,
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerPaymentMethods
} = require('../lib/billing');

/**
 * POST /api/billing/create-customer
 * Create a new Stripe customer for an agent
 */
router.post('/create-customer', async (req, res) => {
  try {
    const { email, name, agentId } = req.body;

    if (!email || !agentId) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, agentId' 
      });
    }

    const customer = await createCustomer({
      id: agentId,
      email,
      name
    });

    res.json({
      success: true,
      customerId: customer.id,
      mock: customer.mock || false
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ 
      error: 'Failed to create customer',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/create-subscription
 * Create a subscription for an agent
 */
router.post('/create-subscription', async (req, res) => {
  try {
    const { customerId, priceId } = req.body;

    if (!customerId) {
      return res.status(400).json({ 
        error: 'Missing required field: customerId' 
      });
    }

    const subscription = await createSubscription(customerId, priceId);

    res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      mock: subscription.mock || false
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/setup-intent
 * Create a setup intent for adding payment method
 */
router.post('/setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ 
        error: 'Missing required field: customerId' 
      });
    }

    const setupIntent = await createSetupIntent(customerId);

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      mock: setupIntent.mock || false
    });

  } catch (error) {
    console.error('Setup intent error:', error);
    res.status(500).json({ 
      error: 'Failed to create setup intent',
      message: error.message 
    });
  }
});

/**
 * GET /api/billing/subscription/:subscriptionId
 * Get subscription status
 */
router.get('/subscription/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const status = await getSubscriptionStatus(subscriptionId);

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription status',
      message: error.message 
    });
  }
});

/**
 * POST /api/billing/cancel-subscription
 * Cancel a subscription
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId, immediate } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ 
        error: 'Missing required field: subscriptionId' 
      });
    }

    const subscription = await cancelSubscription(subscriptionId, immediate);

    res.json({
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      mock: subscription.mock || false
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
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
    const config = getPortalConfig();
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

/**
 * POST /api/billing/portal/session
 * Create a customer portal session
 */
router.post('/portal/session', async (req, res) => {
  try {
    const { customerId, returnUrl, locale } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: 'Missing required field: customerId'
      });
    }

    const session = await createPortalSession(customerId, {
      returnUrl,
      locale
    });

    res.json({
      success: true,
      ...session
    });

  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/portal/subscriptions/:customerId
 * Get customer's subscriptions
 */
router.get('/portal/subscriptions/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const subscriptions = await getCustomerSubscriptions(customerId);

    res.json({
      success: true,
      ...subscriptions
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to get subscriptions',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/portal/invoices/:customerId
 * Get customer's invoices
 */
router.get('/portal/invoices/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit, startingAfter } = req.query;

    const invoices = await getCustomerInvoices(customerId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      startingAfter
    });

    res.json({
      success: true,
      ...invoices
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to get invoices',
      message: error.message
    });
  }
});

/**
 * GET /api/billing/portal/payment-methods/:customerId
 * Get customer's payment methods
 */
router.get('/portal/payment-methods/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const paymentMethods = await getCustomerPaymentMethods(customerId);

    res.json({
      success: true,
      ...paymentMethods
    });

  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
});

// Mount portal routes under /api/billing/portal
router.use('/portal', portalRoutes);

module.exports = router;
