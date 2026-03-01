/**
 * Stripe Subscription Service
 * Complete subscription lifecycle management with database integration
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Initialize Supabase
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Price ID mappings for tiers
const TIER_PRICES = {
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

/**
 * Create a new subscription with full lifecycle management
 * @param {Object} params - Subscription parameters
 * @param {string} params.userId - User/agent ID
 * @param {string} params.tier - Plan tier (starter, professional, enterprise)
 * @param {string} params.interval - Billing interval (month, year)
 * @param {string} params.paymentMethodId - Optional payment method ID
 * @param {boolean} params.trial - Whether to include trial period
 * @returns {Promise<Object>} Created subscription details
 */
async function createManagedSubscription(params) {
  const { userId, tier, interval = 'month', paymentMethodId, trial = false } = params;

  if (!stripe) {
    console.warn('Stripe not configured - creating mock subscription');
    return createMockSubscription(userId, tier, interval);
  }

  try {
    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userId);
    
    // Get price ID for tier/interval
    const priceId = TIER_PRICES[tier]?.[interval];
    if (!priceId) {
      throw new Error(`Invalid tier ${tier} or interval ${interval}`);
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await attachPaymentMethod(customer.id, paymentMethodId);
    }

    // Build subscription parameters
    const subscriptionParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: userId,
        tier,
        interval,
        source: 'leadflow_managed_subscription'
      }
    };

    // Add trial if requested
    if (trial) {
      subscriptionParams.trial_period_days = 14; // 14-day trial
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Persist to database
    const subscription = await persistSubscription({
      userId,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      tier,
      priceId,
      interval,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      metadata: stripeSubscription.metadata
    });

    // Update agent record
    await updateAgentSubscription(userId, {
      subscriptionStatus: stripeSubscription.status,
      subscriptionTier: tier,
      stripeCustomerId: customer.id,
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
    });

    console.log(`✅ Subscription created: ${stripeSubscription.id} for user ${userId}`);

    return {
      success: true,
      subscriptionId: subscription.id,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      tier,
      interval,
      clientSecret: stripeSubscription.latest_invoice?.payment_intent?.client_secret,
      trialEnd: stripeSubscription.trial_end,
      currentPeriodEnd: stripeSubscription.current_period_end
    };

  } catch (error) {
    console.error('❌ Failed to create managed subscription:', error.message);
    throw error;
  }
}

/**
 * Get or create Stripe customer for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Stripe customer
 */
async function getOrCreateCustomer(userId) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Check if user already has a Stripe customer ID
  const { data: agent, error } = await supabase
    .from('agents')
    .select('stripe_customer_id, email, name')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch agent: ${error.message}`);
  }

  // Return existing customer
  if (agent?.stripe_customer_id) {
    try {
      return await stripe.customers.retrieve(agent.stripe_customer_id);
    } catch (err) {
      console.warn('Existing customer not found, creating new one');
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: agent.email,
    name: agent.name || agent.email,
    metadata: {
      user_id: userId,
      source: 'leadflow'
    }
  });

  // Update agent with customer ID
  await supabase
    .from('agents')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer;
}

/**
 * Attach payment method to customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 */
async function attachPaymentMethod(customerId, paymentMethodId) {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

/**
 * Persist subscription to database
 * @param {Object} params - Subscription data
 */
async function persistSubscription(params) {
  if (!supabase) {
    console.warn('Supabase not configured - subscription not persisted');
    return { id: 'mock_sub_' + Date.now() };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      status: params.status,
      tier: params.tier,
      price_id: params.priceId,
      interval: params.interval,
      current_period_start: params.currentPeriodStart,
      current_period_end: params.currentPeriodEnd,
      trial_start: params.trialStart,
      trial_end: params.trialEnd,
      metadata: params.metadata
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to persist subscription: ${error.message}`);
  }

  return data;
}

/**
 * Update agent subscription fields
 * @param {string} userId - User ID
 * @param {Object} updates - Subscription updates
 */
async function updateAgentSubscription(userId, updates) {
  if (!supabase) return;

  const { error } = await supabase
    .from('agents')
    .update({
      subscription_status: updates.subscriptionStatus,
      subscription_tier: updates.subscriptionTier,
      stripe_customer_id: updates.stripeCustomerId,
      current_period_end: updates.currentPeriodEnd,
      trial_ends_at: updates.trialEndsAt
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update agent subscription:', error.message);
  }
}

/**
 * Upgrade or downgrade subscription with proration
 * @param {Object} params - Change parameters
 * @param {string} params.subscriptionId - Stripe subscription ID
 * @param {string} params.newTier - Target tier
 * @param {string} params.newInterval - Target interval (optional, defaults to current)
 * @param {string} params.prorationBehavior - Proration behavior (create_prorations, none, always_invoice)
 * @returns {Promise<Object>} Updated subscription
 */
async function changeSubscriptionPlan(params) {
  const { subscriptionId, newTier, newInterval, prorationBehavior = 'create_prorations' } = params;

  if (!stripe) {
    console.warn('Stripe not configured - mock plan change');
    return { success: true, mock: true, newTier };
  }

  try {
    // Get current subscription
    const currentSub = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = currentSub.items.data[0];
    
    // Determine new interval (default to current if not specified)
    const targetInterval = newInterval || currentItem.price.recurring.interval;
    
    // Get new price ID
    const newPriceId = TIER_PRICES[newTier]?.[targetInterval];
    if (!newPriceId) {
      throw new Error(`Invalid tier ${newTier} or interval ${targetInterval}`);
    }

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: currentItem.id,
        price: newPriceId
      }],
      proration_behavior: prorationBehavior,
      metadata: {
        ...currentSub.metadata,
        plan_changed_at: Date.now().toString(),
        previous_tier: currentSub.metadata.tier,
        new_tier: newTier
      }
    });

    // Update database
    await updateSubscriptionInDatabase(subscriptionId, {
      tier: newTier,
      priceId: newPriceId,
      interval: targetInterval,
      status: updatedSubscription.status
    });

    // Update agent record
    const userId = currentSub.metadata.user_id;
    await updateAgentSubscription(userId, {
      subscriptionTier: newTier,
      subscriptionStatus: updatedSubscription.status
    });

    // Calculate proration amount if applicable
    const prorationAmount = calculateProrationAmount(currentSub, updatedSubscription);

    console.log(`✅ Subscription ${subscriptionId} changed to ${newTier} (${targetInterval})`);

    return {
      success: true,
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      newTier,
      newInterval: targetInterval,
      prorationAmount,
      currentPeriodEnd: updatedSubscription.current_period_end,
      hasPendingInvoice: !!updatedSubscription.pending_update
    };

  } catch (error) {
    console.error('❌ Failed to change subscription plan:', error.message);
    throw error;
  }
}

/**
 * Calculate proration amount from subscription change
 * @param {Object} oldSub - Previous subscription state
 * @param {Object} newSub - Updated subscription state
 * @returns {number|null} Proration amount in cents
 */
function calculateProrationAmount(oldSub, newSub) {
  // Get the upcoming invoice to see proration details
  // This is an approximation - for exact amounts, fetch the upcoming invoice
  const oldAmount = oldSub.items.data[0].price.unit_amount;
  const newAmount = newSub.items.data[0].price.unit_amount;
  
  if (oldAmount === newAmount) return 0;
  
  // Return the difference (positive = charge, negative = credit)
  return newAmount - oldAmount;
}

/**
 * Schedule subscription change for next billing cycle
 * @param {Object} params - Schedule parameters
 * @param {string} params.subscriptionId - Stripe subscription ID
 * @param {string} params.newTier - Target tier
 * @param {string} params.newInterval - Target interval
 */
async function scheduleSubscriptionChange(params) {
  const { subscriptionId, newTier, newInterval } = params;

  if (!stripe) {
    return { success: true, mock: true, scheduled: true };
  }

  try {
    const newPriceId = TIER_PRICES[newTier]?.[newInterval];
    if (!newPriceId) {
      throw new Error(`Invalid tier ${newTier} or interval ${newInterval}`);
    }

    // Schedule the change for next cycle
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pending_update: {
        items: [{ price: newPriceId }]
      }
    });

    // Store pending change in database
    if (supabase) {
      await supabase
        .from('subscriptions')
        .update({
          pending_tier: newTier,
          pending_interval: newInterval,
          pending_change_at: new Date(subscription.current_period_end * 1000)
        })
        .eq('stripe_subscription_id', subscriptionId);
    }

    return {
      success: true,
      scheduled: true,
      effectiveDate: subscription.current_period_end,
      newTier,
      newInterval
    };

  } catch (error) {
    console.error('❌ Failed to schedule subscription change:', error.message);
    throw error;
  }
}

/**
 * Cancel subscription with options
 * @param {Object} params - Cancellation parameters
 * @param {string} params.subscriptionId - Stripe subscription ID
 * @param {boolean} params.immediate - Cancel immediately vs at period end
 * @param {string} params.reason - Cancellation reason
 * @param {string} params.feedback - Optional feedback
 * @returns {Promise<Object>} Cancellation result
 */
async function cancelManagedSubscription(params) {
  const { subscriptionId, immediate = false, reason, feedback } = params;

  if (!stripe) {
    return { success: true, mock: true, status: 'cancelled' };
  }

  try {
    let result;

    if (immediate) {
      // Cancel immediately
      result = await stripe.subscriptions.cancel(subscriptionId, {
        cancellation_details: {
          comment: feedback,
          feedback: reason
        }
      });
    } else {
      // Cancel at period end
      result = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: feedback,
          feedback: reason
        }
      });
    }

    // Update database
    await updateSubscriptionInDatabase(subscriptionId, {
      status: result.status,
      cancelAtPeriodEnd: result.cancel_at_period_end,
      canceledAt: result.canceled_at ? new Date(result.canceled_at * 1000) : null,
      cancellationReason: reason
    });

    // Update agent record
    const userId = result.metadata?.user_id;
    if (userId) {
      await updateAgentSubscription(userId, {
        subscriptionStatus: immediate ? 'cancelled' : 'active', // Still active until period ends
        subscriptionTier: immediate ? null : result.metadata?.tier
      });
    }

    return {
      success: true,
      status: result.status,
      cancelAtPeriodEnd: result.cancel_at_period_end,
      currentPeriodEnd: result.current_period_end,
      immediate
    };

  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error.message);
    throw error;
  }
}

/**
 * Reactivate a subscription that was set to cancel at period end
 * @param {string} subscriptionId - Stripe subscription ID
 */
async function reactivateSubscription(subscriptionId) {
  if (!stripe) {
    return { success: true, mock: true };
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });

    // Update database
    await updateSubscriptionInDatabase(subscriptionId, {
      cancelAtPeriodEnd: false,
      status: subscription.status
    });

    return {
      success: true,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    };

  } catch (error) {
    console.error('❌ Failed to reactivate subscription:', error.message);
    throw error;
  }
}

/**
 * Update subscription record in database
 * @param {string} stripeSubscriptionId - Stripe subscription ID
 * @param {Object} updates - Fields to update
 */
async function updateSubscriptionInDatabase(stripeSubscriptionId, updates) {
  if (!supabase) return;

  const dbUpdates = {};
  if (updates.tier) dbUpdates.tier = updates.tier;
  if (updates.priceId) dbUpdates.price_id = updates.priceId;
  if (updates.interval) dbUpdates.interval = updates.interval;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.cancelAtPeriodEnd !== undefined) dbUpdates.cancel_at_period_end = updates.cancelAtPeriodEnd;
  if (updates.canceledAt) dbUpdates.canceled_at = updates.canceledAt;
  if (updates.cancellationReason) dbUpdates.cancellation_reason = updates.cancellationReason;

  const { error } = await supabase
    .from('subscriptions')
    .update(dbUpdates)
    .eq('stripe_subscription_id', stripeSubscriptionId);

  if (error) {
    console.error('Failed to update subscription in database:', error.message);
  }
}

/**
 * Get subscription with full details
 * @param {string} subscriptionId - Stripe subscription ID or internal ID
 * @returns {Promise<Object>} Full subscription details
 */
async function getSubscriptionDetails(subscriptionId) {
  if (!supabase) {
    return getMockSubscriptionDetails(subscriptionId);
  }

  // Try to find by internal ID first, then Stripe ID
  let query = supabase
    .from('subscriptions')
    .select('*')
    .or(`id.eq.${subscriptionId},stripe_subscription_id.eq.${subscriptionId}`)
    .single();

  const { data: subscription, error } = await query;

  if (error || !subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  // Get recent events
  const { data: events } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('subscription_id', subscription.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('subscription_id', subscription.id)
    .order('created_at', { ascending: false })
    .limit(12);

  // Get current Stripe status if available
  let stripeStatus = null;
  if (stripe && subscription.stripe_subscription_id) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      stripeStatus = {
        status: stripeSub.status,
        currentPeriodEnd: stripeSub.current_period_end,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end
      };
    } catch (err) {
      console.warn('Could not fetch Stripe status:', err.message);
    }
  }

  return {
    ...subscription,
    events: events || [],
    payments: payments || [],
    stripeStatus
  };
}

/**
 * List all subscriptions for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 */
async function listUserSubscriptions(userId, options = {}) {
  if (!supabase) {
    return { subscriptions: [] };
  }

  let query = supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list subscriptions: ${error.message}`);
  }

  return { subscriptions: data || [] };
}

/**
 * Create mock subscription for testing without Stripe
 */
function createMockSubscription(userId, tier, interval) {
  const now = Date.now();
  const periodEnd = now + (interval === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000;
  
  return {
    success: true,
    subscriptionId: 'mock_sub_' + now,
    stripeSubscriptionId: 'mock_stripe_sub_' + now,
    status: 'active',
    tier,
    interval,
    clientSecret: 'mock_secret_' + now,
    mock: true,
    currentPeriodEnd: Math.floor(periodEnd / 1000)
  };
}

/**
 * Get mock subscription details
 */
function getMockSubscriptionDetails(subscriptionId) {
  return {
    id: subscriptionId,
    stripe_subscription_id: 'mock_stripe_' + subscriptionId,
    status: 'active',
    tier: 'professional',
    interval: 'month',
    events: [],
    payments: [],
    mock: true
  };
}

module.exports = {
  // Subscription lifecycle
  createManagedSubscription,
  changeSubscriptionPlan,
  scheduleSubscriptionChange,
  cancelManagedSubscription,
  reactivateSubscription,
  
  // Queries
  getSubscriptionDetails,
  listUserSubscriptions,
  getOrCreateCustomer,
  
  // Utilities
  TIER_PRICES,
  stripe,
  supabase
};
