/**
 * Stripe Billing Integration
 * Handles customer creation, subscriptions, and webhook events
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Create a new Stripe customer
 * @param {Object} agent - Agent object with id, email, name
 * @returns {Promise<Object>} Stripe customer object
 */
async function createCustomer(agent) {
  if (!stripe) {
    console.warn('Stripe not configured - skipping customer creation');
    return { id: 'mock_customer_' + agent.id, mock: true };
  }

  try {
    const customer = await stripe.customers.create({
      email: agent.email,
      name: agent.name || agent.email,
      metadata: {
        agent_id: agent.id,
        source: 'leadflow_onboarding'
      }
    });

    console.log(`✅ Stripe customer created: ${customer.id} for agent ${agent.id}`);
    return customer;
  } catch (error) {
    console.error('❌ Failed to create Stripe customer:', error.message);
    throw error;
  }
}

/**
 * Create a subscription for an agent
 * @param {string} customerId - Stripe customer ID
 * @param {string} priceId - Stripe price ID for the plan
 * @returns {Promise<Object>} Stripe subscription object
 */
async function createSubscription(customerId, priceId) {
  if (!stripe) {
    console.warn('Stripe not configured - skipping subscription creation');
    return { id: 'mock_sub_' + Date.now(), mock: true, status: 'active' };
  }

  // Default to a basic plan if no priceId provided
  const defaultPriceId = process.env.STRIPE_PRICE_BASIC || priceId;
  
  if (!defaultPriceId) {
    throw new Error('No price ID provided and STRIPE_PRICE_BASIC not set');
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: defaultPriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        source: 'leadflow_agent_signup'
      }
    });

    console.log(`✅ Stripe subscription created: ${subscription.id}`);
    return subscription;
  } catch (error) {
    console.error('❌ Failed to create Stripe subscription:', error.message);
    throw error;
  }
}

/**
 * Attach a payment method to a customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Result
 */
async function attachPaymentMethod(customerId, paymentMethodId) {
  if (!stripe) {
    console.warn('Stripe not configured - skipping payment method attachment');
    return { success: true, mock: true };
  }

  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    console.log(`✅ Payment method ${paymentMethodId} attached to customer ${customerId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to attach payment method:', error.message);
    throw error;
  }
}

/**
 * Create a setup intent for adding payment method
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Setup intent client secret
 */
async function createSetupIntent(customerId) {
  if (!stripe) {
    console.warn('Stripe not configured - returning mock setup intent');
    return { client_secret: 'mock_secret_' + Date.now(), mock: true };
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true }
    });

    return { client_secret: setupIntent.client_secret };
  } catch (error) {
    console.error('❌ Failed to create setup intent:', error.message);
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} Processing result
 */
async function handleWebhook(event) {
  console.log(`📨 Processing Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled webhook type: ${event.type}`);
    }

    return { received: true, type: event.type };
  } catch (error) {
    console.error(`❌ Error handling webhook ${event.type}:`, error.message);
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  console.log(`✅ Payment succeeded for invoice: ${invoice.id}`);
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Get customer ID from Stripe customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id, email')
      .eq('stripe_customer_id', invoice.customer)
      .single();
    
    if (customer) {
      // Record payment in payments table
      await supabase.from('payments').insert({
        customer_id: customer.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'succeeded',
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
        receipt_url: invoice.hosted_invoice_url
      });
      
      console.log(`✅ Recorded payment for customer ${customer.email}`);
    }
  } catch (error) {
    console.error('Error recording payment:', error);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  console.log(`❌ Payment failed for invoice: ${invoice.id}`);
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Update customer status to past_due
    await supabase
      .from('customers')
      .update({ status: 'past_due' })
      .eq('stripe_customer_id', invoice.customer);
    
    // Record failed payment
    await supabase.from('payments').insert({
      customer_id: (await supabase.from('customers').select('id').eq('stripe_customer_id', invoice.customer).single()).data?.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: 'failed',
      failure_message: invoice.last_finalization_error?.message
    });
    
    console.log(`✅ Updated customer to past_due status`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCancelled(subscription) {
  console.log(`🚫 Subscription cancelled: ${subscription.id}`);
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Update customer status to canceled
    await supabase
      .from('customers')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        mrr: 0
      })
      .eq('stripe_subscription_id', subscription.id);
    
    console.log(`✅ Customer subscription marked as canceled`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`📝 Subscription updated: ${subscription.id}`);
  console.log(`   Status: ${subscription.status}`);
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    const price = subscription.items.data[0]?.price;
    const planPrice = price?.unit_amount;
    const interval = price?.recurring?.interval;
    
    // Calculate MRR (convert annual to monthly)
    let mrr = planPrice;
    if (interval === 'year') {
      mrr = Math.round(planPrice / 12);
    }
    
    // Determine plan tier from price metadata or amount
    let planTier = 'pro'; // default
    if (price?.metadata?.tier) {
      planTier = price.metadata.tier;
    }
    
    // Update customer subscription details
    await supabase
      .from('customers')
      .update({
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        plan_price: planPrice,
        billing_cycle: interval === 'year' ? 'annual' : 'monthly',
        plan_tier: planTier,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        mrr: subscription.status === 'active' ? mrr : 0
      })
      .eq('stripe_customer_id', subscription.customer);
    
    console.log(`✅ Customer subscription details updated`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Get agent's subscription status
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription details
 */
async function getSubscriptionStatus(subscriptionId) {
  if (!stripe || subscriptionId.startsWith('mock_')) {
    return { status: 'active', mock: true };
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    };
  } catch (error) {
    console.error('❌ Failed to get subscription status:', error.message);
    throw error;
  }
}

/**
 * Cancel a subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {boolean} immediate - Cancel immediately vs at period end
 * @returns {Promise<Object>} Cancelled subscription
 */
async function cancelSubscription(subscriptionId, immediate = false) {
  if (!stripe || subscriptionId.startsWith('mock_')) {
    console.log('Mock: Subscription cancelled');
    return { status: 'cancelled', mock: true };
  }

  try {
    if (immediate) {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } else {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      return subscription;
    }
  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error.message);
    throw error;
  }
}

// Import portal module for re-export
const {
  createPortalSession,
  getPortalConfig,
  updatePortalBranding,
  getSubscriptionManagementConfig,
  getPaymentMethodConfig,
  getInvoiceHistoryConfig,
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerPaymentMethods,
  configurePortal
} = require('./stripe-portal');

module.exports = {
  // Core billing functions
  createCustomer,
  createSubscription,
  attachPaymentMethod,
  createSetupIntent,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription,
  
  // Portal functions
  createPortalSession,
  getPortalConfig,
  updatePortalBranding,
  getSubscriptionManagementConfig,
  getPaymentMethodConfig,
  getInvoiceHistoryConfig,
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerPaymentMethods,
  configurePortal,
  
  // Expose Stripe instance for direct access
  stripe
};
