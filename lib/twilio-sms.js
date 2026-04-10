/**
 * Backward-compatibility shim.
 * All logic now lives in lib/services/TwilioService.js.
 * This file re-exports the same public API so existing callers
 * (tests, scripts) continue to work without changes.
 */
'use strict';

const TwilioService = require('./services/TwilioService');

const _instance = new TwilioService();

module.exports = {
  sendSmsViatwilio: _instance.sendSms.bind(_instance),
  updateSmsStatus: _instance.updateSmsStatus.bind(_instance),
  getSmsStatus: _instance.getSmsStatus.bind(_instance),
  getSmsHistoryForLead: _instance.getSmsHistoryForLead.bind(_instance),
  getSmsAnalytics: _instance.getSmsAnalytics.bind(_instance),
  DeliveryStatus: TwilioService.DeliveryStatus,
  TwilioErrorCodes: TwilioService.TwilioErrorCodes,
  A2P_ERROR_CODE_SET: TwilioService.A2P_ERROR_CODE_SET,
  SMS_CONFIG: _instance.smsConfig,
  resolveTwilioContext: _instance.resolveTwilioContext.bind(_instance),
  getPlatformTwilioClient: _instance.getPlatformTwilioClient.bind(_instance),
  validateSmsInput: _instance.validateSmsInput.bind(_instance),
  selectFromNumber: _instance.selectFromNumber.bind(_instance),
  truncateMessage: _instance.truncateMessage.bind(_instance),
  classifyTwilioError: TwilioService.classifyTwilioError,
  isA2pBlockedError: TwilioService.isA2pBlockedError,
  cleanEnvValue: TwilioService.cleanEnvValue,
};
