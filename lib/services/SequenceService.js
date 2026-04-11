'use strict';

/**
 * SequenceService — Follow-up sequence creation and management
 *
 * UC-8: Creates and manages follow-up sequences for leads.
 * Used by FUBService and calcom-webhook-handler.
 */

const { createClient } = require('../db');

const SEQUENCE_DELAYS = {
  no_response: 24 * 60 * 60 * 1000,       // 24h
  post_viewing: 4 * 60 * 60 * 1000,        // 4h
  no_show: 30 * 60 * 1000,                 // 30m
  nurture: 7 * 24 * 60 * 60 * 1000,       // 7 days
};

const VALID_SEQUENCE_TYPES = ['no_response', 'post_viewing', 'no_show', 'nurture'];

class SequenceService {
  /**
   * @param {Object} [options]
   * @param {Object} [options.db]           - PostgREST client; lazy-initialized if omitted
   * @param {Function} [options.createClient] - Override createClient for testing
   */
  constructor(options = {}) {
    this._db = options.db || null;
    this._createClient = options.createClient || createClient;
  }

  _getDb() {
    if (!this._db) {
      this._db = this._createClient();
    }
    return this._db;
  }

  /**
   * Get the initial next_send_at timestamp for a sequence type
   * @param {string} sequenceType
   * @returns {string} ISO timestamp
   */
  getInitialSendTime(sequenceType) {
    const delay = SEQUENCE_DELAYS[sequenceType] || SEQUENCE_DELAYS.no_response;
    return new Date(Date.now() + delay).toISOString();
  }

  /**
   * Look up the internal lead UUID from a FUB person ID
   * @param {string} fubId
   * @returns {Promise<string|null>}
   */
  async findLeadByFubId(fubId) {
    const db = this._getDb();
    if (!db || !fubId) return null;

    const { data, error } = await db
      .from('leads')
      .select('id')
      .eq('fub_id', String(fubId))
      .single();

    if (error || !data) {
      console.warn(`⚠️  Could not find lead for fub_id=${fubId}: ${error?.message}`);
      return null;
    }
    return data.id;
  }

  /**
   * Look up the internal lead UUID from a phone number
   * @param {string} phone
   * @returns {Promise<string|null>}
   */
  async findLeadByPhone(phone) {
    const db = this._getDb();
    if (!db || !phone) return null;

    const { data, error } = await db
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .single();

    if (error || !data) {
      console.warn(`⚠️  Could not find lead for phone=${phone}: ${error?.message}`);
      return null;
    }
    return data.id;
  }

  /**
   * Check if an active sequence of the same type already exists for a lead
   * @param {string} leadId
   * @param {string} sequenceType
   * @returns {Promise<boolean>}
   */
  async hasActiveSequence(leadId, sequenceType) {
    const db = this._getDb();
    if (!db) return false;

    const { data, error } = await db
      .from('lead_sequences')
      .select('id')
      .eq('lead_id', leadId)
      .eq('sequence_type', sequenceType)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error(`❌ Error checking existing sequences: ${error.message}`);
      return false;
    }
    return (data?.length || 0) > 0;
  }

  /**
   * Create a follow-up sequence for a lead
   *
   * @param {Object} params
   * @param {string} params.lead_id          - Internal lead UUID (required)
   * @param {string} params.sequence_type    - 'no_response' | 'post_viewing' | 'no_show' | 'nurture'
   * @param {string} [params.trigger_reason] - Human-readable reason
   * @param {string} [params.next_send_at]   - ISO timestamp; defaults to type-appropriate delay
   * @param {Object} [params.metadata]       - Optional metadata
   * @returns {Promise<Object|null>} Created sequence row, or null on failure
   */
  async createLeadSequence(params) {
    const { lead_id, sequence_type, trigger_reason, next_send_at, metadata } = params;

    if (!lead_id) {
      console.error('❌ createLeadSequence: lead_id is required');
      return null;
    }

    if (!VALID_SEQUENCE_TYPES.includes(sequence_type)) {
      console.error(`❌ createLeadSequence: invalid sequence_type "${sequence_type}"`);
      return null;
    }

    const db = this._getDb();
    if (!db) {
      console.error('❌ createLeadSequence: DB client not available');
      return null;
    }

    const alreadyActive = await this.hasActiveSequence(lead_id, sequence_type);
    if (alreadyActive) {
      console.log(`ℹ️  Active "${sequence_type}" sequence already exists for lead ${lead_id}, skipping`);
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
      console.error(`❌ Error creating "${sequence_type}" sequence for lead ${lead_id}:`, error.message);
      return null;
    }

    console.log(`✅ Created "${sequence_type}" sequence for lead ${lead_id} (next_send_at: ${sendAt})`);
    return data;
  }
}

module.exports = SequenceService;
