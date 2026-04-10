/**
 * WebhookService
 * Handles Stripe webhook signature verification and event processing.
 * Consolidates webhook-handler.js and webhook-processor.js.
 */

const Stripe = require('stripe');
const { createClient } = require('../db');

class WebhookService {
  constructor(options = {}) {
    this.stripe = options.stripe || (
      process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
    );
    this.db = options.db || (
      process.env.NEXT_PUBLIC_API_URL
        ? createClient(
            process.env.NEXT_PUBLIC_API_URL,
            process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY
          )
        : null
    );

    this.EVENT_HANDLERS = {
      // Subscription lifecycle
      'customer.subscription.created': this._handleSubscriptionCreated.bind(this),
      'customer.subscription.updated': this._handleSubscriptionUpdated.bind(this),
      'customer.subscription.deleted': this._handleSubscriptionDeleted.bind(this),
      'customer.subscription.paused': this._handleSubscriptionPaused.bind(this),
      'customer.subscription.resumed': this._handleSubscriptionResumed.bind(this),
      'customer.subscription.pending_update_applied': this._handlePendingUpdateApplied.bind(this),
      'customer.subscription.pending_update_expired': this._handlePendingUpdateExpired.bind(this),
      'customer.subscription.trial_will_end': this._handleTrialWillEnd.bind(this),

      // Payment/Invoice events
      'invoice.created': this._handleInvoiceCreated.bind(this),
      'invoice.finalized': this._handleInvoiceFinalized.bind(this),
      'invoice.payment_succeeded': this._handlePaymentSucceeded.bind(this),
      'invoice.payment_failed': this._handlePaymentFailed.bind(this),
      'invoice.paid': this._handleInvoicePaid.bind(this),
      'invoice.payment_action_required': this._handlePaymentActionRequired.bind(this),
      'invoice.upcoming': this._handleInvoiceUpcoming.bind(this),
      'invoice.marked_uncollectible': this._handleInvoiceUncollectible.bind(this),
      'invoice.voided': this._handleInvoiceVoided.bind(this),

      // Payment intent events
      'payment_intent.succeeded': this._handlePaymentIntentSucceeded.bind(this),
      'payment_intent.payment_failed': this._handlePaymentIntentFailed.bind(this),
      'payment_intent.requires_action': this._handlePaymentIntentRequiresAction.bind(this),

      // Customer events
      'customer.created': this._handleCustomerCreated.bind(this),
      'customer.updated': this._handleCustomerUpdated.bind(this),
      'customer.deleted': this._handleCustomerDeleted.bind(this),

      // Payment method events
      'payment_method.attached': this._handlePaymentMethodAttached.bind(this),
      'payment_method.detached': this._handlePaymentMethodDetached.bind(this),

      // Checkout events
      'checkout.session.completed': this._handleCheckoutCompleted.bind(this),
      'checkout.session.expired': this._handleCheckoutExpired.bind(this),

      // Dispute events
      'charge.dispute.created': this._handleDisputeCreated.bind(this),
      'charge.dispute.closed': this._handleDisputeClosed.bind(this),
    };
  }

  // ==================== PUBLIC API ====================

  /**
   * Process incoming Stripe webhook event.
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<Object>} Processing result
   */
  async processWebhookEvent(event) {
    const handler = this.EVENT_HANDLERS[event.type];

    console.log(`📨 Processing webhook: ${event.type} (${event.id})`);

    try {
      await this._logWebhookEvent(event);

      if (handler) {
        const result = await handler(event.data.object);
        await this._markEventProcessed(event.id);
        return { success: true, type: event.type, processed: true, result };
      } else {
        console.log(`ℹ️ No handler for event type: ${event.type}`);
        return { success: true, type: event.type, processed: false, reason: 'No handler registered' };
      }
    } catch (error) {
      console.error(`❌ Error processing webhook ${event.type}:`, error.message);
      await this._logWebhookError(event, error);
      throw error;
    }
  }

  /**
   * Express request handler for incoming Stripe webhooks.
   * Verifies signature and delegates to processWebhookEvent.
   * Must be mounted with express.raw() body parsing.
   */
  async handleIncomingWebhook(req, res) {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      console.warn('⚠️ Stripe webhook received without signature');
      if (process.env.NODE_ENV !== 'development') {
        return res.status(400).send('Webhook signature missing');
      }
    }

    if (process.env.NODE_ENV === 'production' && process.env.STRIPE_WEBHOOK_SECRET && this.stripe) {
      try {
        const event = this.stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        return this.processWebhookEvent(event)
          .then(() => res.json({ received: true }))
          .catch(err => {
            console.error('Webhook processing error:', err);
            res.status(500).send('Webhook processing failed');
          });
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    // Development mode: process without signature verification
    const event = req.body;
    if (!event || !event.type) {
      return res.status(400).send('Invalid webhook payload');
    }

    return this.processWebhookEvent(event)
      .then(() => res.json({ received: true }))
      .catch(err => {
        console.error('Webhook processing error:', err);
        res.status(500).send('Webhook processing failed');
      });
  }

  // ==================== DATABASE HELPERS ====================

  async _logWebhookEvent(event) {
    if (!this.db) return;
    try {
      await this.db
        .from('subscription_events')
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          stripe_event_data: event,
          processed_at: new Date(),
        });
    } catch (err) {
      console.error('Failed to log webhook event:', err.message);
    }
  }

  async _markEventProcessed(eventId) {
    if (!this.db) return;
    try {
      await this.db
        .from('subscription_events')
        .update({ processed_at: new Date() })
        .eq('stripe_event_id', eventId);
    } catch (err) {
      console.error('Failed to mark event processed:', err.message);
    }
  }

  async _logWebhookError(event, error) {
    if (!this.db) return;
    try {
      await this.db
        .from('subscription_events')
        .update({ processing_error: error.message, error_at: new Date() })
        .eq('stripe_event_id', event.id);
    } catch (err) {
      console.error('Failed to log webhook error:', err.message);
    }
  }

  // ==================== SUBSCRIPTION HANDLERS ====================

  async _handleSubscriptionCreated(subscription) {
    console.log(`✅ Subscription created: ${subscription.id}`);

    const userId = subscription.metadata?.user_id;
    if (!userId) {
      console.warn('No user_id in subscription metadata');
      return { acknowledged: true, userUpdated: false };
    }

    await this._upsertSubscription(subscription);
    await this._updateAgentStatus(userId, {
      subscriptionStatus: subscription.status,
      stripeCustomerId: subscription.customer,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    return { acknowledged: true, userUpdated: true };
  }

  async _handleSubscriptionUpdated(subscription) {
    console.log(`📝 Subscription updated: ${subscription.id}, Status: ${subscription.status}`);

    const userId = subscription.metadata?.user_id;
    await this._upsertSubscription(subscription);

    if (userId) {
      await this._updateAgentStatus(userId, {
        subscriptionStatus: subscription.status,
        subscriptionTier: subscription.metadata?.tier,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }

    if (subscription.status === 'past_due') {
      await this._handlePastDueSubscription(subscription);
    }

    return { acknowledged: true, status: subscription.status };
  }

  async _handleSubscriptionDeleted(subscription) {
    console.log(`🚫 Subscription deleted/cancelled: ${subscription.id}`);

    const userId = subscription.metadata?.user_id;
    await this._updateSubscriptionStatus(subscription.id, {
      status: 'canceled',
      endedAt: new Date(subscription.ended_at * 1000),
      cancelAtPeriodEnd: false,
    });

    if (userId) {
      await this._updateAgentStatus(userId, {
        subscriptionStatus: 'cancelled',
        subscriptionTier: null,
        currentPeriodEnd: null,
      });
      await this._handleAccountDowngrade(userId);
    }

    return { acknowledged: true, subscriptionEnded: true };
  }

  async _handleSubscriptionPaused(subscription) {
    console.log(`⏸️ Subscription paused: ${subscription.id}`);
    await this._updateSubscriptionStatus(subscription.id, { status: 'paused' });

    const userId = subscription.metadata?.user_id;
    if (userId) {
      await this._updateAgentStatus(userId, { subscriptionStatus: 'paused' });
    }

    return { acknowledged: true, status: 'paused' };
  }

  async _handleSubscriptionResumed(subscription) {
    console.log(`▶️ Subscription resumed: ${subscription.id}`);
    await this._updateSubscriptionStatus(subscription.id, { status: subscription.status });

    const userId = subscription.metadata?.user_id;
    if (userId) {
      await this._updateAgentStatus(userId, { subscriptionStatus: subscription.status });
    }

    return { acknowledged: true, status: subscription.status };
  }

  async _handlePendingUpdateApplied(subscription) {
    console.log(`📌 Pending update applied: ${subscription.id}`);
    if (!this.db) return { acknowledged: true };

    await this.db
      .from('subscriptions')
      .update({ pending_tier: null, pending_interval: null, pending_change_at: null })
      .eq('stripe_subscription_id', subscription.id);

    return { acknowledged: true };
  }

  async _handlePendingUpdateExpired(subscription) {
    console.log(`⏰ Pending update expired: ${subscription.id}`);
    if (!this.db) return { acknowledged: true };

    await this.db
      .from('subscriptions')
      .update({ pending_tier: null, pending_interval: null, pending_change_at: null })
      .eq('stripe_subscription_id', subscription.id);

    return { acknowledged: true };
  }

  async _handleTrialWillEnd(subscription) {
    console.log(`⚠️ Trial ending soon: ${subscription.id}`);
    const userId = subscription.metadata?.user_id;
    if (userId) {
      await this._sendTrialEndingNotification(userId, subscription);
    }
    return { acknowledged: true, notificationSent: !!userId };
  }

  // ==================== PAYMENT HANDLERS ====================

  async _handlePaymentSucceeded(invoice) {
    console.log(`💰 Payment succeeded: ${invoice.id}, Amount: ${invoice.amount_paid / 100}`);
    await this._recordPayment(invoice, 'succeeded');

    const subscriptionId = invoice.subscription;
    if (subscriptionId && this.db) {
      const { data: sub } = await this.db
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (sub?.user_id) {
        await this._updateAgentMRR(sub.user_id, invoice);
      }
    }

    return { acknowledged: true, recorded: true };
  }

  async _handlePaymentFailed(invoice) {
    console.log(`❌ Payment failed: ${invoice.id}`);
    await this._recordPayment(invoice, 'failed');

    const subscriptionId = invoice.subscription;
    if (subscriptionId && this.db) {
      const { data: sub } = await this.db
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (sub?.user_id) {
        await this._sendPaymentFailedNotification(sub.user_id, invoice);
      }
    }

    return { acknowledged: true, recorded: true };
  }

  async _handleInvoicePaid(invoice) {
    console.log(`✅ Invoice paid: ${invoice.id}`);
    return { acknowledged: true };
  }

  async _handlePaymentActionRequired(invoice) {
    console.log(`⚡ Payment action required: ${invoice.id}`);
    const subscriptionId = invoice.subscription;
    if (subscriptionId && this.db) {
      const { data: sub } = await this.db
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (sub?.user_id) {
        await this._sendPaymentActionRequiredNotification(sub.user_id, invoice);
      }
    }
    return { acknowledged: true };
  }

  async _handleInvoiceCreated(invoice) {
    console.log(`📝 Invoice created: ${invoice.id}`);
    return { acknowledged: true };
  }

  async _handleInvoiceFinalized(invoice) {
    console.log(`🔒 Invoice finalized: ${invoice.id}`);
    return { acknowledged: true };
  }

  async _handleInvoiceUpcoming(invoice) {
    console.log(`📅 Upcoming invoice: ${invoice.id}`);
    const subscriptionId = invoice.subscription;
    if (subscriptionId && this.db) {
      const { data: sub } = await this.db
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (sub?.user_id) {
        await this._sendUpcomingInvoiceNotification(sub.user_id, invoice);
      }
    }
    return { acknowledged: true };
  }

  async _handleInvoiceUncollectible(invoice) {
    console.log(`🚫 Invoice marked uncollectible: ${invoice.id}`);
    await this._recordPayment(invoice, 'failed');
    return { acknowledged: true };
  }

  async _handleInvoiceVoided(invoice) {
    console.log(`🗑️ Invoice voided: ${invoice.id}`);
    return { acknowledged: true };
  }

  // ==================== PAYMENT INTENT HANDLERS ====================

  async _handlePaymentIntentSucceeded(paymentIntent) {
    console.log(`💳 Payment intent succeeded: ${paymentIntent.id}`);
    return { acknowledged: true };
  }

  async _handlePaymentIntentFailed(paymentIntent) {
    console.log(`❌ Payment intent failed: ${paymentIntent.id}`);
    return { acknowledged: true };
  }

  async _handlePaymentIntentRequiresAction(paymentIntent) {
    console.log(`⚡ Payment intent requires action: ${paymentIntent.id}`);
    return { acknowledged: true };
  }

  // ==================== CUSTOMER HANDLERS ====================

  async _handleCustomerCreated(customer) {
    console.log(`👤 Customer created: ${customer.id}`);
    return { acknowledged: true };
  }

  async _handleCustomerUpdated(customer) {
    console.log(`📝 Customer updated: ${customer.id}`);
    return { acknowledged: true };
  }

  async _handleCustomerDeleted(customer) {
    console.log(`🗑️ Customer deleted: ${customer.id}`);
    return { acknowledged: true };
  }

  // ==================== PAYMENT METHOD HANDLERS ====================

  async _handlePaymentMethodAttached(paymentMethod) {
    console.log(`💳 Payment method attached: ${paymentMethod.id}`);
    return { acknowledged: true };
  }

  async _handlePaymentMethodDetached(paymentMethod) {
    console.log(`🗑️ Payment method detached: ${paymentMethod.id}`);
    return { acknowledged: true };
  }

  // ==================== CHECKOUT HANDLERS ====================

  async _handleCheckoutCompleted(session) {
    console.log(`🛒 Checkout completed: ${session.id}`);

    const userId = session.client_reference_id;
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (this.db && userId) {
      await this.db
        .from('checkout_sessions')
        .update({ status: 'completed', completed_at: new Date(), stripe_session_id: session.id })
        .eq('user_id', userId);
    }

    if (this.db && this.stripe && userId && subscriptionId) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        const lineItem = subscription.items.data[0];
        const priceId = lineItem?.price?.id || 'unknown';
        const interval = lineItem?.price?.recurring?.interval || 'month';
        const tier = subscription.metadata?.tier || 'professional';
        const stripeCustomerId = typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id || subscription.customer;

        const { error } = await this.db.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          tier,
          price_id: priceId,
          interval,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          metadata: subscription.metadata || {},
        }, { onConflict: 'stripe_subscription_id' });

        if (error) {
          console.error('Failed to upsert subscription from checkout:', error.message);
        } else {
          console.log(`✅ Subscription persisted via checkout handler: ${subscription.id}`);
        }

        await this.db
          .from('real_estate_agents')
          .update({
            stripe_customer_id: stripeCustomerId,
            subscription_status: subscription.status,
            plan_tier: tier,
            updated_at: new Date(),
          })
          .eq('id', userId);
      } catch (err) {
        console.error('Error persisting subscription from checkout:', err.message);
      }
    }

    return { acknowledged: true, subscriptionPersisted: !!(userId && subscriptionId) };
  }

  async _handleCheckoutExpired(session) {
    console.log(`⏰ Checkout expired: ${session.id}`);
    if (this.db && session.client_reference_id) {
      await this.db
        .from('checkout_sessions')
        .update({ status: 'expired' })
        .eq('id', session.client_reference_id);
    }
    return { acknowledged: true };
  }

  // ==================== DISPUTE HANDLERS ====================

  async _handleDisputeCreated(dispute) {
    console.log(`⚠️ Dispute created: ${dispute.id}`);
    return { acknowledged: true, requiresReview: true };
  }

  async _handleDisputeClosed(dispute) {
    console.log(`🔒 Dispute closed: ${dispute.id}, Status: ${dispute.status}`);
    return { acknowledged: true };
  }

  // ==================== HELPER METHODS ====================

  async _upsertSubscription(stripeSubscription) {
    if (!this.db) return;

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
      metadata: stripeSubscription.metadata,
    };

    const { data: existing } = await this.db
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', stripeSubscription.id)
      .single();

    if (existing) {
      await this.db.from('subscriptions').update(subscriptionData).eq('id', existing.id);
    } else {
      await this.db.from('subscriptions').insert(subscriptionData);
    }
  }

  async _updateSubscriptionStatus(stripeSubscriptionId, updates) {
    if (!this.db) return;

    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.endedAt) dbUpdates.ended_at = updates.endedAt;
    if (updates.cancelAtPeriodEnd !== undefined) dbUpdates.cancel_at_period_end = updates.cancelAtPeriodEnd;

    await this.db
      .from('subscriptions')
      .update(dbUpdates)
      .eq('stripe_subscription_id', stripeSubscriptionId);
  }

  async _updateAgentStatus(userId, status) {
    if (!this.db) return;

    const updates = {};
    if (status.subscriptionStatus) updates.subscription_status = status.subscriptionStatus;
    if (status.subscriptionTier) updates.subscription_tier = status.subscriptionTier;
    if (status.stripeCustomerId) updates.stripe_customer_id = status.stripeCustomerId;
    if (status.currentPeriodEnd) updates.current_period_end = status.currentPeriodEnd;
    if (status.cancelAtPeriodEnd !== undefined) updates.cancel_at_period_end = status.cancelAtPeriodEnd;

    await this.db.from('real_estate_agents').update(updates).eq('id', userId);
  }

  async _recordPayment(invoice, status) {
    if (!this.db) return;

    const { data: sub } = await this.db
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
      failure_message: status === 'failed' ? invoice.last_finalization_error?.message : null,
    };

    await this.db.from('payments').upsert(paymentData, { onConflict: 'stripe_invoice_id' });
  }

  async _updateAgentMRR(userId, invoice) {
    if (!this.db) return;

    const subtotal = invoice.subtotal;
    const interval = invoice.lines?.data[0]?.price?.recurring?.interval;

    let mrr = subtotal;
    if (interval === 'year') {
      mrr = subtotal / 12;
    }

    await this.db.from('real_estate_agents').update({ mrr: mrr / 100 }).eq('id', userId);
  }

  async _handlePastDueSubscription(subscription) {
    console.log(`⚠️ Handling past due subscription: ${subscription.id}`);
    const userId = subscription.metadata?.user_id;
    if (userId) {
      await this._sendPastDueNotification(userId, subscription);
    }
  }

  async _handleAccountDowngrade(userId) {
    console.log(`⬇️ Downgrading features for user: ${userId}`);
  }

  // ==================== NOTIFICATION METHODS ====================

  async _sendTrialEndingNotification(userId, subscription) {
    console.log(`📧 Sending trial ending notification to user: ${userId}`);
  }

  async _sendPaymentFailedNotification(userId, invoice) {
    console.log(`📧 Sending payment failed notification to user: ${userId}`);
  }

  async _sendPaymentActionRequiredNotification(userId, invoice) {
    console.log(`📧 Sending payment action required notification to user: ${userId}`);
  }

  async _sendUpcomingInvoiceNotification(userId, invoice) {
    console.log(`📧 Sending upcoming invoice notification to user: ${userId}`);
  }

  async _sendPastDueNotification(userId, subscription) {
    console.log(`📧 Sending past due notification to user: ${userId}`);
  }
}

module.exports = new WebhookService();
module.exports.WebhookService = WebhookService;
