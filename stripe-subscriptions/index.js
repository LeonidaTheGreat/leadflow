/**
 * Stripe Subscriptions Module Index
 * Central export for all subscription-related functionality
 */

const billingService = require('../lib/services/BillingService');
const billingRoutes = require('../routes/billing');

module.exports = {
  // Main billing service (contains all subscription, portal, webhook, and billing cycle functionality)
  billing: billingService,

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
