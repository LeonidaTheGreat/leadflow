'use strict';

const PilotConversionService = require('./services/PilotConversionService');
const EmailService = require('./services/EmailService');

// .trim() guards against trailing whitespace/newlines in env var values (e.g. from .env files)
const RESEND_API_KEY = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : undefined;
const FROM_EMAIL = (process.env.FROM_EMAIL || 'stojan@leadflow.ai').trim();
const FROM_NAME = 'LeadFlow';

function createDefaultPilotConversionService() {
  return new PilotConversionService(
    PilotConversionService.createDefaultDbClient(),
    new EmailService({
      apiKey: RESEND_API_KEY,
      fromEmail: FROM_EMAIL,
      fromName: FROM_NAME
    })
  );
}

const defaultService = createDefaultPilotConversionService();

module.exports = defaultService;
module.exports.PilotConversionService = PilotConversionService;
module.exports.createDefaultPilotConversionService = createDefaultPilotConversionService;
module.exports.MILESTONES = PilotConversionService.MILESTONES;
module.exports.runConversionSequence = defaultService.runConversionSequence.bind(defaultService);
module.exports.runDailyConversionSequence = defaultService.runDailyConversionSequence.bind(defaultService);
module.exports.processMilestone = defaultService.processMilestone.bind(defaultService);
module.exports.sendConversionEmail = defaultService.sendConversionEmail.bind(defaultService);
module.exports.getEligibleAgents = defaultService.getEligibleAgents.bind(defaultService);
module.exports.getAgentStats = defaultService.getAgentStats.bind(defaultService);
module.exports.hasAgentUpgraded = defaultService.hasAgentUpgraded.bind(defaultService);
module.exports.isSupabaseConfigured = defaultService.isSupabaseConfigured.bind(defaultService);
module.exports.isResendConfigured = defaultService.isResendConfigured.bind(defaultService);
module.exports.getSequenceStatus = defaultService.getSequenceStatus.bind(defaultService);
module.exports.getAgentStatus = defaultService.getAgentStatus.bind(defaultService);
