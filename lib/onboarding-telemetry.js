/**
 * @deprecated Use lib/services/OnboardingService instead.
 * This shim exists for backward compatibility with existing callers
 * that pass the db client as the first argument to each function.
 */

'use strict';

const OnboardingService = require('./services/OnboardingService');

function logOnboardingEvent(db, agentId, stepName, status, metadata = {}) {
  return new OnboardingService(db).logOnboardingEvent(agentId, stepName, status, metadata);
}

function getFunnelStatus(db) {
  return new OnboardingService(db).getFunnelStatus();
}

function getFunnelConversions(db) {
  return new OnboardingService(db).getFunnelConversions();
}

function checkAndAlertStuckAgents(db) {
  return new OnboardingService(db).checkAndAlertStuckAgents();
}

function createStuckAlerts(db, stuckAgents) {
  return new OnboardingService(db).createStuckAlerts(stuckAgents);
}

function getOnboardingEvents(db, agentId = null, limit = 50) {
  return new OnboardingService(db).getOnboardingEvents(agentId, limit);
}

function isSmokTestAccount(email) {
  return OnboardingService.isSmokTestAccount(email);
}

module.exports = {
  logOnboardingEvent,
  getFunnelStatus,
  getFunnelConversions,
  checkAndAlertStuckAgents,
  createStuckAlerts,
  getOnboardingEvents,
  isSmokTestAccount,
  STEP_INDEX: OnboardingService.STEP_INDEX,
  STEP_NAMES: OnboardingService.STEP_NAMES,
};
