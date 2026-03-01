/**
 * Stripe Customer Portal Configuration
 * Handles customer portal settings, branding, and session management
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Portal configuration constants
const PORTAL_CONFIG = {
  // Branding colors (LeadFlow brand)
  branding: {
    primary_color: process.env.STRIPE_PORTAL_PRIMARY_COLOR || '#0066FF',
    secondary_color: process.env.STRIPE_PORTAL_SECONDARY_COLOR || '#00D4AA',
    accent_color: process.env.STRIPE_PORTAL_ACCENT_COLOR || '#FF6B35',
    logo_url: process.env.STRIPE_PORTAL_LOGO_URL || 'https://leadflow.ai/logo.png',
    icon_url: process.env.STRIPE_PORTAL_ICON_URL || 'https://leadflow.ai/icon.png',
    favicon_url: process.env.STRIPE_PORTAL_FAVICON_URL || 'https://leadflow.ai/favicon.ico'
  },
  
  // Business information
  business: {
    name: process.env.STRIPE_PORTAL_BUSINESS_NAME || 'LeadFlow AI',
    privacy_policy_url: process.env.STRIPE_PORTAL_PRIVACY_URL || 'https://leadflow.ai/privacy',
    terms_of_service_url: process.env.STRIPE_PORTAL_TERMS_URL || 'https://leadflow.ai/terms'
  },
  
  // Feature toggles
  features: {
    subscription_management: true,
    payment_method_management: true,
    invoice_history: true,
    cancellation_reasons: true,
    coupon_management: true
  }
};

/**
 * Configure Stripe Customer Portal settings
 * This should be called once during app initialization
 * @returns {Promise<Object>} Portal configuration object
 */
async function configurePortal() {
  if (!stripe) {
    console.warn('Stripe not configured - returning mock portal config');
    return {
      mock: true,
      config: PORTAL_CONFIG
    };
  }

  try {
    // Check if portal configuration exists
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 1
    });

    const configData = {
      business_profile: {
        headline: PORTAL_CONFIG.business.name,
        privacy_policy_url: PORTAL_CONFIG.business.privacy_policy_url,
        terms_of_service_url: PORTAL_CONFIG.business.terms_of_service_url
      },
      features: {
        subscription_management: {
          enabled: PORTAL_CONFIG.features.subscription_management,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          cancellation_mode: 'at_period_end',
          cancellation_reason: {
            enabled: PORTAL_CONFIG.features.cancellation_reasons,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'customer_service',
              'too_complex',
              'low_quality',
              'other'
            ]
          }
        },
        payment_method_management: {
          enabled: PORTAL_CONFIG.features.payment_method_management
        },
        invoice_history: {
          enabled: PORTAL_CONFIG.features.invoice_history
        },
        coupon_management: {
          enabled: PORTAL_CONFIG.features.coupon_management
        }
      }
    };

    let configuration;
    
    if (configurations.data.length > 0) {
      // Update existing configuration
      configuration = await stripe.billingPortal.configurations.update(
        configurations.data[0].id,
        configData
      );
      console.log('✅ Updated Stripe Customer Portal configuration:', configuration.id);
    } else {
      // Create new configuration
      configuration = await stripe.billingPortal.configurations.create(configData);
      console.log('✅ Created Stripe Customer Portal configuration:', configuration.id);
    }

    return {
      success: true,
      configurationId: configuration.id,
      config: PORTAL_CONFIG
    };

  } catch (error) {
    console.error('❌ Failed to configure Stripe Customer Portal:', error.message);
    throw error;
  }
}

/**
 * Create a customer portal session
 * @param {string} customerId - Stripe customer ID
 * @param {Object} options - Session options
 * @param {string} options.returnUrl - URL to return to after portal session
 * @param {string} options.locale - Locale for the portal (e.g., 'en', 'fr')
 * @returns {Promise<Object>} Portal session object with URL
 */
async function createPortalSession(customerId, options = {}) {
  if (!customerId) {
    throw new Error('Customer ID is required to create portal session');
  }

  if (!stripe) {
    console.warn('Stripe not configured - returning mock portal session');
    return {
      mock: true,
      url: options.returnUrl || 'https://leadflow.ai/dashboard',
      customerId
    };
  }

  try {
    const sessionConfig = {
      customer: customerId,
      return_url: options.returnUrl || process.env.STRIPE_PORTAL_RETURN_URL || 'https://leadflow.ai/dashboard'
    };

    // Add locale if provided
    if (options.locale) {
      sessionConfig.locale = options.locale;
    }

    // Add configuration if specified
    if (options.configurationId) {
      sessionConfig.configuration = options.configurationId;
    }

    const session = await stripe.billingPortal.sessions.create(sessionConfig);

    console.log(`✅ Created portal session for customer ${customerId}`);
    
    return {
      success: true,
      url: session.url,
      sessionId: session.id,
      customerId: session.customer
    };

  } catch (error) {
    console.error('❌ Failed to create portal session:', error.message);
    throw error;
  }
}

/**
 * Get customer portal configuration
 * @returns {Object} Current portal configuration
 */
function getPortalConfig() {
  return {
    ...PORTAL_CONFIG,
    returnUrl: process.env.STRIPE_PORTAL_RETURN_URL || 'https://leadflow.ai/dashboard'
  };
}

/**
 * Update portal branding configuration
 * @param {Object} branding - Branding updates
 * @returns {Object} Updated configuration
 */
function updatePortalBranding(branding) {
  if (branding.primary_color) {
    PORTAL_CONFIG.branding.primary_color = branding.primary_color;
  }
  if (branding.secondary_color) {
    PORTAL_CONFIG.branding.secondary_color = branding.secondary_color;
  }
  if (branding.logo_url) {
    PORTAL_CONFIG.branding.logo_url = branding.logo_url;
  }
  if (branding.icon_url) {
    PORTAL_CONFIG.branding.icon_url = branding.icon_url;
  }
  
  return PORTAL_CONFIG.branding;
}

/**
 * Get subscription management configuration
 * @returns {Object} Subscription management settings
 */
function getSubscriptionManagementConfig() {
  return {
    enabled: PORTAL_CONFIG.features.subscription_management,
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
      { value: 'low_quality', label: 'Quality didn\'t meet expectations' },
      { value: 'other', label: 'Other reason' }
    ],
    prorationBehavior: 'create_prorations'
  };
}

/**
 * Get payment method management configuration
 * @returns {Object} Payment method settings
 */
function getPaymentMethodConfig() {
  return {
    enabled: PORTAL_CONFIG.features.payment_method_management,
    allowedTypes: ['card', 'bank_transfer'],
    allowMultipleMethods: false,
    requireDefault: true,
    allowRemoval: true
  };
}

/**
 * Get invoice history configuration
 * @returns {Object} Invoice history settings
 */
function getInvoiceHistoryConfig() {
  return {
    enabled: PORTAL_CONFIG.features.invoice_history,
    allowDownload: true,
    allowEmailResend: true,
    maxHistoryMonths: 24
  };
}

/**
 * Get customer's subscription details for portal display
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Subscription details
 */
async function getCustomerSubscriptions(customerId) {
  if (!stripe || customerId.startsWith('mock_')) {
    return {
      mock: true,
      subscriptions: [
        {
          id: 'mock_sub_123',
          status: 'active',
          plan: 'Professional',
          amount: 997.00,
          currency: 'usd',
          interval: 'month',
          currentPeriodStart: Date.now() / 1000 - 86400 * 15,
          currentPeriodEnd: Date.now() / 1000 + 86400 * 15,
          cancelAtPeriodEnd: false
        }
      ]
    };
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
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

/**
 * Get customer's invoice history
 * @param {string} customerId - Stripe customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Invoice list
 */
async function getCustomerInvoices(customerId, options = {}) {
  if (!stripe || customerId.startsWith('mock_')) {
    return {
      mock: true,
      invoices: [
        {
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
        }
      ]
    };
  }

  try {
    const invoices = await stripe.invoices.list({
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

/**
 * Get customer's payment methods
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Payment methods list
 */
async function getCustomerPaymentMethods(customerId) {
  if (!stripe || customerId.startsWith('mock_')) {
    return {
      mock: true,
      paymentMethods: [
        {
          id: 'mock_pm_123',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2027,
          isDefault: true
        }
      ]
    };
  }

  try {
    // Get default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

    // Get all payment methods
    const paymentMethods = await stripe.paymentMethods.list({
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

module.exports = {
  // Configuration
  configurePortal,
  getPortalConfig,
  updatePortalBranding,
  
  // Session management
  createPortalSession,
  
  // Feature configs
  getSubscriptionManagementConfig,
  getPaymentMethodConfig,
  getInvoiceHistoryConfig,
  
  // Customer data
  getCustomerSubscriptions,
  getCustomerInvoices,
  getCustomerPaymentMethods,
  
  // Constants
  PORTAL_CONFIG
};
