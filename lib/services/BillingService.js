const Stripe = require('stripe');
const { createClient } = require('../postgrest-client');
const subscriptionService = require('../subscription-service');
const billingCycleManager = require('../billing-cycle-manager');
const webhookProcessor = require('../webhook-processor');
const stripePortal = require('../stripe-portal');

class BillingService {
  constructor(options = {}) {
    this.stripe = options.stripe || (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
    this.db = options.db || (
      process.env.NEXT_PUBLIC_API_URL
        ? createClient(process.env.NEXT_PUBLIC_API_URL, process.env.API_SECRET_KEY || process.env.LEADFLOW_API_KEY)
        : null
    );
    this.subscriptionService = options.subscriptionService || subscriptionService;
    this.billingCycleManager = options.billingCycleManager || billingCycleManager;
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

    const prorationPreview = await this.billingCycleManager.calculateProration({
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
      this.billingCycleManager.calculateProration({
        subscriptionId,
        newPriceId: this.getPriceId(newTier, newInterval)
      }),
      this.billingCycleManager.previewBillingCycleChange({
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

    const cycleInfo = await this.billingCycleManager.getBillingCycleInfo(
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
    const cycleResult = await this.billingCycleManager.syncBillingCycles();
    return {
      success: true,
      synced: cycleResult.synced,
      message: `Synced ${cycleResult.synced} subscriptions`
    };
  }

  async getBillingCycleInfo(subscriptionId) {
    return this.billingCycleManager.getBillingCycleInfo(subscriptionId);
  }

  async getRenewalHistory(subscriptionId) {
    return this.billingCycleManager.getRenewalHistory(subscriptionId);
  }

  async getUpcomingRenewals(options = {}) {
    return this.billingCycleManager.getUpcomingRenewals(options);
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
