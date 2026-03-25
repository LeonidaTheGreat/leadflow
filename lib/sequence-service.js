/**
 * UC-8: Sequence Service
 * Node.js module for creating and managing follow-up sequences
 * Used by FUB webhook listener and Cal.com webhook handler
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client (lazy init)
let supabase = null;
function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return supabase;
}

// Sequence timing in milliseconds
const SEQUENCE_DELAYS = {
  no_response: 24 * 60 * 60 * 1000,       // 24h
  post_viewing: 4 * 60 * 60 * 1000,        // 4h
  no_show: 30 * 60 * 1000,                 // 30m
  nurture: 7 * 24 * 60 * 60 * 1000,       // 7 days
};

/**
 * Get the initial next_send_at timestamp for a sequence type
 * @param {string} sequenceType
 * @returns {string} ISO timestamp
 */
function getInitialSendTime(sequenceType) {
  const delay = SEQUENCE_DELAYS[sequenceType] || SEQUENCE_DELAYS.no_response;
  return new Date(Date.now() + delay).toISOString();
}

/**
 * Look up the internal lead UUID from a FUB person ID
 * @param {string} fubId - FUB person ID
 * @returns {string|null} Internal lead UUID
 */
async function findLeadByFubId(fubId) {
  const db = getSupabase();
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
 * @returns {string|null} Internal lead UUID
 */
async function findLeadByPhone(phone) {
  const db = getSupabase();
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
 * Prevents duplicate sequences from being created
 * @param {string} leadId - Internal lead UUID
 * @param {string} sequenceType
 * @returns {boolean}
 */
async function hasActiveSequence(leadId, sequenceType) {
  const db = getSupabase();
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
 * @param {string} params.lead_id         - Internal lead UUID (required)
 * @param {string} params.sequence_type   - 'no_response' | 'post_viewing' | 'no_show' | 'nurture'
 * @param {string} [params.trigger_reason] - Human-readable reason for creating the sequence
 * @param {string} [params.next_send_at]  - ISO timestamp; defaults to type-appropriate delay
 * @param {Object} [params.metadata]      - Optional metadata to store on the sequence
 * @returns {Object|null} Created sequence row, or null on failure
 */
async function createLeadSequence(params) {
  const { lead_id, sequence_type, trigger_reason, next_send_at, metadata } = params;

  if (!lead_id) {
    console.error('❌ createLeadSequence: lead_id is required');
    return null;
  }

  const validTypes = ['no_response', 'post_viewing', 'no_show', 'nurture'];
  if (!validTypes.includes(sequence_type)) {
    console.error(`❌ createLeadSequence: invalid sequence_type "${sequence_type}"`);
    return null;
  }

  const db = getSupabase();
  if (!db) {
    console.error('❌ createLeadSequence: Supabase client not available');
    return null;
  }

  // Guard: don't create a duplicate active sequence
  const alreadyActive = await hasActiveSequence(lead_id, sequence_type);
  if (alreadyActive) {
    console.log(`ℹ️  Active "${sequence_type}" sequence already exists for lead ${lead_id}, skipping`);
    return null;
  }

  const sendAt = next_send_at || getInitialSendTime(sequence_type);

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

module.exports = {
  createLeadSequence,
  findLeadByFubId,
  findLeadByPhone,
  hasActiveSequence,
  getInitialSendTime,
};
