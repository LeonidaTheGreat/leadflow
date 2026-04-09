/**
 * Satisfaction Service — backward-compat shim
 * The canonical implementation is lib/services/SatisfactionService.js (class-based).
 * This file re-exports named functions for existing callers.
 */

const SatisfactionService = require('./services/SatisfactionService');

const SATISFACTION_PING_MESSAGE =
  'Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)';
const SATISFACTION_COOLDOWN_MS = 10 * 60 * 1000;

const _instance = new SatisfactionService();

/**
 * Send a satisfaction ping. opts.agentSatisfactionPingEnabled controls whether pings are sent.
 * Checks SATISFACTION_COOLDOWN_MS before sending.
 */
async function sendSatisfactionPing(opts) {
  return _instance.sendSatisfactionPing(opts);
}

/**
 * Schedule a satisfaction ping via setTimeout after SATISFACTION_COOLDOWN_MS delay.
 * Uses setTimeout internally for async scheduling.
 */
function scheduleSatisfactionPing(opts) {
  return _instance.scheduleSatisfactionPing(opts);
}

async function getPendingSatisfactionPing(leadId) {
  return _instance.getPendingSatisfactionPing(leadId);
}

function classifyReply(reply) {
  return _instance.classifyReply(reply);
}

async function recordSatisfactionReply(eventId, rawReply, rating) {
  return _instance.recordSatisfactionReply(eventId, rawReply, rating);
}

module.exports = {
  sendSatisfactionPing,
  scheduleSatisfactionPing,
  getPendingSatisfactionPing,
  classifyReply,
  recordSatisfactionReply,
  SATISFACTION_PING_MESSAGE,
  SATISFACTION_COOLDOWN_MS,
};
