const Stripe = require('stripe');
const { createClient } = require('../db');
const SubscriptionService = require('./SubscriptionService');
const webhookProcessor = require('../webhook-processor');
const stripePortal = require('./StripeService');

class BillingService {
  constructor(options = {}) {
    this.stripe = options.stripe || (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
    this.db = options.db || (
      process.env.NEXT_PUBLIC_API_URL
        ? createClient(process.env.NEXT_PUBLIC_API_URL, process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY)
        : null
    );
    this.subscriptionService = options.subscriptionService || new SubscriptionService();
    this.webhookProcessor = options.webhookProcessor || webhookProcessor;
    this.stripePortal = options.stripePortal || stripePortal;
  }

  async initializeBilling() {
    const status = {
      stripe: !!this.stripe,
      supabase: !!this.db,
      portal: false,
      webhooks: false,
      errors: []
    };

    try {
      if (this.stripe) {
        await this.stripePortal.configurePortal();
        status.portal = true;
      }

      if (process.env.STRIPE_WEBHOOK_SECRET) {
        status.webhooks = true;
      } else {
        status.errors.push('STRIPE_WEBHOOK_SECRET not set - webhooks will not be verified');
      }

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

      return status;
    } catch (error) {
      status.errors.push(error.message);
      return status;
    }
  }

  async createCompleteSubscription(params) {
    const {
      userId,
      tier,
      interval,
      paymentMethodId,
      trial = false
    } = params;

    const subscription = await this.subscriptionService.createManagedSubscription({
      userId,
      tier,
      interval,
      paymentMethodId,
      trial
    });

    if (!subscription.success) {
      throw new Error('Failed to create subscription');
    }

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
  }

  async changePlan(params) {
    const {
      subscriptionId,
      newTier,
      newInterval,
      effectiveImmediately = true,
      prorationBehavior = 'create_prorations'
    } = params;

    const prorationPreview = await this.calculateProration({
      subscriptionId,
      newPriceId: this.getPriceId(newTier, newInterval)
    });

    if (effectiveImmediately) {
      const result = await this.subscriptionService.changeSubscriptionPlan({
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
    }

    const result = await this.subscriptionService.scheduleSubscriptionChange({
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

  async previewPlanChange(params) {
    const { subscriptionId, newTier, newInterval } = params;
    const [proration, cyclePreview] = await Promise.all([
      this.calculateProration({
        subscriptionId,
        newPriceId: this.getPriceId(newTier, newInterval)
      }),
      this.previewBillingCycleChange({
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
  }

  async getUserSubscriptionStatus(userId) {
    const { subscriptions } = await this.subscriptionService.listUserSubscriptions(userId, {
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

    const cycleInfo = await this.getBillingCycleInfo(
      subscription.stripe_subscription_id
    );

    const { data: payments } = await this.db
      ?.from('payments')
      .select('*')
      .eq('subscription_id', subscription.id)
      .order('created_at', { ascending: false })
      .limit(6) || { data: [] };

    const portalSession = await this.stripePortal.createPortalSession(
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
  }

  async cancelManagedSubscription(params) {
    const {
      subscriptionId,
      immediate = false,
      reason,
      feedback,
      downgradeFeatures = true
    } = params;

    const result = await this.subscriptionService.cancelManagedSubscription({
      subscriptionId,
      immediate,
      reason,
      feedback
    });

    if (immediate && downgradeFeatures) {
      const subscription = await this.stripe?.subscriptions.retrieve(subscriptionId);
      const userId = subscription?.metadata?.user_id;
      if (userId) {
        await this.downgradeUserFeatures(userId);
      }
    }

    return {
      success: true,
      cancelled: true,
      immediate,
      effectiveDate: immediate ? new Date() : result.currentPeriodEnd,
      refundEligible: immediate ? await this.checkRefundEligibility(subscriptionId) : false
    };
  }

  async reactivateSubscription(subscriptionId) {
    const result = await this.subscriptionService.reactivateSubscription(subscriptionId);
    return {
      success: true,
      reactivated: true,
      status: result.status,
      currentPeriodEnd: result.currentPeriodEnd
    };
  }

  async handleWebhook(event) {
    return this.webhookProcessor.processWebhookEvent(event);
  }

  verifyWebhookSignature(payload, signature) {
    if (!this.stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Webhook verification not configured');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  }

  async createCustomerPortal(customerId, options = {}) {
    return this.stripePortal.createPortalSession(customerId, options);
  }

  async getSubscriptionAnalytics(userId) {
    const { subscriptions } = await this.subscriptionService.listUserSubscriptions(userId);
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length;
    const totalSpent = subscriptions.reduce((sum, s) => sum + (s.metadata?.totalSpent || 0), 0);
    const activeSub = subscriptions.find((s) => s.status === 'active');
    const currentMRR = activeSub ? this.calculateMRR(activeSub) : 0;

    return {
      totalSubscriptions,
      activeSubscriptions,
      totalSpent,
      currentMRR,
      subscriptionHistory: subscriptions
    };
  }

  async syncAllSubscriptions() {
    const cycleResult = await this.syncBillingCycles();
    return {
      success: true,
      synced: cycleResult.synced,
      message: `Synced ${cycleResult.synced} subscriptions`
    };
  }

  // ── Billing cycle methods (formerly billing-cycle-manager.js) ────────────

  async getBillingCycleInfo(subscriptionId) {
    if (!this.stripe) {
      return this._mockBillingCycleInfo(subscriptionId);
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    const now = Math.floor(Date.now() / 1000);
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;
    const totalPeriod = periodEnd - periodStart;
    const elapsed = now - periodStart;
    const remaining = periodEnd - now;
    const cycleProgress = Math.min(100, Math.max(0, (elapsed / totalPeriod) * 100));
    const daysRemaining = Math.floor(remaining / 86400);
    const nextBillingDate = new Date(periodEnd * 1000);

    let upcomingInvoice = null;
    try {
      upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({ subscription: subscriptionId });
    } catch (_) {
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
  }

  async calculateProration(params) {
    const { subscriptionId, newPriceId, prorationDate } = params;

    if (!this.stripe) {
      return this._mockProrationCalculation(newPriceId);
    }

    const upcomingInvoiceParams = {
      subscription: subscriptionId,
      subscription_items: [{
        id: (await this.stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
        price: newPriceId
      }],
      subscription_proration_date: prorationDate || Math.floor(Date.now() / 1000)
    };

    const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming(upcomingInvoiceParams);

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
  }

  async previewBillingCycleChange(params) {
    const { subscriptionId, newTier, newInterval } = params;

    if (!this.stripe) {
      return this._mockBillingCyclePreview(newTier, newInterval);
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const currentItem = subscription.items.data[0];
    const targetInterval = newInterval || currentItem.price.recurring.interval;
    const newPriceId = this.getPriceId(newTier, targetInterval);

    if (!newPriceId) {
      throw new Error(`Invalid tier ${newTier} or interval ${targetInterval}`);
    }

    const upcomingInvoice = await this.stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
      subscription_items: [{ id: currentItem.id, price: newPriceId }]
    });

    const newPrice = await this.stripe.prices.retrieve(newPriceId, { expand: ['product'] });

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
  }

  async updateBillingCycle(params) {
    const { subscriptionId, billingCycleAnchor } = params;

    if (!this.stripe) {
      return { success: true, mock: true };
    }

    const subscription = await this.stripe.subscriptions.update(subscriptionId, {
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
  }

  async getRenewalHistory(subscriptionId) {
    if (!this.db) {
      return { renewals: [] };
    }

    const { data: payments, error } = await this.db
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false });

    if (error) throw error;

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
  }

  async getUpcomingRenewals(options = {}) {
    const { userId, days = 30 } = options;

    if (!this.db) {
      return { renewals: [] };
    }

    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    let query = this.db
      .from('subscriptions')
      .select('*, agents:user_id (email, name)')
      .eq('status', 'active')
      .lte('current_period_end', future.toISOString())
      .gte('current_period_end', now.toISOString())
      .order('current_period_end', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

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
  }

  async syncBillingCycles(subscriptionId = null) {
    if (!this.stripe || !this.db) {
      return { synced: 0 };
    }

    let subscriptions;
    if (subscriptionId) {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
      subscriptions = [sub];
    } else {
      const list = await this.stripe.subscriptions.list({ status: 'all', limit: 100 });
      subscriptions = list.data;
    }

    let synced = 0;
    for (const sub of subscriptions) {
      const userId = sub.metadata?.user_id;
      if (!userId) continue;

      const { error } = await this.db
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

      if (!error) synced++;

      await this.db
        .from('real_estate_agents')
        .update({
          subscription_status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000)
        })
        .eq('id', userId);
    }

    return { success: true, synced, totalProcessed: subscriptions.length };
  }

  // ── Mock helpers (used when Stripe is not configured) ────────────────────

  _mockBillingCycleInfo(subscriptionId) {
    const now = Date.now();
    const periodStart = now - 15 * 24 * 60 * 60 * 1000;
    const periodEnd = now + 15 * 24 * 60 * 60 * 1000;
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

  _mockProrationCalculation(newPriceId) {
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

  _mockBillingCyclePreview(tier, interval) {
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

  getPortalConfig() {
    return this.stripePortal.getPortalConfig();
  }

  async createCustomer(agent) {
    if (!this.stripe) {
      return { id: `mock_customer_${agent.id}`, mock: true };
    }

    return this.stripe.customers.create({
      email: agent.email,
      name: agent.name || agent.email,
      metadata: {
        agent_id: agent.id,
        source: 'leadflow_onboarding'
      }
    });
  }

  async createSubscription(customerId, priceId) {
    if (!this.stripe) {
      return { id: `mock_sub_${Date.now()}`, mock: true, status: 'active' };
    }

    const defaultPriceId = process.env.STRIPE_PRICE_BASIC || priceId;
    if (!defaultPriceId) {
      throw new Error('No price ID provided and STRIPE_PRICE_BASIC not set');
    }

    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: defaultPriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        source: 'leadflow_agent_signup'
      }
    });
  }

  async attachPaymentMethod(customerId, paymentMethodId) {
    if (!this.stripe) {
      return { success: true, mock: true };
    }

    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    return { success: true };
  }

  async createSetupIntent(customerId) {
    if (!this.stripe) {
      return { client_secret: `mock_secret_${Date.now()}`, mock: true };
    }

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true }
    });

    return { client_secret: setupIntent.client_secret };
  }

  async getSubscriptionStatus(subscriptionId) {
    if (!this.stripe || subscriptionId.startsWith('mock_')) {
      return { status: 'active', mock: true };
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return {
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    };
  }

  async cancelSubscription(subscriptionId, immediate = false) {
    if (!this.stripe || subscriptionId.startsWith('mock_')) {
      return { status: 'cancelled', mock: true };
    }

    if (immediate) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }

    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
  }

  async createPortalSession(customerId, options = {}) {
    return this.stripePortal.createPortalSession(customerId, options);
  }

  async getCustomerSubscriptions(customerId) {
    return this.stripePortal.getCustomerSubscriptions(customerId);
  }

  async getCustomerInvoices(customerId, options = {}) {
    return this.stripePortal.getCustomerInvoices(customerId, options);
  }

  async getCustomerPaymentMethods(customerId) {
    return this.stripePortal.getCustomerPaymentMethods(customerId);
  }

  getPriceId(tier, interval) {
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

  calculateMRR(subscription) {
    const amount = subscription.metadata?.amount || 0;
    return subscription.interval === 'year' ? amount / 12 : amount;
  }

  async downgradeUserFeatures(userId) {
    console.log(`⬇️ Downgrading features for user: ${userId}`);
  }

  async checkRefundEligibility() {
    return false;
  }
}

module.exports = new BillingService();
module.exports.BillingService = BillingService;
