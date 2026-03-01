/**
 * Stripe Customer Portal API Routes
 * Endpoints for managing customer portal sessions and configuration
 * UPDATED: Now uses customers table instead of agents table
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const {
  createPortalSession,
  getPortalConfig,
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerPaymentMethods,
  configurePortal
} = require('../lib/stripe-portal');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Authentication middleware
 * Verifies that the authenticated user can only access their own customer data
 */
async function authenticateCustomer(req, res, next) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Authorization middleware
 * Ensures user can only access their own customer record
 */
function authorizeCustomerAccess(req, res, next) {
  const { customerId } = req.params.customerId ? req.params : req.body;
  
  if (!customerId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Customer ID is required'
    });
  }

  // Verify the authenticated user matches the customer ID
  if (req.user.id !== customerId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own customer data'
    });
  }

  next();
}

/**
 * POST /api/portal/session
 * Create a customer portal session
 * Body: { customerId, returnUrl, locale }
 * Requires: Authentication token
 */
router.post('/session', authenticateCustomer, async (req, res) => {
  try {
    const { customerId, returnUrl, locale } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: 'Missing required field: customerId'
      });
    }

    // Authorization: Verify user can access this customer
    if (req.user.id !== customerId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own billing portal'
      });
    }

    // Get customer from database (use customers table, not agents)
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('id, email, stripe_customer_id, plan_tier, status')
      .eq('id', customerId)
      .single();

    if (dbError || !customer) {
      return res.status(404).json({
        error: 'Customer not found',
        message: 'No customer record found for this user'
      });
    }

    if (!customer.stripe_customer_id) {
      return res.status(400).json({
        error: 'No Stripe customer',
        message: 'This customer does not have a Stripe account yet. Please create a subscription first.'
      });
    }

    // Create portal session with Stripe
    const session = await createPortalSession(customer.stripe_customer_id, {
      returnUrl,
      locale
    });

    res.json({
      success: true,
      ...session
    });

  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

/**
 * GET /api/portal/config
 * Get portal configuration (public)
 */
router.get('/config', async (req, res) => {
  try {
    const config = getPortalConfig();

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Portal config error:', error);
    res.status(500).json({
      error: 'Failed to get portal configuration',
      message: error.message
    });
  }
});

/**
 * POST /api/portal/configure
 * Configure/update the Stripe Customer Portal (admin only)
 * TODO: Add proper admin authentication
 */
router.post('/configure', async (req, res) => {
  try {
    // TODO: Add admin authentication check
    // For now, require service key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const result = await configurePortal();

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Portal configuration error:', error);
    res.status(500).json({
      error: 'Failed to configure portal',
      message: error.message
    });
  }
});

/**
 * GET /api/portal/subscriptions/:customerId
 * Get customer's subscriptions
 * Requires: Authentication token
 */
router.get('/subscriptions/:customerId', authenticateCustomer, authorizeCustomerAccess, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer's Stripe customer ID from database
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', customerId)
      .single();

    if (dbError || !customer || !customer.stripe_customer_id) {
      return res.status(404).json({
        error: 'Customer not found',
        message: 'No Stripe customer found'
      });
    }

    const subscriptions = await getCustomerSubscriptions(customer.stripe_customer_id);

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
 * GET /api/portal/invoices/:customerId
 * Get customer's invoice history
 * Query params: limit, startingAfter
 * Requires: Authentication token
 */
router.get('/invoices/:customerId', authenticateCustomer, authorizeCustomerAccess, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit, startingAfter } = req.query;

    // Get customer's Stripe customer ID from database
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', customerId)
      .single();

    if (dbError || !customer || !customer.stripe_customer_id) {
      return res.status(404).json({
        error: 'Customer not found',
        message: 'No Stripe customer found'
      });
    }

    const invoices = await getCustomerInvoices(customer.stripe_customer_id, {
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
 * GET /api/portal/payment-methods/:customerId
 * Get customer's payment methods
 * Requires: Authentication token
 */
router.get('/payment-methods/:customerId', authenticateCustomer, authorizeCustomerAccess, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get customer's Stripe customer ID from database
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', customerId)
      .single();

    if (dbError || !customer || !customer.stripe_customer_id) {
      return res.status(404).json({
        error: 'Customer not found',
        message: 'No Stripe customer found'
      });
    }

    const paymentMethods = await getCustomerPaymentMethods(customer.stripe_customer_id);

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

module.exports = router;
