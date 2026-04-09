'use strict';

const { createClient } = require('../postgrest-client');

const DEFAULT_TRIAL_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

class SubscriptionService {
  constructor(dbClient, options = {}) {
    this.db = dbClient || SubscriptionService.createDefaultDbClient();
    this.stripe = options.stripe || SubscriptionService.createStripeClient();
    this.tierPrices = options.tierPrices || SubscriptionService.createTierPrices();
    this.now = options.now || (() => Date.now());
  }

  static createStripeClient() {
    if (!process.env.STRIPE_SECRET_KEY) {
      return null;
    }

    try {
      const Stripe = require('stripe');
      return new Stripe(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
      console.warn('Stripe SDK not installed, running without Stripe client');
      return null;
    }
  }

  static createDefaultDbClient() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const apiKey = process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY;

    if (!apiUrl || !apiKey) {
      return null;
    }

    return createClient(apiUrl, apiKey);
  }

  static createTierPrices() {
    return {
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
  }

  getTierPrices() {
    return this.tierPrices;
  }

  async createManagedSubscription(params) {
    const { userId, tier, interval = 'month', paymentMethodId, trial = false } = params;

    if (!this.stripe) {
      console.warn('Stripe not configured - creating mock subscription');
      return this.createMockSubscription(userId, tier, interval);
    }

    try {
      const customer = await this.getOrCreateCustomer(userId);
      const priceId = this.tierPrices[tier]?.[interval];

      if (!priceId) {
        throw new Error(`Invalid tier ${tier} or interval ${interval}`);
      }

      if (paymentMethodId) {
        await this.attachPaymentMethod(customer.id, paymentMethodId);
      }

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

      if (trial) {
        subscriptionParams.trial_period_days = DEFAULT_TRIAL_DAYS;
      }

      const stripeSubscription = await this.stripe.subscriptions.create(subscriptionParams);

      const subscription = await this.persistSubscription({
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

      await this.updateAgentSubscription(userId, {
        subscriptionStatus: stripeSubscription.status,
        subscriptionTier: tier,
        stripeCustomerId: customer.id,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialEndsAt: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
      });

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
      console.error('Failed to create managed subscription:', error.message);
      throw error;
    }
  }

  async getOrCreateCustomer(userId) {
    if (!this.db) {
      throw new Error('Supabase not configured');
    }

    const { data: agent, error } = await this.db
      .from('real_estate_agents')
      .select('stripe_customer_id, email, name')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch agent: ${error.message}`);
    }

    if (agent?.stripe_customer_id) {
      try {
        return await this.stripe.customers.retrieve(agent.stripe_customer_id);
      } catch (_) {
        console.warn('Existing customer not found, creating new one');
      }
    }

    const customer = await this.stripe.customers.create({
      email: agent.email,
      name: agent.name || agent.email,
      metadata: {
        user_id: userId,
        source: 'leadflow'
      }
    });

    await this.db
      .from('real_estate_agents')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId);

    return customer;
  }

  async attachPaymentMethod(customerId, paymentMethodId) {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });
  }

  async persistSubscription(params) {
    if (!this.db) {
      console.warn('Supabase not configured - subscription not persisted');
      return { id: `mock_sub_${this.now()}` };
    }

    const { data, error } = await this.db
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

  async updateAgentSubscription(userId, updates) {
    if (!this.db) {
      return;
    }

    const { error } = await this.db
      .from('real_estate_agents')
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

  async changeSubscriptionPlan(params) {
    const { subscriptionId, newTier, newInterval, prorationBehavior = 'create_prorations' } = params;

    if (!this.stripe) {
      console.warn('Stripe not configured - mock plan change');
      return { success: true, mock: true, newTier };
    }

    try {
      const currentSub = await this.stripe.subscriptions.retrieve(subscriptionId);
      const currentItem = currentSub.items.data[0];
      const targetInterval = newInterval || currentItem.price.recurring.interval;
      const newPriceId = this.tierPrices[newTier]?.[targetInterval];

      if (!newPriceId) {
        throw new Error(`Invalid tier ${newTier} or interval ${targetInterval}`);
      }

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: currentItem.id,
          price: newPriceId
        }],
        proration_behavior: prorationBehavior,
        metadata: {
          ...currentSub.metadata,
          plan_changed_at: this.now().toString(),
          previous_tier: currentSub.metadata.tier,
          new_tier: newTier
        }
      });

      await this.updateSubscriptionInDatabase(subscriptionId, {
        tier: newTier,
        priceId: newPriceId,
        interval: targetInterval,
        status: updatedSubscription.status
      });

      const userId = currentSub.metadata.user_id;
      await this.updateAgentSubscription(userId, {
        subscriptionTier: newTier,
        subscriptionStatus: updatedSubscription.status
      });

      const prorationAmount = this.calculateProrationAmount(currentSub, updatedSubscription);

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
      console.error('Failed to change subscription plan:', error.message);
      throw error;
    }
  }

  calculateProrationAmount(oldSub, newSub) {
    const oldAmount = oldSub.items.data[0].price.unit_amount;
    const newAmount = newSub.items.data[0].price.unit_amount;

    if (oldAmount === newAmount) {
      return 0;
    }

    return newAmount - oldAmount;
  }

  async scheduleSubscriptionChange(params) {
    const { subscriptionId, newTier, newInterval } = params;

    if (!this.stripe) {
      return { success: true, mock: true, scheduled: true };
    }

    try {
      const newPriceId = this.tierPrices[newTier]?.[newInterval];
      if (!newPriceId) {
        throw new Error(`Invalid tier ${newTier} or interval ${newInterval}`);
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pending_update: {
          items: [{ price: newPriceId }]
        }
      });

      if (this.db) {
        await this.db
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
      console.error('Failed to schedule subscription change:', error.message);
      throw error;
    }
  }

  async cancelManagedSubscription(params) {
    const { subscriptionId, immediate = false, reason, feedback } = params;

    if (!this.stripe) {
      return { success: true, mock: true, status: 'cancelled' };
    }

    try {
      let result;

      if (immediate) {
        result = await this.stripe.subscriptions.cancel(subscriptionId, {
          cancellation_details: {
            comment: feedback,
            feedback: reason
          }
        });
      } else {
        result = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: feedback,
            feedback: reason
          }
        });
      }

      await this.updateSubscriptionInDatabase(subscriptionId, {
        status: result.status,
        cancelAtPeriodEnd: result.cancel_at_period_end,
        canceledAt: result.canceled_at ? new Date(result.canceled_at * 1000) : null,
        cancellationReason: reason
      });

      const userId = result.metadata?.user_id;
      if (userId) {
        await this.updateAgentSubscription(userId, {
          subscriptionStatus: immediate ? 'cancelled' : 'active',
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
      console.error('Failed to cancel subscription:', error.message);
      throw error;
    }
  }

  async reactivateSubscription(subscriptionId) {
    if (!this.stripe) {
      return { success: true, mock: true };
    }

    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      await this.updateSubscriptionInDatabase(subscriptionId, {
        cancelAtPeriodEnd: false,
        status: subscription.status
      });

      return {
        success: true,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
      };
    } catch (error) {
      console.error('Failed to reactivate subscription:', error.message);
      throw error;
    }
  }

  async updateSubscriptionInDatabase(stripeSubscriptionId, updates) {
    if (!this.db) {
      return;
    }

    const dbUpdates = {};
    if (updates.tier) dbUpdates.tier = updates.tier;
    if (updates.priceId) dbUpdates.price_id = updates.priceId;
    if (updates.interval) dbUpdates.interval = updates.interval;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.cancelAtPeriodEnd !== undefined) dbUpdates.cancel_at_period_end = updates.cancelAtPeriodEnd;
    if (updates.canceledAt) dbUpdates.canceled_at = updates.canceledAt;
    if (updates.cancellationReason) dbUpdates.cancellation_reason = updates.cancellationReason;

    const { error } = await this.db
      .from('subscriptions')
      .update(dbUpdates)
      .eq('stripe_subscription_id', stripeSubscriptionId);

    if (error) {
      console.error('Failed to update subscription in database:', error.message);
    }
  }

  async getSubscriptionDetails(subscriptionId) {
    if (!this.db) {
      return this.getMockSubscriptionDetails(subscriptionId);
    }

    const { data: subscription, error } = await this.db
      .from('subscriptions')
      .select('*')
      .or(`id.eq.${subscriptionId},stripe_subscription_id.eq.${subscriptionId}`)
      .single();

    if (error || !subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const { data: events } = await this.db
      .from('subscription_events')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: payments } = await this.db
      .from('payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(12);

    let stripeStatus = null;
    if (this.stripe && subscription.stripe_subscription_id) {
      try {
        const stripeSub = await this.stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        stripeStatus = {
          status: stripeSub.status,
          currentPeriodEnd: stripeSub.current_period_end,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end
        };
      } catch (error) {
        console.warn('Could not fetch Stripe status:', error.message);
      }
    }

    return {
      ...subscription,
      events: events || [],
      payments: payments || [],
      stripeStatus
    };
  }

  async listUserSubscriptions(userId, options = {}) {
    if (!this.db) {
      return { subscriptions: [] };
    }

    let query = this.db
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

  createMockSubscription(userId, tier, interval) {
    const now = this.now();
    const dayCount = interval === 'year' ? 365 : 30;
    const periodEnd = now + dayCount * DAY_IN_MS;

    return {
      success: true,
      subscriptionId: `mock_sub_${now}`,
      stripeSubscriptionId: `mock_stripe_sub_${now}`,
      status: 'active',
      tier,
      interval,
      clientSecret: `mock_secret_${now}`,
      mock: true,
      currentPeriodEnd: Math.floor(periodEnd / 1000)
    };
  }

  getMockSubscriptionDetails(subscriptionId) {
    return {
      id: subscriptionId,
      stripe_subscription_id: `mock_stripe_${subscriptionId}`,
      status: 'active',
      tier: 'professional',
      interval: 'month',
      events: [],
      payments: [],
      mock: true
    };
  }
}

module.exports = SubscriptionService;
module.exports.DEFAULT_TRIAL_DAYS = DEFAULT_TRIAL_DAYS;
