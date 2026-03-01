/**
 * Stripe Webhook Processor
 * Comprehensive handling of all subscription-related webhook events
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

// Event handlers mapping
const EVENT_HANDLERS = {
  // Subscription lifecycle
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'customer.subscription.paused': handleSubscriptionPaused,
  'customer.subscription.resumed': handleSubscriptionResumed,
  'customer.subscription.pending_update_applied': handlePendingUpdateApplied,
  'customer.subscription.pending_update_expired': handlePendingUpdateExpired,
  'customer.subscription.trial_will_end': handleTrialWillEnd,
  
  // Payment/Invoice events
  'invoice.created': handleInvoiceCreated,
  'invoice.finalized': handleInvoiceFinalized,
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_action_required': handlePaymentActionRequired,
  'invoice.upcoming': handleInvoiceUpcoming,
  'invoice.marked_uncollectible': handleInvoiceUncollectible,
  'invoice.voided': handleInvoiceVoided,
  
  // Payment intent events
  'payment_intent.succeeded': handlePaymentIntentSucceeded,
  'payment_intent.payment_failed': handlePaymentIntentFailed,
  'payment_intent.requires_action': handlePaymentIntentRequiresAction,
  
  // Customer events
  'customer.created': handleCustomerCreated,
  'customer.updated': handleCustomerUpdated,
  'customer.deleted': handleCustomerDeleted,
  
  // Payment method events
  'payment_method.attached': handlePaymentMethodAttached,
  'payment_method.detached': handlePaymentMethodDetached,
  
  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
  'checkout.session.expired': handleCheckoutExpired,
  
  // Dispute events
  'charge.dispute.created': handleDisputeCreated,
  'charge.dispute.closed': handleDisputeClosed
};

/**
 * Process incoming webhook event
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} Processing result
 */
async function processWebhookEvent(event) {
  const handler = EVENT_HANDLERS[event.type];
  
  console.log(`📨 Processing webhook: ${event.type} (${event.id})`);

  try {
    // Log event to database
    await logWebhookEvent(event);

    if (handler) {
      const result = await handler(event.data.object);
      
      // Mark event as processed
      await markEventProcessed(event.id);
      
      return {
        success: true,
        type: event.type,
        processed: true,
        result
      };
    } else {
      console.log(`ℹ️ No handler for event type: ${event.type}`);
      return {
        success: true,
        type: event.type,
        processed: false,
        reason: 'No handler registered'
      };
    }

  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error.message);
    
    // Log error
    await logWebhookError(event, error);
    
    throw error;
  }
}

/**
 * Log webhook event to database
 */
async function logWebhookEvent(event) {
  if (!supabase) return;

  try {
    await supabase
      .from('subscription_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        stripe_event_data: event,
        processed_at: new Date()
      });
  } catch (err) {
    console.error('Failed to log webhook event:', err.message);
  }
}

/**
 * Mark event as processed
 */
async function markEventProcessed(eventId) {
  if (!supabase) return;

  try {
    await supabase
      .from('subscription_events')
      .update({ processed_at: new Date() })
      .eq('stripe_event_id', eventId);
  } catch (err) {
    console.error('Failed to mark event processed:', err.message);
  }
}

/**
 * Log webhook processing error
 */
async function logWebhookError(event, error) {
  if (!supabase) return;

  try {
    await supabase
      .from('subscription_events')
      .update({
        processing_error: error.message,
        error_at: new Date()
      })
      .eq('stripe_event_id', event.id);
  } catch (err) {
    console.error('Failed to log webhook error:', err.message);
  }
}

// ==================== SUBSCRIPTION HANDLERS ====================

async function handleSubscriptionCreated(subscription) {
  console.log(`✅ Subscription created: ${subscription.id}`);
  
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('No user_id in subscription metadata');
    return { acknowledged: true, userUpdated: false };
  }

  // Update or create subscription record
  await upsertSubscription(subscription);
  
  // Update agent status
  await updateAgentStatus(userId, {
    subscriptionStatus: subscription.status,
    stripeCustomerId: subscription.customer,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  });

  return { acknowledged: true, userUpdated: true };
}

async function handleSubscriptionUpdated(subscription) {
  console.log(`📝 Subscription updated: ${subscription.id}, Status: ${subscription.status}`);
  
  const userId = subscription.metadata?.user_id;
  
  // Update subscription record
  await upsertSubscription(subscription);
  
  if (userId) {
    await updateAgentStatus(userId, {
      subscriptionStatus: subscription.status,
      subscriptionTier: subscription.metadata?.tier,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  }

  // Check for status-specific actions
  if (subscription.status === 'past_due') {
    await handlePastDueSubscription(subscription);
  }

  return { acknowledged: true, status: subscription.status };
}

async function handleSubscriptionDeleted(subscription) {
  console.log(`🚫 Subscription deleted/cancelled: ${subscription.id}`);
  
  const userId = subscription.metadata?.user_id;
  
  // Update subscription record
  await updateSubscriptionStatus(subscription.id, {
    status: 'canceled',
    endedAt: new Date(subscription.ended_at * 1000),
    cancelAtPeriodEnd: false
  });
  
  if (userId) {
    await updateAgentStatus(userId, {
      subscriptionStatus: 'cancelled',
      subscriptionTier: null,
      currentPeriodEnd: null
    });
    
    // Trigger account downgrade
    await handleAccountDowngrade(userId);
  }

  return { acknowledged: true, subscriptionEnded: true };
}

async function handleSubscriptionPaused(subscription) {
  console.log(`⏸️ Subscription paused: ${subscription.id}`);
  
  await updateSubscriptionStatus(subscription.id, {
    status: 'paused'
  });
  
  const userId = subscription.metadata?.user_id;
  if (userId) {
    await updateAgentStatus(userId, {
      subscriptionStatus: 'paused'
    });
  }

  return { acknowledged: true, status: 'paused' };
}

async function handleSubscriptionResumed(subscription) {
  console.log(`▶️ Subscription resumed: ${subscription.id}`);
  
  await updateSubscriptionStatus(subscription.id, {
    status: subscription.status
  });
  
  const userId = subscription.metadata?.user_id;
  if (userId) {
    await updateAgentStatus(userId, {
      subscriptionStatus: subscription.status
    });
  }

  return { acknowledged: true, status: subscription.status };
}

async function handlePendingUpdateApplied(subscription) {
  console.log(`📌 Pending update applied: ${subscription.id}`);
  
  // Clear pending fields
  await supabase
    .from('subscriptions')
    .update({
      pending_tier: null,
      pending_interval: null,
      pending_change_at: null
    })
    .eq('stripe_subscription_id', subscription.id);

  return { acknowledged: true };
}

async function handlePendingUpdateExpired(subscription) {
  console.log(`⏰ Pending update expired: ${subscription.id}`);
  
  await supabase
    .from('subscriptions')
    .update({
      pending_tier: null,
      pending_interval: null,
      pending_change_at: null
    })
    .eq('stripe_subscription_id', subscription.id);

  return { acknowledged: true };
}

async function handleTrialWillEnd(subscription) {
  console.log(`⚠️ Trial ending soon: ${subscription.id}`);
  
  const userId = subscription.metadata?.user_id;
  if (userId) {
    // Send trial ending notification
    await sendTrialEndingNotification(userId, subscription);
  }

  return { acknowledged: true, notificationSent: !!userId };
}

// ==================== PAYMENT HANDLERS ====================

async function handlePaymentSucceeded(invoice) {
  console.log(`💰 Payment succeeded: ${invoice.id}, Amount: ${invoice.amount_paid / 100}`);
  
  // Record payment
  await recordPayment(invoice, 'succeeded');
  
  // Get subscription and user
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const { data: sub } = await supabase
      ?.from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    if (sub?.user_id) {
      // Update MRR for the agent
      await updateAgentMRR(sub.user_id, invoice);
    }
  }

  return { acknowledged: true, recorded: true };
}

async function handlePaymentFailed(invoice) {
  console.log(`❌ Payment failed: ${invoice.id}`);
  
  // Record failed payment
  await recordPayment(invoice, 'failed');
  
  // Get subscription
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const { data: sub } = await supabase
      ?.from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    if (sub?.user_id) {
      // Send payment failed notification
      await sendPaymentFailedNotification(sub.user_id, invoice);
    }
  }

  return { acknowledged: true, recorded: true };
}

async function handleInvoicePaid(invoice) {
  console.log(`✅ Invoice paid: ${invoice.id}`);
  return { acknowledged: true };
}

async function handlePaymentActionRequired(invoice) {
  console.log(`⚡ Payment action required: ${invoice.id}`);
  
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const { data: sub } = await supabase
      ?.from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    if (sub?.user_id) {
      await sendPaymentActionRequiredNotification(sub.user_id, invoice);
    }
  }

  return { acknowledged: true };
}

async function handleInvoiceCreated(invoice) {
  console.log(`📝 Invoice created: ${invoice.id}`);
  return { acknowledged: true };
}

async function handleInvoiceFinalized(invoice) {
  console.log(`🔒 Invoice finalized: ${invoice.id}`);
  return { acknowledged: true };
}

async function handleInvoiceUpcoming(invoice) {
  console.log(`📅 Upcoming invoice: ${invoice.id}`);
  
  const subscriptionId = invoice.subscription;
  if (subscriptionId) {
    const { data: sub } = await supabase
      ?.from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    
    if (sub?.user_id) {
      await sendUpcomingInvoiceNotification(sub.user_id, invoice);
    }
  }

  return { acknowledged: true };
}

async function handleInvoiceUncollectible(invoice) {
  console.log(`🚫 Invoice marked uncollectible: ${invoice.id}`);
  
  await recordPayment(invoice, 'failed');
  
  return { acknowledged: true };
}

async function handleInvoiceVoided(invoice) {
  console.log(`🗑️ Invoice voided: ${invoice.id}`);
  return { acknowledged: true };
}

// ==================== PAYMENT INTENT HANDLERS ====================

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`💳 Payment intent succeeded: ${paymentIntent.id}`);
  return { acknowledged: true };
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
  return { acknowledged: true };
}

async function handlePaymentIntentRequiresAction(paymentIntent) {
  console.log(`⚡ Payment intent requires action: ${paymentIntent.id}`);
  return { acknowledged: true };
}

// ==================== CUSTOMER HANDLERS ====================

async function handleCustomerCreated(customer) {
  console.log(`👤 Customer created: ${customer.id}`);
  return { acknowledged: true };
}

async function handleCustomerUpdated(customer) {
  console.log(`📝 Customer updated: ${customer.id}`);
  return { acknowledged: true };
}

async function handleCustomerDeleted(customer) {
  console.log(`🗑️ Customer deleted: ${customer.id}`);
  return { acknowledged: true };
}

// ==================== PAYMENT METHOD HANDLERS ====================

async function handlePaymentMethodAttached(paymentMethod) {
  console.log(`💳 Payment method attached: ${paymentMethod.id}`);
  return { acknowledged: true };
}

async function handlePaymentMethodDetached(paymentMethod) {
  console.log(`🗑️ Payment method detached: ${paymentMethod.id}`);
  return { acknowledged: true };
}

// ==================== CHECKOUT HANDLERS ====================

async function handleCheckoutCompleted(session) {
  console.log(`🛒 Checkout completed: ${session.id}`);
  
  // Update checkout session record
  if (supabase && session.client_reference_id) {
    await supabase
      .from('checkout_sessions')
      .update({
        status: 'completed',
        completed_at: new Date(),
        stripe_session_id: session.id
      })
      .eq('id', session.client_reference_id);
  }

  return { acknowledged: true };
}

async function handleCheckoutExpired(session) {
  console.log(`⏰ Checkout expired: ${session.id}`);
  
  if (supabase && session.client_reference_id) {
    await supabase
      .from('checkout_sessions')
      .update({
        status: 'expired'
      })
      .eq('id', session.client_reference_id);
  }

  return { acknowledged: true };
}

// ==================== DISPUTE HANDLERS ====================

async function handleDisputeCreated(dispute) {
  console.log(`⚠️ Dispute created: ${dispute.id}`);
  // Log dispute for manual review
  return { acknowledged: true, requiresReview: true };
}

async function handleDisputeClosed(dispute) {
  console.log(`🔒 Dispute closed: ${dispute.id}, Status: ${dispute.status}`);
  return { acknowledged: true };
}

// ==================== HELPER FUNCTIONS ====================

async function upsertSubscription(stripeSubscription) {
  if (!supabase) return;

  const userId = stripeSubscription.metadata?.user_id;
  
  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: stripeSubscription.customer,
    stripe_subscription_id: stripeSubscription.id,
    status: stripeSubscription.status,
    tier: stripeSubscription.metadata?.tier || 'unknown',
    price_id: stripeSubscription.items.data[0]?.price?.id,
    interval: stripeSubscription.items.data[0]?.price?.recurring?.interval,
    current_period_start: new Date(stripeSubscription.current_period_start * 1000),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000),
    trial_start: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
    trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
    ended_at: stripeSubscription.ended_at ? new Date(stripeSubscription.ended_at * 1000) : null,
    metadata: stripeSubscription.metadata
  };

  // Try to update existing, insert if not exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscription.id)
    .single();

  if (existing) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existing.id);
  } else {
    await supabase
      .from('subscriptions')
      .insert(subscriptionData);
  }
}

async function updateSubscriptionStatus(stripeSubscriptionId, updates) {
  if (!supabase) return;

  const dbUpdates = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.endedAt) dbUpdates.ended_at = updates.endedAt;
  if (updates.cancelAtPeriodEnd !== undefined) dbUpdates.cancel_at_period_end = updates.cancelAtPeriodEnd;

  await supabase
    .from('subscriptions')
    .update(dbUpdates)
    .eq('stripe_subscription_id', stripeSubscriptionId);
}

async function updateAgentStatus(userId, status) {
  if (!supabase) return;

  const updates = {};
  if (status.subscriptionStatus) updates.subscription_status = status.subscriptionStatus;
  if (status.subscriptionTier) updates.subscription_tier = status.subscriptionTier;
  if (status.stripeCustomerId) updates.stripe_customer_id = status.stripeCustomerId;
  if (status.currentPeriodEnd) updates.current_period_end = status.currentPeriodEnd;
  if (status.cancelAtPeriodEnd !== undefined) updates.cancel_at_period_end = status.cancelAtPeriodEnd;

  await supabase
    .from('agents')
    .update(updates)
    .eq('id', userId);
}

async function recordPayment(invoice, status) {
  if (!supabase) return;

  // Find subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  const paymentData = {
    subscription_id: sub?.id,
    user_id: sub?.user_id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
    status,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    receipt_url: invoice.hosted_invoice_url,
    failure_message: status === 'failed' ? invoice.last_finalization_error?.message : null
  };

  await supabase
    .from('payments')
    .upsert(paymentData, { onConflict: 'stripe_invoice_id' });
}

async function updateAgentMRR(userId, invoice) {
  if (!supabase) return;

  // Calculate MRR from invoice
  const subtotal = invoice.subtotal;
  const interval = invoice.lines?.data[0]?.price?.recurring?.interval;
  
  let mrr = subtotal;
  if (interval === 'year') {
    mrr = subtotal / 12;
  }

  await supabase
    .from('agents')
    .update({ mrr: mrr / 100 }) // Convert from cents
    .eq('id', userId);
}

async function handlePastDueSubscription(subscription) {
  console.log(`⚠️ Handling past due subscription: ${subscription.id}`);
  
  const userId = subscription.metadata?.user_id;
  if (userId) {
    await sendPastDueNotification(userId, subscription);
  }
}

async function handleAccountDowngrade(userId) {
  console.log(`⬇️ Handling account downgrade for user: ${userId}`);
  // Implement downgrade logic (e.g., restrict features, downgrade tier)
}

// ==================== NOTIFICATION FUNCTIONS ====================

async function sendTrialEndingNotification(userId, subscription) {
  console.log(`📧 Sending trial ending notification to user: ${userId}`);
  // Implement notification logic
}

async function sendPaymentFailedNotification(userId, invoice) {
  console.log(`📧 Sending payment failed notification to user: ${userId}`);
  // Implement notification logic
}

async function sendPaymentActionRequiredNotification(userId, invoice) {
  console.log(`📧 Sending payment action required notification to user: ${userId}`);
  // Implement notification logic
}

async function sendUpcomingInvoiceNotification(userId, invoice) {
  console.log(`📧 Sending upcoming invoice notification to user: ${userId}`);
  // Implement notification logic
}

async function sendPastDueNotification(userId, subscription) {
  console.log(`📧 Sending past due notification to user: ${userId}`);
  // Implement notification logic
}

module.exports = {
  processWebhookEvent,
  EVENT_HANDLERS,
  // Export individual handlers for testing
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleCheckoutCompleted
};
