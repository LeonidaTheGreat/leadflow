/**
 * FUB Webhook Listener
 * Receives real-time lead events from Follow Up Boss
 * Triggers AI SMS response generation
 * 
 * Supported Events:
 * - lead.created
 * - lead.updated
 * - lead.status_changed
 * - lead.assigned
 */

const express = require('express');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const axios = require('axios');
const { sendSmsViatwilio } = require('../lib/twilio-sms');

const router = express.Router();

// Event bus for async processing
const fubEventBus = new EventEmitter();

// ===== WEBHOOK VERIFICATION =====
/**
 * FUB sends X-Signature header with HMAC-SHA256
 * Verify incoming webhook is authentic
 */
function verifyFubWebhookSignature(req) {
  const signature = req.headers['fub-signature'] || req.headers['x-signature'];
  const webhookSecret = process.env.FUB_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.warn('⚠️  Missing signature or webhook secret');
    return false;
  }

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  const isValid = hash === signature;
  if (!isValid) {
    console.error('❌ Webhook signature mismatch');
  }
  return isValid;
}

// ===== WEBHOOK ENDPOINT =====
/**
 * POST /webhook/fub
 * Receive lead events from FUB in real-time
 */
// Map FUB events to internal events
const EVENT_MAP = {
  'peopleCreated': 'lead.created',
  'peopleUpdated': 'lead.updated',
  'peopleStageUpdated': 'lead.status_changed',
  'peopleTagsCreated': 'lead.tagged'
};

router.post('/webhook/fub', (req, res) => {
  const fubEvent = req.body.event;
  console.log('📨 FUB Webhook received:', fubEvent);
  console.log('📦 Payload:', JSON.stringify(req.body, null, 2));

  // Map FUB event to internal event
  const internalEvent = EVENT_MAP[fubEvent] || fubEvent;
  const data = req.body;

  // Immediately return 200 (don't hold connection)
  res.status(200).json({ received: true, event: internalEvent });

  // Emit event asynchronously for processing
  fubEventBus.emit(internalEvent, data);

  // Log event to audit trail
  logFubEvent(internalEvent, data);
});

// ===== EVENT HANDLERS =====

/**
 * Handle: lead.created
 * New lead added to FUB → Generate AI SMS
 */
fubEventBus.on('lead.created', async (leadData) => {
  console.log('🆕 Lead Created:', {
    leadId: leadData.id,
    name: leadData.name,
    phone: leadData.phoneNumber,
    email: leadData.email,
    source: leadData.source,
  });

  try {
    // 1. Validate lead has contact info
    if (!leadData.phoneNumber) {
      console.warn(`⚠️  Lead ${leadData.id} missing phone number, skipping SMS`);
      return;
    }

    // 2. Fetch full lead context from FUB
    const fullLead = await fetchLeadFromFub(leadData.id);

    // 3. Check consent flag (should be set by lead capture form)
    if (!fullLead.consents?.sms) {
      console.warn(`⚠️  Lead ${leadData.id} has not consented to SMS`);
      // Could auto-send email instead
      return;
    }

    // 4. Check DNC status
    const isDnc = await checkDncStatus(fullLead.phoneNumber);
    if (isDnc) {
      console.warn(`🚫 Lead ${leadData.id} on DNC list, skipping SMS`);
      return;
    }

    // 5. Generate AI response
    const aiResponse = await generateAiSmsResponse(fullLead);

    // 6. Send SMS via Twilio (real implementation)
    const smsResult = await sendSmsViatwilio(
      fullLead.phoneNumber,
      aiResponse.message,
      {
        leadId: fullLead.id,
        trigger: 'lead.created',
        market: fullLead.market || 'us-national',
      }
    );

    // 7. Update FUB with SMS log
    await logSmsInFub({
      leadId: fullLead.id,
      messageContent: aiResponse.message,
      smsId: smsResult.sid,
      deliveryStatus: smsResult.status,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ SMS sent to lead ${fullLead.id}`);
  } catch (error) {
    console.error('❌ Error processing lead.created:', error.message);
    // Log error to monitoring (Sentry, etc.)
  }
});

/**
 * Handle: lead.updated
 * Lead info changed → Update AI context cache
 */
fubEventBus.on('lead.updated', async (leadData) => {
  console.log('📝 Lead Updated:', leadData.id);

  try {
    // Invalidate cached context for this lead
    await invalidateLeadCache(leadData.id);

    // Fetch updated lead
    const fullLead = await fetchLeadFromFub(leadData.id);

    // Update cache with fresh data
    await cacheLeadContext(fullLead);

    console.log(`✅ Lead ${leadData.id} context refreshed`);
  } catch (error) {
    console.error('❌ Error processing lead.updated:', error.message);
  }
});

/**
 * Handle: lead.status_changed
 * Lead moved to new status (e.g., "Inquiry" → "Appointment Set")
 * → Send follow-up SMS if appropriate
 */
fubEventBus.on('lead.status_changed', async (leadData) => {
  const { leadId, oldStatus, newStatus } = leadData;
  console.log(`🔄 Lead Status Changed: ${oldStatus} → ${newStatus}`);

  try {
    const fullLead = await fetchLeadFromFub(leadId);

    // Define status-based SMS triggers
    const statusTriggers = {
      'Appointment Set': 'appointment_confirmation',
      'Viewed': 'follow_up_after_showing',
      'Offer': 'offer_acknowledgment',
    };

    if (!statusTriggers[newStatus]) {
      console.log(`  → No SMS trigger for status: ${newStatus}`);
      return;
    }

    // Generate status-specific SMS
    const aiResponse = await generateAiSmsResponse(fullLead, {
      trigger: statusTriggers[newStatus],
      previousStatus: oldStatus,
    });

    // Send SMS via Twilio (real implementation)
    const smsResult = await sendSmsViatwilio(
      fullLead.phoneNumber,
      aiResponse.message,
      {
        leadId: fullLead.id,
        trigger: `status.${newStatus}`,
        market: fullLead.market || 'us-national',
      }
    );

    // Log to FUB
    await logSmsInFub({
      leadId: fullLead.id,
      messageContent: aiResponse.message,
      smsId: smsResult.sid,
      trigger: statusTriggers[newStatus],
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Status-triggered SMS sent to lead ${leadId}`);
  } catch (error) {
    console.error('❌ Error processing lead.status_changed:', error.message);
  }
});

/**
 * Handle: lead.assigned
 * Lead assigned to agent → Send intro/welcome SMS
 */
fubEventBus.on('lead.assigned', async (leadData) => {
  const { leadId, agentId, agentName } = leadData;
  console.log(`👤 Lead Assigned: ${agentName}`);

  try {
    const fullLead = await fetchLeadFromFub(leadId);

    // Generate agent-intro SMS
    const aiResponse = await generateAiSmsResponse(fullLead, {
      trigger: 'agent_intro',
      agentName,
    });

    // Send SMS via Twilio (real implementation)
    const smsResult = await sendSmsViatwilio(
      fullLead.phoneNumber,
      aiResponse.message,
      {
        leadId: fullLead.id,
        trigger: 'lead.assigned',
        market: fullLead.market || 'us-national',
      }
    );

    // Log to FUB
    await logSmsInFub({
      leadId: fullLead.id,
      messageContent: aiResponse.message,
      smsId: smsResult.sid,
      trigger: 'agent_intro',
      agentName,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Agent intro SMS sent to lead ${leadId}`);
  } catch (error) {
    console.error('❌ Error processing lead.assigned:', error.message);
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Fetch full lead details from FUB API
 */
async function fetchLeadFromFub(leadId) {
  const fubApiKey = process.env.FUB_API_KEY;
  const fubApiBase = process.env.FUB_API_BASE_URL;

  try {
    const response = await axios.get(`${fubApiBase}/leads/${leadId}`, {
      headers: {
        Authorization: `Bearer ${fubApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching lead ${leadId} from FUB:`, error.message);
    throw error;
  }
}

/**
 * Check if phone number is on DNC (Do Not Call) list
 * Could integrate with Twilio DNC check, national registry, etc.
 */
async function checkDncStatus(phoneNumber) {
  // TODO: Integrate with Twilio DNC lookup or national registry
  // For now, return false (skip check)
  return false;
}

/**
 * Generate AI SMS response using Claude or other LLM
 */
async function generateAiSmsResponse(lead, options = {}) {
  // TODO: Call Claude API with lead context
  // For now, return placeholder
  const trigger = options.trigger || 'initial_response';

  const templates = {
    initial_response: `Hi ${lead.firstName}, I'm ${process.env.AGENT_NAME}. I have properties matching your interests. Reply YES to see options.`,
    appointment_confirmation: `Your showing is confirmed for ${lead.appointmentTime}. See you then!`,
    follow_up_after_showing: `Hi ${lead.firstName}, what did you think of the property? Let me know if you have questions.`,
    agent_intro: `Hi, I'm ${options.agentName}, your real estate agent. Looking forward to helping you find your home!`,
  };

  return {
    message: templates[trigger] || templates.initial_response,
    trigger,
    confidence: 0.95,
  };
}

// Twilio SMS functionality is now imported from ../lib/twilio-sms
// See lib/twilio-sms.js for the real implementation

/**
 * Log SMS transaction in FUB
 */
async function logSmsInFub(logData) {
  const fubApiKey = process.env.FUB_API_KEY;
  const fubApiBase = process.env.FUB_API_BASE_URL;

  try {
    await axios.post(`${fubApiBase}/leads/${logData.leadId}/notes`, {
      text: `[AI SMS] ${logData.messageContent}\nTwilio SID: ${logData.smsId}\nStatus: ${logData.deliveryStatus}`,
      type: 'sms_ai_response',
      timestamp: logData.timestamp,
    }, {
      headers: {
        Authorization: `Bearer ${fubApiKey}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(`⚠️  Error logging SMS to FUB:`, error.message);
  }
}

/**
 * Invalidate lead cache (for lead.updated event)
 */
async function invalidateLeadCache(leadId) {
  // TODO: Implement Redis cache invalidation
  console.log(`🗑️  Invalidated cache for lead ${leadId}`);
}

/**
 * Cache lead context for quick access
 */
async function cacheLeadContext(lead) {
  // TODO: Implement Redis caching
  console.log(`💾 Cached lead context: ${lead.id}`);
}

/**
 * Log all FUB events for audit trail
 */
function logFubEvent(event, data) {
  // TODO: Log to database/audit table
  console.log(`📋 Audit: ${event} - ${JSON.stringify(data)}`);
}

// ===== EXPORTS =====
module.exports = {
  router,
  fubEventBus,
  verifyFubWebhookSignature,
};
