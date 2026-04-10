/**
 * Stripe Subscriptions Module Index
 * Central export for all subscription-related functionality
 */

const billingService = require('../lib/services/BillingService');
const subscriptionService = require('../lib/subscription-service');
const billingCycleManager = require('../lib/billing-cycle-manager');
const webhookProcessor = require('../lib/webhook-processor');
const stripePortal = require('../lib/stripe-portal');

module.exports = {
  // Main billing service
  billing: billingService,

  // Sub-modules for advanced use
  subscriptionService,
  billingCycleManager,
  webhookProcessor,
  stripePortal,

  // Convenience exports
  initialize: (...args) => billingService.initializeBilling(...args),
  createSubscription: (...args) => billingService.createCompleteSubscription(...args),
  changePlan: (...args) => billingService.changePlan(...args),
  cancelSubscription: (...args) => billingService.cancelManagedSubscription(...args),
  handleWebhook: (...args) => billingService.handleWebhook(...args),
  createPortalSession: (...args) => billingService.createCustomerPortal(...args)
};
