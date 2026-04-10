/**
 * Backward-compatibility re-export.
 * New code should import OnboardingTelemetryService from './services/OnboardingTelemetryService' directly.
 */
'use strict';
const OnboardingTelemetryService = require('./services/OnboardingTelemetryService');
module.exports = {
  STEP_INDEX: OnboardingTelemetryService.STEP_INDEX,
  STEP_NAMES: OnboardingTelemetryService.STEP_NAMES,
  isSmokTestAccount: (email) => OnboardingTelemetryService.isSmokTestAccount(email),
  logOnboardingEvent: (supabase, agentId, stepName, status, metadata) =>
    new OnboardingTelemetryService(supabase).logOnboardingEvent(agentId, stepName, status, metadata),
  getFunnelStatus: (supabase) => new OnboardingTelemetryService(supabase).getFunnelStatus(),
  getFunnelConversions: (supabase) => new OnboardingTelemetryService(supabase).getFunnelConversions(),
  checkAndAlertStuckAgents: (supabase) => new OnboardingTelemetryService(supabase).checkAndAlertStuckAgents(),
  createStuckAlerts: (supabase, stuckAgents) => new OnboardingTelemetryService(supabase).createStuckAlerts(stuckAgents),
  getOnboardingEvents: (supabase, agentId, limit) => new OnboardingTelemetryService(supabase).getOnboardingEvents(agentId, limit),
};
