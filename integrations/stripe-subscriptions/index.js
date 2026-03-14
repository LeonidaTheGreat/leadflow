/**
 * Stripe Subscriptions Module Index
 * Central export for all subscription-related functionality
 */

const billingEnhanced = require('./lib/billing-enhanced');
const subscriptionService = require('./lib/subscription-service');
const billingCycleManager = require('./lib/billing-cycle-manager');
const webhookProcessor = require('./lib/webhook-processor');
const stripePortal = require('./lib/stripe-portal');
const billingRoutes = require('./routes/billing-enhanced');

// Legacy exports for backward compatibility
const legacyBilling = require('./lib/billing');

module.exports = {
  // Main enhanced billing module
  billing: billingEnhanced,
  
  // Sub-modules for advanced use
  subscriptionService,
  billingCycleManager,
  webhookProcessor,
  stripePortal,
  
  // Routes
  routes: billingRoutes,
  
  // Legacy compatibility
  legacy: legacyBilling,
  
  // Convenience exports
  initialize: billingEnhanced.initializeBilling,
  createSubscription: billingEnhanced.createCompleteSubscription,
  changePlan: billingEnhanced.changePlan,
  cancelSubscription: billingEnhanced.cancelSubscription,
  handleWebhook: billingEnhanced.handleWebhook,
  createPortalSession: billingEnhanced.createCustomerPortal
};
