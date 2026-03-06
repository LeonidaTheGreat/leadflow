/**
 * Twilio Webhook Handler
 * Receives status callbacks from Twilio for SMS delivery tracking
 * 
 * Endpoints:
 * - POST /webhook/twilio/sms-status - Receives SMS status updates
 * - POST /webhook/twilio/inbound - Receives inbound SMS from leads
 */

const express = require('express');
const crypto = require('crypto');
const { updateSmsStatus } = require('../lib/twilio-sms');

const router = express.Router();

// ===== WEBHOOK SECURITY =====
/**
 * Validate Twilio request signature
 * Ensures webhook is actually from Twilio
 */
function validateTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  if (!authToken || !signature) {
    console.warn('⚠️  Missing Twilio auth token or signature');
    // In development, allow through
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  // Build parameter string for validation
  const params = req.body;

  // Validate signature using Twilio's algorithm
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(Buffer.from(url + Object.keys(params).sort().map(k => k + params[k]).join(''), 'utf-8'))
    .digest('base64');

  // Note: This is a simplified validation. For production, use Twilio's official SDK:
  // const twilio = require('twilio');
  // return twilio.validateRequest(authToken, signature, url, params);

  // For now, accept all in dev, validate in production
  if (process.env.NODE_ENV === 'production') {
    // Use proper validation in production
    try {
      const twilio = require('twilio');
      return twilio.validateRequest(authToken, signature, url, params);
    } catch (err) {
      console.error('❌ Twilio signature validation error:', err.message);
      return false;
    }
  }

  return true;
}

// ===== SMS STATUS CALLBACK =====
/**
 * POST /webhook/twilio/sms-status
 * Receives delivery status updates from Twilio
 * 
 * Twilio sends these parameters:
 * - MessageSid: The SID of the message
 * - MessageStatus: queued, sending, sent, delivered, failed, undelivered, receiving, received, accepted, scheduled, read
 * - ErrorCode: Error code if failed (optional)
 * - ErrorMessage: Error message if failed (optional)
 * - From: Sender phone number
 * - To: Recipient phone number
 * - Body: Message body (for inbound)
 */
router.post('/webhook/twilio/sms-status', express.urlencoded({ extended: false }), async (req, res) => {
  console.log('📨 Twilio SMS status callback received');

  // Validate request is from Twilio
  if (!validateTwilioSignature(req)) {
    console.error('❌ Invalid Twilio signature');
    return res.status(403).send('Forbidden');
  }

  // Extract status data
  const {
    MessageSid,
    MessageStatus,
    ErrorCode,
    ErrorMessage,
    From,
    To,
  } = req.body;

  console.log(`📊 SMS Status Update:`);
  console.log(`   SID: ${MessageSid}`);
  console.log(`   Status: ${MessageStatus}`);
  console.log(`   From: ${From}`);
  console.log(`   To: ${To}`);

  if (ErrorCode) {
    console.log(`   Error: ${ErrorCode} - ${ErrorMessage}`);
  }

  // Immediately respond to Twilio (don't hold connection)
  res.status(200).send('<Response></Response>');

  // Update status in database (async)
  try {
    await updateSmsStatus({
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    });
  } catch (error) {
    console.error('❌ Failed to update SMS status:', error.message);
    // Log but don't fail - Twilio will retry if we return error
  }
});

// ===== INBOUND SMS WEBHOOK =====
/**
 * POST /webhook/twilio/inbound
 * Receives inbound SMS messages from leads
 * 
 * Twilio sends these parameters:
 * - MessageSid: The SID of the incoming message
 * - From: Sender phone number (the lead)
 * - To: Your Twilio number
 * - Body: Message content
 * - NumMedia: Number of media attachments
 * - MediaUrl0, MediaUrl1, etc.: URLs to media
 */
router.post('/webhook/twilio/inbound', express.urlencoded({ extended: false }), async (req, res) => {
  console.log('📨 Twilio inbound SMS received');

  // Validate request is from Twilio
  if (!validateTwilioSignature(req)) {
    console.error('❌ Invalid Twilio signature');
    return res.status(403).send('Forbidden');
  }

  // Extract message data
  const {
    MessageSid,
    From,
    To,
    Body,
    NumMedia,
    FromCity,
    FromState,
    FromZip,
    FromCountry,
  } = req.body;

  console.log(`📩 Inbound SMS:`);
  console.log(`   SID: ${MessageSid}`);
  console.log(`   From: ${From}`);
  console.log(`   To: ${To}`);
  console.log(`   Body: ${Body}`);
  console.log(`   Location: ${FromCity}, ${FromState}, ${FromCountry}`);

  // Immediately respond with empty TwiML (we'll process async)
  res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  // Process inbound message (async)
  try {
    await processInboundSms({
      MessageSid,
      From,
      To,
      Body,
      NumMedia: parseInt(NumMedia) || 0,
      FromCity,
      FromState,
      FromZip,
      FromCountry,
    });
  } catch (error) {
    console.error('❌ Failed to process inbound SMS:', error.message);
  }
});

/**
 * Process inbound SMS from a lead
 */
async function processInboundSms(messageData) {
  const { MessageSid, From, To, Body, FromCity, FromState, FromCountry } = messageData;

  try {
    // 1. Log inbound message to database
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find lead by phone number
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, agent_id, first_name, last_name')
      .eq('phone_number', From)
      .limit(1);

    if (leadError) {
      console.error('❌ Error finding lead:', leadError.message);
    }

    const lead = leads?.[0];

    // Log the inbound message
    const { data: messageLog, error: logError } = await supabase
      .from('sms_messages')
      .insert({
        twilio_sid: MessageSid,
        lead_id: lead?.id || null,
        agent_id: lead?.agent_id || null,
        to_number: To,
        from_number: From,
        message_body: Body,
        direction: 'inbound',
        status: 'received',
        market: detectMarketFromNumber(From),
        metadata: {
          from_city: FromCity,
          from_state: FromState,
          from_country: FromCountry,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to log inbound SMS:', logError.message);
    } else {
      console.log(`💾 Inbound SMS logged (ID: ${messageLog.id})`);
    }

    // 2. Check for STOP/OPT-OUT keywords
    const stopKeywords = ['stop', 'unsubscribe', 'cancel', 'end', 'quit', 'stopall'];
    const bodyLower = Body.toLowerCase().trim();

    if (stopKeywords.includes(bodyLower)) {
      console.log(`🚫 Lead ${From} opted out via STOP keyword`);
      await handleOptOut(From, lead?.id);
      return;
    }

    // 3. Check for HELP keyword
    if (bodyLower === 'help') {
      console.log(`❓ Lead ${From} requested HELP`);
      await handleHelpRequest(From, lead?.id);
      return;
    }

    // 4. Trigger AI response generation
    console.log(`🤖 Triggering AI response for lead ${From}`);
    // This would integrate with your AI service
    // await generateAiResponse(lead, Body);

  } catch (error) {
    console.error('❌ Error processing inbound SMS:', error.message);
  }
}

/**
 * Handle opt-out request (STOP keyword)
 */
async function handleOptOut(phoneNumber, leadId) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Update lead to mark as opted out
    if (leadId) {
      await supabase
        .from('leads')
        .update({
          sms_opted_out: true,
          sms_opted_out_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    // Add to DNC list
    await supabase
      .from('dnc_list')
      .upsert({
        phone_number: phoneNumber,
        source: 'lead_opt_out',
        opted_out_at: new Date().toISOString(),
      }, { onConflict: 'phone_number' });

    console.log(`✅ Lead ${phoneNumber} added to DNC list`);

    // Send confirmation message (required by TCPA)
    const { sendSmsViatwilio } = require('../lib/twilio-sms');
    await sendSmsViatwilio(
      phoneNumber,
      'You have been unsubscribed. You will no longer receive messages from us. Reply START to resubscribe.',
      { trigger: 'opt_out_confirmation' }
    );

  } catch (error) {
    console.error('❌ Error handling opt-out:', error.message);
  }
}

/**
 * Handle HELP request
 */
async function handleHelpRequest(phoneNumber, leadId) {
  try {
    const { sendSmsViatwilio } = require('../lib/twilio-sms');
    await sendSmsViatwilio(
      phoneNumber,
      'LeadFlow AI: Reply STOP to unsubscribe. For support, contact support@leadflow.ai',
      { trigger: 'help_response' }
    );
  } catch (error) {
    console.error('❌ Error handling help request:', error.message);
  }
}

/**
 * Detect market from phone number
 */
function detectMarketFromNumber(phoneNumber) {
  if (!phoneNumber) return 'unknown';

  const countryCode = phoneNumber.slice(0, 2); // e.g., "+1"
  const areaCode = phoneNumber.slice(2, 5);    // e.g., "416"

  if (countryCode === '+1') {
    const canadianAreaCodes = [
      '204', '226', '236', '249', '250', '289', '306', '403', '416', '418',
      '431', '437', '438', '450', '506', '514', '519', '548', '581', '587',
      '600', '613', '647', '705', '709', '778', '780', '807', '819', '825',
      '867', '902', '905', '920',
    ];

    if (canadianAreaCodes.includes(areaCode)) {
      return 'ca-ontario';
    }
    return 'us-national';
  }

  return 'unknown';
}

// ===== EXPORTS =====
module.exports = {
  router,
  validateTwilioSignature,
};
