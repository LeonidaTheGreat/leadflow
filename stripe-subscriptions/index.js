/**
 * Stripe Subscriptions Module Index
 * Central export for all subscription-related functionality
 */

const billingService = require('../lib/services/BillingService');
const SubscriptionService = require('../lib/services/SubscriptionService');
const subscriptionService = new SubscriptionService();
const billingCycleManager = require('../lib/billing-cycle-manager');
const webhookService = require('../lib/services/WebhookService');
const stripePortal = require('../lib/stripe-portal');
const billingRoutes = require('../routes/billing');

module.exports = {
  // Main billing service
  billing: billingService,

  // Sub-modules for advanced use
  subscriptionService,
  billingCycleManager,
  webhookProcessor: webhookService,
  stripePortal,

  // Routes
  routes: billingRoutes,

  // Convenience exports
  initialize: (...args) => billingService.initializeBilling(...args),
  createSubscription: (...args) => billingService.createCompleteSubscription(...args),
  changePlan: (...args) => billingService.changePlan(...args),
  cancelSubscription: (...args) => billingService.cancelManagedSubscription(...args),
  handleWebhook: (...args) => billingService.handleWebhook(...args),
  createPortalSession: (...args) => billingService.createCustomerPortal(...args)
};
