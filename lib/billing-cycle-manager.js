/**
 * Billing Cycle Manager
 * Handles renewal dates, billing cycles, prorations, and cycle-related operations
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

/**
 * Get billing cycle information for a subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Billing cycle details
 */
async function getBillingCycleInfo(subscriptionId) {
  if (!stripe) {
    return getMockBillingCycleInfo(subscriptionId);
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const now = Math.floor(Date.now() / 1000);
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;
    const totalPeriod = periodEnd - periodStart;
    const elapsed = now - periodStart;
    const remaining = periodEnd - now;
    
    // Calculate progress through current cycle (0-100)
    const cycleProgress = Math.min(100, Math.max(0, (elapsed / totalPeriod) * 100));
    
    // Calculate days remaining
    const daysRemaining = Math.floor(remaining / 86400);
    
    // Determine next billing date
    const nextBillingDate = new Date(periodEnd * 1000);
    
    // Get upcoming invoice if available
    let upcomingInvoice = null;
    try {
      upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId
      });
    } catch (err) {
      // No upcoming invoice (e.g., subscription ending)
    }

    return {
      success: true,
      subscriptionId,
      status: subscription.status,
      currentPeriod: {
        start: new Date(periodStart * 1000),
        end: nextBillingDate,
        length: totalPeriod,
        elapsed,
        remaining
      },
      cycleProgress: Math.round(cycleProgress * 100) / 100,
      daysRemaining,
      nextBillingDate,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      upcomingInvoice: upcomingInvoice ? {
        amountDue: upcomingInvoice.amount_due / 100,
        subtotal: upcomingInvoice.subtotal / 100,
        tax: upcomingInvoice.tax / 100,
        currency: upcomingInvoice.currency,
        periodStart: new Date(upcomingInvoice.period_start * 1000),
        periodEnd: new Date(upcomingInvoice.period_end * 1000)
      } : null
    };

  } catch (error) {
    console.error('❌ Failed to get billing cycle info:', error.message);
    throw error;
  }
}

/**
 * Calculate proration for plan change
 * @param {Object} params - Proration parameters
 * @param {string} params.subscriptionId - Current subscription ID
 * @param {string} params.newPriceId - New plan price ID
 * @param {string} params.prorationDate - Optional proration date timestamp
 * @returns {Promise<Object>} Proration calculation result
 */
async function calculateProration(params) {
  const { subscriptionId, newPriceId, prorationDate } = params;

  if (!stripe) {
    return getMockProrationCalculation(newPriceId);
  }

  try {
    // Build upcoming invoice with new price
    const upcomingInvoiceParams = {
      subscription: subscriptionId,
      subscription_items: [{
        id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
        price: newPriceId
      }],
      subscription_proration_date: prorationDate || Math.floor(Date.now() / 1000)
    };

    const upcomingInvoice = await stripe.invoices.retrieveUpcoming(upcomingInvoiceParams);

    // Find proration items
    const prorationItems = upcomingInvoice.lines.data.filter(
      line => line.proration || line.amount < 0
    );

    const prorationCharge = prorationItems
      .filter(item => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
    
    const prorationCredit = prorationItems
      .filter(item => item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    const netProration = prorationCharge - prorationCredit;

    return {
      success: true,
      subscriptionId,
      newPriceId,
      prorationDate: prorationDate ? new Date(prorationDate * 1000) : new Date(),
      currency: upcomingInvoice.currency,
      currentPeriod: {
        start: new Date(upcomingInvoice.period_start * 1000),
        end: new Date(upcomingInvoice.period_end * 1000)
      },
      charges: {
        prorationCharge: prorationCharge / 100,
        prorationCredit: prorationCredit / 100,
        netProration: netProration / 100
      },
      newPlanAmount: (upcomingInvoice.subtotal - netProration) / 100,
      totalDue: upcomingInvoice.amount_due / 100,
      breakdown: prorationItems.map(item => ({
        description: item.description,
        amount: item.amount / 100,
        period: item.period ? {
          start: new Date(item.period.start * 1000),
          end: new Date(item.period.end * 1000)
        } : null
      }))
    };

  } catch (error) {
    console.error('❌ Failed to calculate proration:', error.message);
    throw error;
  }
}

/**
 * Preview billing cycle change
 * Shows what the billing cycle will look like after a plan change
 * @param {Object} params - Preview parameters
 */
async function previewBillingCycleChange(params) {
  const { subscriptionId, newTier, newInterval } = params;

  if (!stripe) {
    return getMockBillingCyclePreview(newTier, newInterval);
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];
    
    // Get new price ID
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

    const targetInterval = newInterval || currentItem.price.recurring.interval;
    const newPriceId = TIER_PRICES[newTier]?.[targetInterval];

    if (!newPriceId) {
      throw new Error(`Invalid tier ${newTier} or interval ${targetInterval}`);
    }

    // Get upcoming invoice with new price
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
      subscription_items: [{
        id: currentItem.id,
        price: newPriceId
      }]
    });

    const newPrice = await stripe.prices.retrieve(newPriceId, {
      expand: ['product']
    });

    return {
      success: true,
      current: {
        tier: subscription.metadata.tier,
        interval: currentItem.price.recurring.interval,
        amount: currentItem.price.unit_amount / 100,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      },
      preview: {
        tier: newTier,
        interval: targetInterval,
        amount: newPrice.unit_amount / 100,
        nextBillingDate: new Date(subscription.current_period_end * 1000),
        immediateCharge: upcomingInvoice.amount_due / 100,
        currency: upcomingInvoice.currency
      },
      change: {
        effectiveDate: 'immediately',
        nextRegularBilling: new Date(subscription.current_period_end * 1000)
      }
    };

  } catch (error) {
    console.error('❌ Failed to preview billing cycle:', error.message);
    throw error;
  }
}

/**
 * Update billing cycle (change billing anchor date)
 * Note: This typically resets the billing cycle
 * @param {Object} params - Update parameters
 */
async function updateBillingCycle(params) {
  const { subscriptionId, billingCycleAnchor } = params;

  if (!stripe) {
    return { success: true, mock: true };
  }

  try {
    // Reset billing cycle anchor
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      billing_cycle_anchor: billingCycleAnchor || 'now',
      proration_behavior: 'create_prorations'
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      newPeriodStart: new Date(subscription.current_period_start * 1000),
      newPeriodEnd: new Date(subscription.current_period_end * 1000),
      prorationApplied: true
    };

  } catch (error) {
    console.error('❌ Failed to update billing cycle:', error.message);
    throw error;
  }
}

/**
 * Get subscription renewal history
 * @param {string} subscriptionId - Subscription ID
 */
async function getRenewalHistory(subscriptionId) {
  if (!supabase) {
    return { renewals: [] };
  }

  try {
    // Get payment history for this subscription
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const renewals = (payments || []).map(payment => ({
      date: payment.created_at,
      amount: payment.amount,
      currency: payment.currency,
      periodStart: payment.period_start,
      periodEnd: payment.period_end,
      invoiceId: payment.stripe_invoice_id,
      status: payment.status
    }));

    return {
      success: true,
      subscriptionId,
      renewals,
      totalRenewals: renewals.length,
      lifetimeValue: renewals.reduce((sum, r) => sum + r.amount, 0)
    };

  } catch (error) {
    console.error('❌ Failed to get renewal history:', error.message);
    throw error;
  }
}

/**
 * Get upcoming renewals (for all active subscriptions or specific user)
 * @param {Object} options - Query options
 * @param {string} options.userId - Optional user ID filter
 * @param {number} options.days - Number of days to look ahead
 */
async function getUpcomingRenewals(options = {}) {
  const { userId, days = 30 } = await options;

  if (!supabase) {
    return { renewals: [] };
  }

  try {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('subscriptions')
      .select(`
        *,
        agents:user_id (email, name)
      `)
      .eq('status', 'active')
      .lte('current_period_end', future.toISOString())
      .gte('current_period_end', now.toISOString())
      .order('current_period_end', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return {
      success: true,
      renewals: (data || []).map(sub => ({
        subscriptionId: sub.id,
        stripeSubscriptionId: sub.stripe_subscription_id,
        userId: sub.user_id,
        userEmail: sub.agents?.email,
        tier: sub.tier,
        amount: sub.metadata?.amount || null,
        renewalDate: sub.current_period_end,
        daysUntil: Math.ceil((new Date(sub.current_period_end) - now) / (1000 * 60 * 60 * 24))
      })),
      total: data?.length || 0
    };

  } catch (error) {
    console.error('❌ Failed to get upcoming renewals:', error.message);
    throw error;
  }
}

/**
 * Sync billing cycles from Stripe to database
 * Ensures database is in sync with Stripe state
 * @param {string} subscriptionId - Optional specific subscription to sync
 */
async function syncBillingCycles(subscriptionId = null) {
  if (!stripe || !supabase) {
    return { synced: 0 };
  }

  try {
    let subscriptions;

    if (subscriptionId) {
      // Sync specific subscription
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      subscriptions = [sub];
    } else {
      // Sync all active subscriptions
      const list = await stripe.subscriptions.list({
        status: 'all',
        limit: 100
      });
      subscriptions = list.data;
    }

    let synced = 0;

    for (const sub of subscriptions) {
      const userId = sub.metadata?.user_id;
      if (!userId) continue;

      // Update subscription in database
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000),
          current_period_end: new Date(sub.current_period_end * 1000),
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
          ended_at: sub.ended_at ? new Date(sub.ended_at * 1000) : null
        })
        .eq('stripe_subscription_id', sub.id);

      if (!error) {
        synced++;
      }

      // Update agent record
      await supabase
        .from('real_estate_agents')
        .update({
          subscription_status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000)
        })
        .eq('id', userId);
    }

    return {
      success: true,
      synced,
      totalProcessed: subscriptions.length
    };

  } catch (error) {
    console.error('❌ Failed to sync billing cycles:', error.message);
    throw error;
  }
}

// Mock functions for testing without Stripe
function getMockBillingCycleInfo(subscriptionId) {
  const now = Date.now();
  const periodStart = now - 15 * 24 * 60 * 60 * 1000; // 15 days ago
  const periodEnd = now + 15 * 24 * 60 * 60 * 1000; // 15 days remaining
  
  return {
    success: true,
    subscriptionId,
    status: 'active',
    currentPeriod: {
      start: new Date(periodStart),
      end: new Date(periodEnd),
      length: 30 * 24 * 60 * 60,
      elapsed: 15 * 24 * 60 * 60,
      remaining: 15 * 24 * 60 * 60
    },
    cycleProgress: 50,
    daysRemaining: 15,
    nextBillingDate: new Date(periodEnd),
    cancelAtPeriodEnd: false,
    upcomingInvoice: {
      amountDue: 997.00,
      subtotal: 997.00,
      tax: 0,
      currency: 'usd',
      periodStart: new Date(periodEnd),
      periodEnd: new Date(periodEnd + 30 * 24 * 60 * 60 * 1000)
    }
  };
}

function getMockProrationCalculation(newPriceId) {
  return {
    success: true,
    newPriceId,
    prorationDate: new Date(),
    currency: 'usd',
    currentPeriod: {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    charges: {
      prorationCharge: 500.00,
      prorationCredit: 250.00,
      netProration: 250.00
    },
    newPlanAmount: 997.00,
    totalDue: 1247.00,
    breakdown: [
      { description: 'Remaining time on current plan', amount: -250.00 },
      { description: 'New plan proration', amount: 500.00 }
    ]
  };
}

function getMockBillingCyclePreview(tier, interval) {
  return {
    success: true,
    current: {
      tier: 'starter',
      interval: 'month',
      amount: 297.00,
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    },
    preview: {
      tier,
      interval,
      amount: tier === 'professional' ? 997.00 : 1997.00,
      nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      immediateCharge: 450.00,
      currency: 'usd'
    },
    change: {
      effectiveDate: 'immediately',
      nextRegularBilling: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    }
  };
}

module.exports = {
  // Billing cycle info
  getBillingCycleInfo,
  previewBillingCycleChange,
  updateBillingCycle,
  
  // Proration
  calculateProration,
  
  // Renewals
  getRenewalHistory,
  getUpcomingRenewals,
  
  // Sync
  syncBillingCycles
};
