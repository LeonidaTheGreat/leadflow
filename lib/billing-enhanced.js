/**
 * Enhanced Billing Module
 * Complete Stripe integration with subscription lifecycle management
 * Integrates: subscription service, billing cycle manager, webhook processor, portal
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Import sub-modules
const subscriptionService = require('./subscription-service');
const billingCycleManager = require('./billing-cycle-manager');
const webhookProcessor = require('./webhook-processor');
const stripePortal = require('./stripe-portal');

// Initialize clients
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

/**
 * Initialize the billing module
 * Sets up portal configuration, validates environment
 * @returns {Promise<Object>} Initialization result
 */
async function initializeBilling() {
  console.log('🔧 Initializing Stripe Billing Module...');

  const status = {
    stripe: !!stripe,
    supabase: !!supabase,
    portal: false,
    webhooks: false,
    errors: []
  };

  try {
    // Configure Stripe Portal
    if (stripe) {
      await stripePortal.configurePortal();
      status.portal = true;
      console.log('✅ Stripe Portal configured');
    }

    // Validate webhook endpoint configuration
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      status.webhooks = true;
      console.log('✅ Webhook secret configured');
    } else {
      status.errors.push('STRIPE_WEBHOOK_SECRET not set - webhooks will not be verified');
    }

    // Check price configuration
    const requiredPrices = [
      'STRIPE_PRICE_STARTER_MONTHLY',
      'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      'STRIPE_PRICE_ENTERPRISE_MONTHLY'
    ];
    
    for (const priceVar of requiredPrices) {
      if (!process.env[priceVar]) {
        status.errors.push(`${priceVar} not set`);
      }
    }

    console.log('✅ Billing module initialized');
    return status;

  } catch (error) {
    console.error('❌ Failed to initialize billing:', error.message);
    status.errors.push(error.message);
    return status;
  }
}

/**
 * Create a complete subscription with all setup
 * @param {Object} params - Subscription parameters
 * @returns {Promise<Object>} Complete subscription result
 */
async function createCompleteSubscription(params) {
  const {
    userId,
    tier,
    interval,
    paymentMethodId,
    trial = false,
    sendWelcomeEmail = true
  } = params;

  try {
    // Create the subscription
    const subscription = await subscriptionService.createManagedSubscription({
      userId,
      tier,
      interval,
      paymentMethodId,
      trial
    });

    if (!subscription.success) {
      throw new Error('Failed to create subscription');
    }

    // If no payment method required (e.g., trial), we're done
    if (trial && !paymentMethodId) {
      return {
        success: true,
        subscription,
        requiresPayment: false,
        message: 'Trial subscription created'
      };
    }

    return {
      success: true,
      subscription,
      requiresPayment: !!subscription.clientSecret,
      clientSecret: subscription.clientSecret,
      message: subscription.clientSecret 
        ? 'Subscription created, payment required'
        : 'Subscription created successfully'
    };

  } catch (error) {
    console.error('❌ Failed to create complete subscription:', error.message);
    throw error;
  }
}

/**
 * Change subscription plan with full proration handling
 * @param {Object} params - Change parameters
 * @returns {Promise<Object>} Change result with preview
 */
async function changePlan(params) {
  const {
    subscriptionId,
    newTier,
    newInterval,
    effectiveImmediately = true,
    prorationBehavior = 'create_prorations'
  } = params;

  try {
    // Get proration preview first
    const prorationPreview = await billingCycleManager.calculateProration({
      subscriptionId,
      newPriceId: getPriceId(newTier, newInterval)
    });

    if (effectiveImmediately) {
      // Apply change immediately with proration
      const result = await subscriptionService.changeSubscriptionPlan({
        subscriptionId,
        newTier,
        newInterval,
        prorationBehavior
      });

      return {
        success: true,
        change: result,
        proration: prorationPreview,
        effective: 'immediately'
      };
    } else {
      // Schedule for next cycle
      const result = await subscriptionService.scheduleSubscriptionChange({
        subscriptionId,
        newTier,
        newInterval
      });

      return {
        success: true,
        change: result,
        proration: null,
        effective: 'next_cycle',
        effectiveDate: result.effectiveDate
      };
    }

  } catch (error) {
    console.error('❌ Failed to change plan:', error.message);
    throw error;
  }
}

/**
 * Preview plan change without applying it
 * @param {Object} params - Preview parameters
 */
async function previewPlanChange(params) {
  const { subscriptionId, newTier, newInterval } = params;

  try {
    const [proration, cyclePreview] = await Promise.all([
      billingCycleManager.calculateProration({
        subscriptionId,
        newPriceId: getPriceId(newTier, newInterval)
      }),
      billingCycleManager.previewBillingCycleChange({
        subscriptionId,
        newTier,
        newInterval
      })
    ]);

    return {
      success: true,
      proration,
      billing: cyclePreview,
      immediateCharge: proration.totalDue,
      newRegularAmount: cyclePreview.preview.amount
    };

  } catch (error) {
    console.error('❌ Failed to preview plan change:', error.message);
    throw error;
  }
}

/**
 * Get complete subscription status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Complete subscription status
 */
async function getUserSubscriptionStatus(userId) {
  try {
    // Get active subscription
    const { subscriptions } = await subscriptionService.listUserSubscriptions(userId, {
      status: 'active',
      limit: 1
    });

    const subscription = subscriptions[0];

    if (!subscription) {
      return {
        hasSubscription: false,
        status: 'inactive',
        message: 'No active subscription found'
      };
    }

    // Get billing cycle info
    const cycleInfo = await billingCycleManager.getBillingCycleInfo(
      subscription.stripe_subscription_id
    );

    // Get recent payments
    const { data: payments } = await supabase
      ?.from('payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(6) || { data: [] };

    // Get portal session URL
    const portalSession = await stripePortal.createPortalSession(
      subscription.stripe_customer_id,
      { returnUrl: `${process.env.APP_URL}/dashboard/billing` }
    );

    return {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        stripeId: subscription.stripe_subscription_id,
        tier: subscription.tier,
        interval: subscription.interval,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end
      },
      billing: cycleInfo,
      payments: payments || [],
      portalUrl: portalSession.url,
      canManage: true
    };

  } catch (error) {
    console.error('❌ Failed to get subscription status:', error.message);
    throw error;
  }
}

/**
 * Cancel subscription with full cleanup
 * @param {Object} params - Cancellation parameters
 */
async function cancelSubscription(params) {
  const {
    subscriptionId,
    immediate = false,
    reason,
    feedback,
    downgradeFeatures = true
  } = params;

  try {
    const result = await subscriptionService.cancelManagedSubscription({
      subscriptionId,
      immediate,
      reason,
      feedback
    });

    // If immediate, handle feature downgrade
    if (immediate && downgradeFeatures) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await downgradeUserFeatures(userId);
      }
    }

    return {
      success: true,
      cancelled: true,
      immediate,
      effectiveDate: immediate ? new Date() : result.currentPeriodEnd,
      refundEligible: immediate ? await checkRefundEligibility(subscriptionId) : false
    };

  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error.message);
    throw error;
  }
}

/**
 * Reactivate a subscription scheduled for cancellation
 * @param {string} subscriptionId - Stripe subscription ID
 */
async function reactivateSubscription(subscriptionId) {
  try {
    const result = await subscriptionService.reactivateSubscription(subscriptionId);
    
    return {
      success: true,
      reactivated: true,
      status: result.status,
      currentPeriodEnd: result.currentPeriodEnd
    };

  } catch (error) {
    console.error('❌ Failed to reactivate subscription:', error.message);
    throw error;
  }
}

/**
 * Handle incoming Stripe webhook
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} Processing result
 */
async function handleWebhook(event) {
  return await webhookProcessor.processWebhookEvent(event);
}

/**
 * Verify webhook signature (Express middleware helper)
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @returns {Object} Verified event
 */
function verifyWebhookSignature(payload, signature) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Webhook verification not configured');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

/**
 * Create customer portal session
 * @param {string} customerId - Stripe customer ID
 * @param {Object} options - Session options
 */
async function createCustomerPortal(customerId, options = {}) {
  return await stripePortal.createPortalSession(customerId, options);
}

/**
 * Get subscription analytics for a user
 * @param {string} userId - User ID
 */
async function getSubscriptionAnalytics(userId) {
  try {
    // Get all subscriptions
    const { subscriptions } = await subscriptionService.listUserSubscriptions(userId);
    
    // Calculate metrics
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
    const totalSpent = subscriptions.reduce((sum, s) => sum + (s.metadata?.totalSpent || 0), 0);
    
    // Get current MRR
    const activeSub = subscriptions.find(s => s.status === 'active');
    const currentMRR = activeSub ? calculateMRR(activeSub) : 0;

    return {
      totalSubscriptions,
      activeSubscriptions,
      totalSpent,
      currentMRR,
      subscriptionHistory: subscriptions
    };

  } catch (error) {
    console.error('❌ Failed to get analytics:', error.message);
    throw error;
  }
}

/**
 * Sync all subscriptions from Stripe to database
 * Full reconciliation for data integrity
 */
async function syncAllSubscriptions() {
  try {
    // Sync billing cycles
    const cycleResult = await billingCycleManager.syncBillingCycles();
    
    // Additional sync operations can be added here
    
    return {
      success: true,
      synced: cycleResult.synced,
      message: `Synced ${cycleResult.synced} subscriptions`
    };

  } catch (error) {
    console.error('❌ Failed to sync subscriptions:', error.message);
    throw error;
  }
}

// ==================== HELPER FUNCTIONS ====================

function getPriceId(tier, interval) {
  const prices = {
    starter: {
      month: process.env.STRIPE_PRICE_STARTER_MONTHLY,
      year: process.env.STRIPE_PRICE_STARTER_YEARLY
    },
    professional: {
      month: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
      year: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY
    },
    enterprise: {
      month: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      year: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY
    }
  };

  return prices[tier]?.[interval];
}

function calculateMRR(subscription) {
  const amount = subscription.metadata?.amount || 0;
  const interval = subscription.interval;
  
  if (interval === 'year') {
    return amount / 12;
  }
  return amount;
}

async function downgradeUserFeatures(userId) {
  console.log(`⬇️ Downgrading features for user: ${userId}`);
  // Implement feature downgrade logic
}

async function checkRefundEligibility(subscriptionId) {
  // Check if subscription is within refund window
  // Implement refund policy logic
  return false;
}

// ==================== EXPORTS ====================

module.exports = {
  // Initialization
  initializeBilling,
  
  // Subscription lifecycle
  createCompleteSubscription,
  changePlan,
  previewPlanChange,
  cancelSubscription,
  reactivateSubscription,
  getUserSubscriptionStatus,
  
  // Webhooks
  handleWebhook,
  verifyWebhookSignature,
  
  // Portal
  createCustomerPortal,
  
  // Analytics & admin
  getSubscriptionAnalytics,
  syncAllSubscriptions,
  
  // Re-export sub-modules for advanced use
  subscriptionService,
  billingCycleManager,
  webhookProcessor,
  stripePortal,
  
  // Raw clients
  stripe,
  supabase
};
