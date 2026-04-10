/**
 * StripeService — Stripe Customer Portal Configuration and Session Management
 * Handles customer portal settings, branding, and session management
 */

const Stripe = require('stripe');

const PORTAL_CONFIG = {
  branding: {
    primary_color: process.env.STRIPE_PORTAL_PRIMARY_COLOR || '#0066FF',
    secondary_color: process.env.STRIPE_PORTAL_SECONDARY_COLOR || '#00D4AA',
    accent_color: process.env.STRIPE_PORTAL_ACCENT_COLOR || '#FF6B35',
    logo_url: process.env.STRIPE_PORTAL_LOGO_URL || 'https://leadflow.ai/logo.png',
    icon_url: process.env.STRIPE_PORTAL_ICON_URL || 'https://leadflow.ai/icon.png',
    favicon_url: process.env.STRIPE_PORTAL_FAVICON_URL || 'https://leadflow.ai/favicon.ico'
  },
  business: {
    name: process.env.STRIPE_PORTAL_BUSINESS_NAME || 'LeadFlow AI',
    privacy_policy_url: process.env.STRIPE_PORTAL_PRIVACY_URL || 'https://leadflow.ai/privacy',
    terms_of_service_url: process.env.STRIPE_PORTAL_TERMS_URL || 'https://leadflow.ai/terms'
  },
  features: {
    subscription_management: true,
    payment_method_management: true,
    invoice_history: true,
    cancellation_reasons: true,
    coupon_management: true
  }
};

class StripeService {
  constructor(options = {}) {
    this.stripe = options.stripe || (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
    this.config = options.config || PORTAL_CONFIG;
  }

  async configurePortal() {
    if (!this.stripe) {
      console.warn('Stripe not configured - returning mock portal config');
      return { mock: true, config: this.config };
    }

    try {
      const configurations = await this.stripe.billingPortal.configurations.list({ limit: 1 });

      const configData = {
        business_profile: {
          headline: this.config.business.name,
          privacy_policy_url: this.config.business.privacy_policy_url,
          terms_of_service_url: this.config.business.terms_of_service_url
        },
        features: {
          subscription_management: {
            enabled: this.config.features.subscription_management,
            default_allowed_updates: ['price', 'quantity', 'promotion_code'],
            proration_behavior: 'create_prorations',
            cancellation_mode: 'at_period_end',
            cancellation_reason: {
              enabled: this.config.features.cancellation_reasons,
              options: [
                'too_expensive', 'missing_features', 'switched_service', 'unused',
                'customer_service', 'too_complex', 'low_quality', 'other'
              ]
            }
          },
          payment_method_management: {
            enabled: this.config.features.payment_method_management
          },
          invoice_history: {
            enabled: this.config.features.invoice_history
          },
          coupon_management: {
            enabled: this.config.features.coupon_management
          }
        }
      };

      let configuration;
      if (configurations.data.length > 0) {
        configuration = await this.stripe.billingPortal.configurations.update(
          configurations.data[0].id, configData
        );
        console.log('✅ Updated Stripe Customer Portal configuration:', configuration.id);
      } else {
        configuration = await this.stripe.billingPortal.configurations.create(configData);
        console.log('✅ Created Stripe Customer Portal configuration:', configuration.id);
      }

      return { success: true, configurationId: configuration.id, config: this.config };
    } catch (error) {
      console.error('❌ Failed to configure Stripe Customer Portal:', error.message);
      throw error;
    }
  }

  async createPortalSession(customerId, options = {}) {
    if (!customerId) {
      throw new Error('Customer ID is required to create portal session');
    }

    if (!this.stripe) {
      console.warn('Stripe not configured - returning mock portal session');
      return { mock: true, url: options.returnUrl || 'https://leadflow.ai/dashboard', customerId };
    }

    try {
      const sessionConfig = {
        customer: customerId,
        return_url: options.returnUrl || process.env.STRIPE_PORTAL_RETURN_URL || 'https://leadflow.ai/dashboard'
      };

      if (options.locale) sessionConfig.locale = options.locale;
      if (options.configurationId) sessionConfig.configuration = options.configurationId;

      const session = await this.stripe.billingPortal.sessions.create(sessionConfig);
      console.log(`✅ Created portal session for customer ${customerId}`);

      return { success: true, url: session.url, sessionId: session.id, customerId: session.customer };
    } catch (error) {
      console.error('❌ Failed to create portal session:', error.message);
      throw error;
    }
  }

  getPortalConfig() {
    return {
      ...this.config,
      returnUrl: process.env.STRIPE_PORTAL_RETURN_URL || 'https://leadflow.ai/dashboard'
    };
  }

  updatePortalBranding(branding) {
    if (branding.primary_color) this.config.branding.primary_color = branding.primary_color;
    if (branding.secondary_color) this.config.branding.secondary_color = branding.secondary_color;
    if (branding.logo_url) this.config.branding.logo_url = branding.logo_url;
    if (branding.icon_url) this.config.branding.icon_url = branding.icon_url;
    return this.config.branding;
  }

  getSubscriptionManagementConfig() {
    return {
      enabled: this.config.features.subscription_management,
      allowPlanChanges: true,
      allowQuantityUpdates: true,
      allowPause: false,
      cancellationMode: 'at_period_end',
      cancellationReasons: [
        { value: 'too_expensive', label: 'Too expensive' },
        { value: 'missing_features', label: 'Missing features I need' },
        { value: 'switched_service', label: 'Switched to a different service' },
        { value: 'unused', label: "I don't use it enough" },
        { value: 'customer_service', label: 'Customer service issues' },
        { value: 'too_complex', label: 'Too complicated to use' },
        { value: 'low_quality', label: "Quality didn't meet expectations" },
        { value: 'other', label: 'Other reason' }
      ],
      prorationBehavior: 'create_prorations'
    };
  }

  getPaymentMethodConfig() {
    return {
      enabled: this.config.features.payment_method_management,
      allowedTypes: ['card', 'bank_transfer'],
      allowMultipleMethods: false,
      requireDefault: true,
      allowRemoval: true
    };
  }

  getInvoiceHistoryConfig() {
    return {
      enabled: this.config.features.invoice_history,
      allowDownload: true,
      allowEmailResend: true,
      maxHistoryMonths: 24
    };
  }

  async getCustomerSubscriptions(customerId) {
    if (!this.stripe || customerId.startsWith('mock_')) {
      return {
        mock: true,
        subscriptions: [{
          id: 'mock_sub_123',
          status: 'active',
          plan: 'Professional',
          amount: 997.00,
          currency: 'usd',
          interval: 'month',
          currentPeriodStart: Date.now() / 1000 - 86400 * 15,
          currentPeriodEnd: Date.now() / 1000 + 86400 * 15,
          cancelAtPeriodEnd: false
        }]
      };
    }

    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.items.price.product']
      });

      return {
        success: true,
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          plan: sub.items.data[0]?.price?.product?.name || 'Unknown Plan',
          amount: sub.items.data[0]?.price?.unit_amount / 100,
          currency: sub.currency,
          interval: sub.items.data[0]?.price?.recurring?.interval,
          currentPeriodStart: sub.current_period_start,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          canceledAt: sub.canceled_at,
          endedAt: sub.ended_at
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get customer subscriptions:', error.message);
      throw error;
    }
  }

  async getCustomerInvoices(customerId, options = {}) {
    if (!this.stripe || customerId.startsWith('mock_')) {
      return {
        mock: true,
        invoices: [{
          id: 'mock_inv_123',
          number: 'INV-001',
          amountDue: 997.00,
          amountPaid: 997.00,
          currency: 'usd',
          status: 'paid',
          created: Date.now() / 1000 - 86400 * 15,
          periodStart: Date.now() / 1000 - 86400 * 30,
          periodEnd: Date.now() / 1000 - 86400 * 1,
          pdfUrl: 'https://leadflow.ai/mock-invoice.pdf'
        }]
      };
    }

    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: options.limit || 24,
        starting_after: options.startingAfter
      });

      return {
        success: true,
        invoices: invoices.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amountDue: inv.amount_due / 100,
          amountPaid: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          created: inv.created,
          periodStart: inv.period_start,
          periodEnd: inv.period_end,
          pdfUrl: inv.invoice_pdf,
          hostedInvoiceUrl: inv.hosted_invoice_url
        })),
        hasMore: invoices.has_more
      };
    } catch (error) {
      console.error('❌ Failed to get customer invoices:', error.message);
      throw error;
    }
  }

  async getCustomerPaymentMethods(customerId) {
    if (!this.stripe || customerId.startsWith('mock_')) {
      return {
        mock: true,
        paymentMethods: [{
          id: 'mock_pm_123',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2027,
          isDefault: true
        }]
      };
    }

    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return {
        success: true,
        defaultPaymentMethod,
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          expMonth: pm.card?.exp_month,
          expYear: pm.card?.exp_year,
          isDefault: pm.id === defaultPaymentMethod
        }))
      };
    } catch (error) {
      console.error('❌ Failed to get customer payment methods:', error.message);
      throw error;
    }
  }
}

module.exports = new StripeService();
module.exports.StripeService = StripeService;
