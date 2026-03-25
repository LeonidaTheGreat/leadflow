/**
 * Twilio Inbound SMS Handler
 * 
 * Receives and processes inbound SMS messages from leads
 * Handles opt-out (STOP) messages and updates CRM
 *
 * Endpoint: POST /webhook/twilio/inbound
 * 
 * UC-5: Lead Opt-Out
 * Process STOP/opt-out messages and update CRM
 */

const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ===== CONSTANTS =====

/**
 * Patterns that indicate a lead wants to opt out
 * Case-insensitive matching
 */
const OPT_OUT_PATTERNS = [
  /\bSTOP\b/i,
  /\bUNSUBSCRIBE\b/i,
  /\bCANCEL\b/i,
  /\bQUIT\b/i,
  /\bEND\b/i,
  /\bNO MORE\b/i,
  /\bDON['']T TEXT\b/i,
  /\bREMOVE\b/i,
];

/**
 * Patterns that indicate satisfaction feedback
 * These are handled separately from opt-outs
 */
const SATISFACTION_PATTERNS = {
  positive: /^(yes|y|yep|yeah|good|great|perfect|awesome|helpful|thanks|thank you)\b/i,
  negative: /^(no|nope|not helpful|bad|terrible|not good|unhelpful)\b/i,
  neutral: /^(ok|okay|sure|fine|whatever)\b/i,
};

// ===== WEBHOOK VERIFICATION =====

/**
 * Verify Twilio webhook signature
 * Twilio includes X-Twilio-Signature header with HMAC-SHA1
 * @param {Object} req - Express request object
 * @param {string} twilioUrl - The URL where the webhook is hosted
 * @returns {boolean} true if signature is valid
 */
function verifyTwilioSignature(req, twilioUrl) {
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!twilioAuthToken) {
    console.warn('⚠️  TWILIO_AUTH_TOKEN not configured — skipping signature verification');
    return true; // Allow in dev, but warn in production
  }

  const signature = req.headers['x-twilio-signature'] || '';
  const params = req.body;
  
  // Construct the data to sign
  let data = twilioUrl;
  
  // Add params in sorted key order (Twilio spec)
  Object.keys(params)
    .sort()
    .forEach(key => {
      data += key + params[key];
    });

  // Compute HMAC-SHA1
  const hash = crypto
    .createHmac('sha1', twilioAuthToken)
    .update(data)
    .digest('Base64');

  const isValid = hash === signature;
  
  if (!isValid) {
    console.error('❌ Twilio signature verification failed');
    console.error(`   Expected: ${signature}`);
    console.error(`   Computed: ${hash}`);
  }
  
  return isValid;
}

// ===== WEBHOOK ENDPOINT =====

/**
 * POST /webhook/twilio/inbound
 * Receive inbound SMS from Twilio
 * 
 * Twilio sends these fields:
 * - MessageSid: unique message identifier
 * - From: sender phone number (E.164 format)
 * - To: recipient phone number (our Twilio number)
 * - Body: message content
 * - NumMedia: number of attachments
 */
router.post('/webhook/twilio/inbound', async (req, res) => {
  const startTime = Date.now();
  const { MessageSid, From, To, Body, NumMedia } = req.body;

  console.log('📨 Twilio inbound SMS received:');
  console.log(`   MessageSid: ${MessageSid}`);
  console.log(`   From: ${From}`);
  console.log(`   To: ${To}`);
  console.log(`   Body: ${Body}`);
  console.log(`   Media: ${NumMedia || 0} attachment(s)`);

  try {
    // 1. Verify Twilio signature (optional in dev, required in production)
    const isSignatureValid = verifyTwilioSignature(
      req,
      process.env.TWILIO_WEBHOOK_URL || 'http://localhost:3000/webhook/twilio/inbound'
    );

    if (!isSignatureValid && process.env.NODE_ENV === 'production') {
      console.error('❌ Twilio signature verification failed in production — rejecting');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    // 2. Immediately return 200 (Twilio requires fast response)
    res.status(200).json({ received: true });

    // 3. Process asynchronously
    processInboundSms({ MessageSid, From, To, Body, NumMedia })
      .catch(err => {
        console.error('❌ Error processing inbound SMS:', err.message);
        // Log error but don't throw (async operation)
      });

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    // Still return 200 to Twilio (don't retry)
    res.status(200).json({ error: error.message });
  }
});

// ===== INBOUND PROCESSING =====

/**
 * Process inbound SMS message
 * Determine if it's an opt-out, satisfaction feedback, or regular message
 * Update database and CRM accordingly
 */
async function processInboundSms({ MessageSid, From, To, Body, NumMedia }) {
  console.log(`\n🔄 Processing inbound SMS (${MessageSid})...`);

  try {
    // 1. Find the lead by phone number
    const lead = await findLeadByPhone(From);
    
    if (!lead) {
      console.warn(`⚠️  No lead found for phone ${From} — discarding message`);
      return;
    }

    console.log(`✅ Found lead: ${lead.id} (${lead.name || 'unknown'})`);

    // 2. Log the inbound message
    const messageRecord = await logInboundMessage({
      twilio_sid: MessageSid,
      lead_id: lead.id,
      agent_id: lead.agent_id,
      phone_from: From,
      phone_to: To,
      body: Body,
      message_type: 'inbound',
    });

    console.log(`💾 Logged message: ${messageRecord.id}`);

    // 3. Classify the message
    const classification = classifyMessage(Body);
    console.log(`🏷️  Message classification: ${classification.type}`);

    // 4. Handle based on classification
    switch (classification.type) {
      case 'opt_out':
        await handleOptOut(lead, { MessageSid, Body, messageRecord });
        break;

      case 'satisfaction_feedback':
        await handleSatisfactionFeedback(lead, classification.sentiment, { MessageSid, Body, messageRecord });
        break;

      case 'regular':
        await handleRegularMessage(lead, { MessageSid, Body, messageRecord });
        break;

      default:
        console.log(`ℹ️  Unknown message type: ${classification.type}`);
    }

  } catch (error) {
    console.error('❌ Error processing inbound SMS:', error.message);
    console.error(error.stack);
  }
}

/**
 * Find a lead by phone number
 * Phone numbers are stored in E.164 format
 */
async function findLeadByPhone(phoneNumber) {
  try {
    // Normalize phone to E.164 format (should already be from Twilio)
    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', normalizedPhone)
      .limit(1);

    if (error) {
      console.error('❌ Error querying leads:', error.message);
      return null;
    }

    return leads && leads.length > 0 ? leads[0] : null;

  } catch (err) {
    console.error('❌ Error finding lead:', err.message);
    return null;
  }
}

/**
 * Log inbound message to database
 * Creates a conversation record for tracking
 */
async function logInboundMessage(messageData) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        lead_id: messageData.lead_id,
        agent_id: messageData.agent_id,
        direction: 'inbound',
        message_body: messageData.body,
        twilio_sid: messageData.twilio_sid,
        phone_from: messageData.phone_from,
        phone_to: messageData.phone_to,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging message:', error.message);
      // Return a placeholder object so processing continues
      return { id: 'error', twilio_sid: messageData.twilio_sid };
    }

    return data;

  } catch (err) {
    console.error('❌ Error in logInboundMessage:', err.message);
    return { id: 'error', twilio_sid: messageData.twilio_sid };
  }
}

/**
 * Classify an inbound message
 * Determine if it's an opt-out, satisfaction feedback, or regular message
 */
function classifyMessage(body) {
  if (!body || typeof body !== 'string') {
    return { type: 'unknown' };
  }

  const trimmedBody = body.trim();

  // Check for opt-out patterns
  for (const pattern of OPT_OUT_PATTERNS) {
    if (pattern.test(trimmedBody)) {
      return { type: 'opt_out' };
    }
  }

  // Check for satisfaction feedback patterns
  if (SATISFACTION_PATTERNS.positive.test(trimmedBody)) {
    return { type: 'satisfaction_feedback', sentiment: 'positive' };
  }
  if (SATISFACTION_PATTERNS.negative.test(trimmedBody)) {
    return { type: 'satisfaction_feedback', sentiment: 'negative' };
  }
  if (SATISFACTION_PATTERNS.neutral.test(trimmedBody)) {
    return { type: 'satisfaction_feedback', sentiment: 'neutral' };
  }

  // Default: regular message
  return { type: 'regular' };
}

/**
 * Handle opt-out message
 * UC-5: Lead Opt-Out
 * 1. Update lead consent_sms = false
 * 2. Update FUB with opt-out status
 * 3. Log the opt-out event
 */
async function handleOptOut(lead, { MessageSid, Body, messageRecord }) {
  console.log(`\n🚫 Processing opt-out for lead ${lead.id}...`);

  try {
    // 1. Update lead status in database
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        consent_sms: false,
        status: 'dnc', // Do Not Call
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error('❌ Error updating lead:', updateError.message);
      // Continue to attempt FUB update even if DB update fails
    } else {
      console.log(`✅ Lead ${lead.id} marked as opted-out (consent_sms = false)`);
    }

    // 2. Update FUB with opt-out status (if FUB ID exists)
    if (lead.fub_id) {
      await updateFubOptOut(lead.fub_id, { optedOut: true, reason: Body });
    } else {
      console.warn(`⚠️  No FUB ID for lead ${lead.id} — cannot update CRM`);
    }

    // 3. Log opt-out event
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        lead_id: lead.id,
        agent_id: lead.agent_id,
        event_type: 'lead_opted_out',
        event_data: {
          twilio_sid: MessageSid,
          message: Body,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

    if (eventError) {
      console.error('❌ Error logging opt-out event:', eventError.message);
    } else {
      console.log(`✅ Opt-out event logged for lead ${lead.id}`);
    }

    console.log(`✅ Opt-out processed for lead ${lead.id}`);

  } catch (error) {
    console.error('❌ Error in handleOptOut:', error.message);
  }
}

/**
 * Update FUB with opt-out status
 * Uses FUB API to mark lead as opted-out
 * @param {string} fubLeadId - FUB lead ID
 * @param {Object} optoutData - Opt-out information
 */
async function updateFubOptOut(fubLeadId, optoutData) {
  const fubApiKey = process.env.FUB_API_KEY;
  const fubAuthToken = process.env.FUB_AUTH_TOKEN;

  if (!fubApiKey || !fubAuthToken) {
    console.warn('⚠️  FUB API credentials not configured — cannot update CRM');
    return;
  }

  try {
    console.log(`🔄 Updating FUB lead ${fubLeadId} with opt-out status...`);

    // FUB API endpoint to update person/lead
    // Add a tag or update status to indicate opted-out
    const response = await axios.put(
      `https://api.followupboss.com/v1/people/${fubLeadId}`,
      {
        tags: ['opted-out', 'do-not-contact'], // Add tags
        // Could also add a custom field if configured
        customFields: {
          'opt_out_date': new Date().toISOString(),
          'opt_out_reason': optoutData.reason || 'STOP message received',
        },
      },
      {
        auth: {
          username: fubApiKey,
          password: fubAuthToken,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200 || response.status === 204) {
      console.log(`✅ FUB lead ${fubLeadId} updated with opt-out status`);
    } else {
      console.warn(`⚠️  FUB API returned status ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Error updating FUB:', error.message);
    if (error.response) {
      console.error(`   FUB API error: ${error.response.status} ${error.response.statusText}`);
      console.error(`   Response: ${JSON.stringify(error.response.data)}`);
    }
  }
}

/**
 * Handle satisfaction feedback
 * Record the rating in the satisfaction events table
 */
async function handleSatisfactionFeedback(lead, sentiment, { MessageSid, Body, messageRecord }) {
  console.log(`\n📊 Processing satisfaction feedback (${sentiment}) for lead ${lead.id}...`);

  try {
    // Convert sentiment to rating
    const ratingMap = {
      positive: 'satisfied',
      negative: 'dissatisfied',
      neutral: 'neutral',
    };

    const { error } = await supabase
      .from('lead_satisfaction_events')
      .update({
        rating: ratingMap[sentiment] || 'unclassified',
        feedback_text: Body,
        feedback_received_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', lead.id)
      .is('rating', null); // Only update if no rating yet

    if (error) {
      console.error('❌ Error recording satisfaction feedback:', error.message);
    } else {
      console.log(`✅ Satisfaction feedback recorded: ${sentiment}`);
    }

  } catch (error) {
    console.error('❌ Error in handleSatisfactionFeedback:', error.message);
  }
}

/**
 * Handle regular message
 * For future use: agent context awareness, intent detection, etc.
 */
async function handleRegularMessage(lead, { MessageSid, Body, messageRecord }) {
  console.log(`\n💬 Processing regular message for lead ${lead.id}...`);

  try {
    // Log the message (already done in logInboundMessage)
    // Future: implement intent detection, agent notification, etc.
    console.log(`ℹ️  Regular message logged: ${Body.substring(0, 50)}...`);

  } catch (error) {
    console.error('❌ Error in handleRegularMessage:', error.message);
  }
}

module.exports = router;
