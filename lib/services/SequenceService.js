'use strict';

/**
 * SequenceService
 * Manages follow-up sequences for leads.
 *
 * Converted from lib/sequence-service.js (UC-8).
 * Used by FUBService and CalcomService.
 */

// Sequence timing in milliseconds
const SEQUENCE_DELAYS = {
  no_response:  24 * 60 * 60 * 1000,       // 24h
  post_viewing:  4 * 60 * 60 * 1000,        // 4h
  no_show:      30 * 60 * 1000,             // 30m
  nurture:       7 * 24 * 60 * 60 * 1000,  // 7 days
};

const VALID_SEQUENCE_TYPES = ['no_response', 'post_viewing', 'no_show', 'nurture'];

class SequenceService {
  constructor(options = {}) {
    this._db = options.db || null;
    this.logger = options.logger || console;
  }

  _getDB() {
    if (!this._db) {
      this._db = require('../db-client').createClient();
    }
    return this._db;
  }

  getInitialSendTime(sequenceType) {
    const delay = SEQUENCE_DELAYS[sequenceType] || SEQUENCE_DELAYS.no_response;
    return new Date(Date.now() + delay).toISOString();
  }

  async findLeadByFubId(fubId) {
    const db = this._getDB();
    if (!db || !fubId) return null;
    const { data, error } = await db.from('leads').select('id').eq('fub_id', String(fubId)).single();
    if (error || !data) {
      this.logger.warn(`Could not find lead for fub_id=${fubId}: ${error?.message}`);
      return null;
    }
    return data.id;
  }

  async findLeadByPhone(phone) {
    const db = this._getDB();
    if (!db || !phone) return null;
    const { data, error } = await db.from('leads').select('id').eq('phone', phone).single();
    if (error || !data) {
      this.logger.warn(`Could not find lead for phone=${phone}: ${error?.message}`);
      return null;
    }
    return data.id;
  }

  async hasActiveSequence(leadId, sequenceType) {
    const db = this._getDB();
    if (!db) return false;
    const { data, error } = await db
      .from('lead_sequences')
      .select('id')
      .eq('lead_id', leadId)
      .eq('sequence_type', sequenceType)
      .eq('status', 'active')
      .limit(1);
    if (error) {
      this.logger.error(`Error checking existing sequences: ${error.message}`);
      return false;
    }
    return (data?.length || 0) > 0;
  }

  async createLeadSequence(params) {
    const { lead_id, sequence_type, trigger_reason, next_send_at, metadata } = params;

    if (!lead_id) {
      this.logger.error('createLeadSequence: lead_id is required');
      return null;
    }

    if (!VALID_SEQUENCE_TYPES.includes(sequence_type)) {
      this.logger.error(`createLeadSequence: invalid sequence_type "${sequence_type}"`);
      return null;
    }

    const db = this._getDB();
    if (!db) {
      this.logger.error('createLeadSequence: DB client not available');
      return null;
    }

    const alreadyActive = await this.hasActiveSequence(lead_id, sequence_type);
    if (alreadyActive) {
      this.logger.log(`Active "${sequence_type}" sequence already exists for lead ${lead_id}, skipping`);
      return null;
    }

    const sendAt = next_send_at || this.getInitialSendTime(sequence_type);

    const { data, error } = await db
      .from('lead_sequences')
      .insert({
        lead_id,
        sequence_type,
        trigger_reason: trigger_reason || null,
        next_send_at: sendAt,
        status: 'active',
        step: 1,
        total_messages_sent: 0,
        max_messages: 3,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating "${sequence_type}" sequence for lead ${lead_id}:`, error.message);
      return null;
    }

    this.logger.log(`Created "${sequence_type}" sequence for lead ${lead_id} (next_send_at: ${sendAt})`);
    return data;
  }
}

const defaultInstance = new SequenceService();

module.exports = defaultInstance;
module.exports.SequenceService = SequenceService;
module.exports.SEQUENCE_DELAYS = SEQUENCE_DELAYS;
module.exports.VALID_SEQUENCE_TYPES = VALID_SEQUENCE_TYPES;
