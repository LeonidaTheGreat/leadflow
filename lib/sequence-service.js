/**
 * UC-8: Sequence Service - backward-compatibility shim
 * All logic now lives in lib/services/SequenceService.js.
 */
'use strict';
const sequenceService = require('./services/SequenceService');
module.exports = {
  createLeadSequence:  (params) => sequenceService.createLeadSequence(params),
  findLeadByFubId:     (fubId)  => sequenceService.findLeadByFubId(fubId),
  findLeadByPhone:     (phone)  => sequenceService.findLeadByPhone(phone),
  hasActiveSequence:   (leadId, sequenceType) => sequenceService.hasActiveSequence(leadId, sequenceType),
  getInitialSendTime:  (sequenceType) => sequenceService.getInitialSendTime(sequenceType),
};
