/**
 * Backward-compatibility re-export.
 * New code should import SequenceService from './services/SequenceService' directly.
 */
'use strict';
const SequenceService = require('./services/SequenceService');
const _svc = new SequenceService();
module.exports = {
  createLeadSequence: (...args) => _svc.createLeadSequence(...args),
  findLeadByFubId: (...args) => _svc.findLeadByFubId(...args),
  findLeadByPhone: (...args) => _svc.findLeadByPhone(...args),
  hasActiveSequence: (...args) => _svc.hasActiveSequence(...args),
  getInitialSendTime: (...args) => _svc.getInitialSendTime(...args),
};
