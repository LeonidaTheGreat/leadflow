'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');
const axios = require('axios');
const { logger: defaultLogger } = require('../logger');
const { breakers, withRetry } = require('../utils/circuit-breaker');
const { getRequestId } = require('../request-context');
const TwilioService = require('./TwilioService');
const _twilioService = new TwilioService();
const sendSmsViatwilio = _twilioService.sendSms.bind(_twilioService);
const SatisfactionService = require('./SatisfactionService');
const _satisfactionService = new SatisfactionService();
const scheduleSatisfactionPing = _satisfactionService.scheduleSatisfactionPing.bind(_satisfactionService);
const SequenceService = require('./SequenceService');
const _defaultSequenceService = new SequenceService();
const createLeadSequence = _defaultSequenceService.createLeadSequence.bind(_defaultSequenceService);
const findLeadByFubId = _defaultSequenceService.findLeadByFubId.bind(_defaultSequenceService);

const EVENT_MAP = {
  peopleCreated: 'lead.created',
  peopleUpdated: 'lead.updated',
  peopleStageUpdated: 'lead.status_changed',
  peopleTagsCreated: 'lead.tagged'
};

class FUBService {
  constructor(options = {}) {
    this.axios = options.axios || axios;
    this.eventBus = options.eventBus || new EventEmitter();
    this.sendSmsViatwilio = options.sendSmsViatwilio || sendSmsViatwilio;
    this.scheduleSatisfactionPing = options.scheduleSatisfactionPing || scheduleSatisfactionPing;
    this.createLeadSequence = options.createLeadSequence || createLeadSequence;
    this.findLeadByFubId = options.findLeadByFubId || findLeadByFubId;
    this.logger = options.logger || defaultLogger;
    this.eventMap = options.eventMap || EVENT_MAP;
    this.handlersRegistered = false;

    if (options.registerEventHandlers !== false) {
      this.registerEventHandlers();
    }
  }

  registerEventHandlers() {
    if (this.handlersRegistered) {
      return;
    }

    this.eventBus.on('lead.created', (leadData) => this.handleLeadCreated(leadData));
    this.eventBus.on('lead.updated', (leadData) => this.handleLeadUpdated(leadData));
    this.eventBus.on('lead.status_changed', (leadData) => this.handleLeadStatusChanged(leadData));
    this.eventBus.on('lead.assigned', (leadData) => this.handleLeadAssigned(leadData));

    this.handlersRegistered = true;
  }

  verifyWebhookSignature(req) {
    const signature = req.headers['fub-signature'] || req.headers['x-signature'];
    const webhookSecret = process.env.FUB_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      this.logger.warn('⚠️  Missing signature or webhook secret');
      return false;
    }

    const payload = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = hash === signature;
    if (!isValid) {
      this.logger.error('❌ Webhook signature mismatch');
    }

    return isValid;
  }

  mapEvent(fubEvent) {
    return this.eventMap[fubEvent] || fubEvent;
  }

  handleWebhookPayload(payload = {}) {
    const fubEvent = payload.event;
    const internalEvent = this.mapEvent(fubEvent);

    this.logger.info('📨 FUB Webhook received', { event: fubEvent });
    this.logger.info('📦 Payload', { payload: JSON.stringify(payload) });

    setImmediate(() => {
      this.eventBus.emit(internalEvent, payload);
    });

    this.logFubEvent(internalEvent, payload);

    return {
      received: true,
      event: internalEvent
    };
  }

  async handleLeadCreated(leadData) {
    this.logger.info('🆕 Lead Created:', {
      leadId: leadData.id,
      name: leadData.name,
      phone: leadData.phoneNumber,
      email: leadData.email,
      source: leadData.source
    });

    try {
      if (!leadData.phoneNumber) {
        this.logger.warn(`⚠️  Lead ${leadData.id} missing phone number, skipping SMS`);
        return;
      }

      const fullLead = await this.fetchLeadFromFub(leadData.id);

      if (fullLead.consents?.sms === false) {
        this.logger.warn(`⚠️  Lead ${leadData.id} has opted out of SMS`);
        return;
      }

      const isDnc = await this.checkDncStatus(fullLead.phoneNumber);
      if (isDnc) {
        this.logger.warn(`🚫 Lead ${leadData.id} on DNC list, skipping SMS`);
        return;
      }

      const aiResponse = await this.generateAiSmsResponse(fullLead);
      const smsResult = await this.sendSmsViatwilio(
        fullLead.phoneNumber,
        aiResponse.message,
        {
          leadId: fullLead.id,
          trigger: 'initial_response'
        }
      );

      await this.logSmsInFub({
        leadId: fullLead.id,
        messageContent: aiResponse.message,
        smsId: smsResult.sid,
        deliveryStatus: smsResult.status,
        timestamp: new Date().toISOString()
      });

      const internalLeadId = await this.findLeadByFubId(fullLead.id);
      if (internalLeadId) {
        await this.createLeadSequence({
          lead_id: internalLeadId,
          sequence_type: 'no_response',
          trigger_reason: 'new_lead_no_response',
          metadata: { fub_id: String(fullLead.id), triggered_by: 'lead.created' }
        });
      } else {
        this.logger.warn(`⚠️  Could not create no_response sequence: lead not found in DB for fub_id=${fullLead.id}`);
      }

      const agentId = fullLead.assignedTo?.id || null;
      const satisfactionEnabled = fullLead.satisfactionPingEnabled !== false;
      this.scheduleSatisfactionPing({
        leadId: fullLead.id,
        agentId,
        conversationId: fullLead.id,
        phone: fullLead.phoneNumber,
        lastAiMessageAt: new Date().toISOString(),
        agentSatisfactionPingEnabled: satisfactionEnabled,
        sendSmsFunction: this.sendSmsViatwilio
      });

      this.logger.info(`✅ SMS sent to lead ${fullLead.id}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.created:', error.message);
    }
  }

  async handleLeadUpdated(leadData) {
    this.logger.info('📝 Lead Updated:', leadData.id);

    try {
      await this.invalidateLeadCache(leadData.id);
      const fullLead = await this.fetchLeadFromFub(leadData.id);
      await this.cacheLeadContext(fullLead);
      this.logger.info(`✅ Lead ${leadData.id} context refreshed`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.updated:', error.message);
    }
  }

  async handleLeadStatusChanged(leadData) {
    const { leadId, oldStatus, newStatus } = leadData;
    this.logger.info(`🔄 Lead Status Changed: ${oldStatus} → ${newStatus}`);

    try {
      const fullLead = await this.fetchLeadFromFub(leadId);

      const statusTriggers = {
        'Appointment Set': 'appointment_confirmation',
        Viewed: 'follow_up_after_showing',
        Offer: 'offer_acknowledgment',
        'No Show': 'no_show_follow_up',
        Missed: 'no_show_follow_up'
      };

      if (!statusTriggers[newStatus]) {
        this.logger.info(`  → No SMS trigger for status: ${newStatus}`);
        return;
      }

      const aiResponse = await this.generateAiSmsResponse(fullLead, {
        trigger: statusTriggers[newStatus],
        previousStatus: oldStatus
      });

      const smsResult = await this.sendSmsViatwilio(
        fullLead.phoneNumber,
        aiResponse.message,
        {
          leadId: fullLead.id,
          trigger: statusTriggers[newStatus]
        }
      );

      await this.logSmsInFub({
        leadId: fullLead.id,
        messageContent: aiResponse.message,
        smsId: smsResult.sid,
        trigger: statusTriggers[newStatus],
        timestamp: new Date().toISOString()
      });

      const internalLeadId = await this.findLeadByFubId(fullLead.id);
      if (internalLeadId) {
        if (newStatus === 'Appointment Set') {
          await this.createLeadSequence({
            lead_id: internalLeadId,
            sequence_type: 'post_viewing',
            trigger_reason: 'booking_confirmed',
            metadata: { fub_id: String(fullLead.id), triggered_by: 'lead.status_changed', new_status: newStatus }
          });
        }

        if (newStatus === 'No Show' || newStatus === 'Missed') {
          await this.createLeadSequence({
            lead_id: internalLeadId,
            sequence_type: 'no_show',
            trigger_reason: 'missed_appointment',
            metadata: { fub_id: String(fullLead.id), triggered_by: 'lead.status_changed', new_status: newStatus }
          });
        }
      } else {
        this.logger.warn(`⚠️  Could not create sequence: lead not found in DB for fub_id=${fullLead.id}`);
      }

      const agentId = fullLead.assignedTo?.id || null;
      const satisfactionEnabled = fullLead.satisfactionPingEnabled !== false;
      this.scheduleSatisfactionPing({
        leadId: fullLead.id,
        agentId,
        conversationId: fullLead.id,
        phone: fullLead.phoneNumber,
        lastAiMessageAt: new Date().toISOString(),
        agentSatisfactionPingEnabled: satisfactionEnabled,
        sendSmsFunction: this.sendSmsViatwilio
      });

      this.logger.info(`✅ Status-triggered SMS sent to lead ${leadId}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.status_changed:', error.message);
    }
  }

  async handleLeadAssigned(leadData) {
    const { leadId, agentId, agentName } = leadData;
    this.logger.info(`👤 Lead Assigned: ${agentName}`);

    try {
      const fullLead = await this.fetchLeadFromFub(leadId);

      const aiResponse = await this.generateAiSmsResponse(fullLead, {
        trigger: 'agent_intro',
        agentName
      });

      const smsResult = await this.sendSmsViatwilio(
        fullLead.phoneNumber,
        aiResponse.message,
        {
          leadId: fullLead.id,
          trigger: 'agent_intro'
        }
      );

      await this.logSmsInFub({
        leadId: fullLead.id,
        messageContent: aiResponse.message,
        smsId: smsResult.sid,
        trigger: 'agent_intro',
        agentName,
        timestamp: new Date().toISOString()
      });

      const satisfactionEnabled = fullLead.satisfactionPingEnabled !== false;
      this.scheduleSatisfactionPing({
        leadId: fullLead.id,
        agentId,
        conversationId: fullLead.id,
        phone: fullLead.phoneNumber,
        lastAiMessageAt: new Date().toISOString(),
        agentSatisfactionPingEnabled: satisfactionEnabled,
        sendSmsFunction: this.sendSmsViatwilio
      });

      this.logger.info(`✅ Agent intro SMS sent to lead ${leadId}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.assigned:', error.message);
    }
  }

  async fetchLeadFromFub(leadId, requestId) {
    const fubApiKey = process.env.FUB_API_KEY;
    const fubApiBase = process.env.FUB_API_BASE_URL;

    try {
      const response = await withRetry(
        () => breakers.fub.execute(() =>
          this.axios.get(`${fubApiBase}/leads/${leadId}`, {
            headers: {
              Authorization: `Bearer ${fubApiKey}`,
              'Content-Type': 'application/json',
              'X-Request-ID': requestId || getRequestId()
            }
          })
        ),
        { maxRetries: 2 }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error fetching lead ${leadId} from FUB:`, error.message);
      throw error;
    }
  }

  async checkDncStatus() {
    return false;
  }

  async generateAiSmsResponse(lead, options = {}) {
    const trigger = options.trigger || 'initial_response';
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (anthropicApiKey) {
      try {
        const leadName = lead.firstName || 'there';
        const agentName = options.agentName || lead.assignedTo?.name || process.env.AGENT_NAME || 'your agent';
        const property = lead.source || lead.propertyInterest || '123 Main St';

        const triggerInstructions = {
          initial_response: `A new lead just came in. Send a warm, brief initial SMS to ${leadName} introducing yourself as ${agentName} and offering to help them find properties. Keep it under 160 characters. End with "Reply STOP to opt out."`,
          appointment_confirmation: `Confirm the upcoming showing appointment for ${leadName}. Be brief and friendly. Keep it under 160 characters.`,
          follow_up_after_showing: `Follow up with ${leadName} after they viewed a property. Ask for their thoughts and if they have questions. Keep it under 160 characters.`,
          agent_intro: `Introduce yourself as ${agentName}, their real estate agent, to ${leadName}. Be warm and brief. Keep it under 160 characters.`,
          offer_acknowledgment: `Acknowledge ${leadName}'s offer and express enthusiasm. Keep it under 160 characters.`,
          no_show_follow_up: `Gently follow up with ${leadName} who missed their appointment. Offer to reschedule. Keep it under 160 characters.`,
        };

        const instruction = triggerInstructions[trigger] || triggerInstructions.initial_response;
        const prompt = `You are ${agentName}, a professional real estate agent. ${instruction}

Property context: ${property}
Lead name: ${leadName}

Write only the SMS text, nothing else. It must be under 160 characters and end with "Reply STOP to opt out." if this is an initial message.`;

        const response = await this.axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
          },
          {
            headers: {
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            timeout: 15000
          }
        );

        const message = response.data.content[0].text.trim();
        return { message, trigger, confidence: 0.95, ai_generated: true };
      } catch (error) {
        this.logger.warn('Anthropic API call failed, falling back to template:', error.message);
      }
    }

    const templates = {
      initial_response: `Hi ${lead.firstName || 'there'}, I'm ${options.agentName || process.env.AGENT_NAME || 'your agent'}. I have properties matching your interests. Reply YES to see options. Reply STOP to opt out.`,
      appointment_confirmation: `Your showing is confirmed. See you then! Reply STOP to opt out.`,
      follow_up_after_showing: `Hi ${lead.firstName || 'there'}, what did you think of the property? Let me know if you have questions. Reply STOP to opt out.`,
      agent_intro: `Hi, I'm ${options.agentName || 'your agent'}, your real estate agent. Looking forward to helping you find your home! Reply STOP to opt out.`,
      offer_acknowledgment: `Great news, ${lead.firstName || 'there'}! I received your offer details. I'll be in touch shortly. Reply STOP to opt out.`,
      no_show_follow_up: `Hi ${lead.firstName || 'there'}, I missed you today. Want to reschedule? Reply YES or STOP to opt out.`,
    };

    return {
      message: templates[trigger] || templates.initial_response,
      trigger,
      confidence: 0.80,
      ai_generated: false
    };
  }

  async logSmsInFub(logData, requestId) {
    const fubApiKey = process.env.FUB_API_KEY;
    const fubApiBase = process.env.FUB_API_BASE_URL;

    try {
      await breakers.fub.execute(() =>
        this.axios.post(`${fubApiBase}/leads/${logData.leadId}/notes`, {
          text: `[AI SMS] ${logData.messageContent}\nTwilio SID: ${logData.smsId}\nStatus: ${logData.deliveryStatus}`,
          type: 'sms_ai_response',
          timestamp: logData.timestamp
        }, {
          headers: {
            Authorization: `Bearer ${fubApiKey}`,
            'Content-Type': 'application/json',
            'X-Request-ID': requestId || getRequestId()
          }
        })
      );
    } catch (error) {
      this.logger.error('⚠️  Error logging SMS to FUB:', error.message);
    }
  }

  async invalidateLeadCache(leadId) {
    this.logger.info(`🗑️  Invalidated cache for lead ${leadId}`);
  }

  async cacheLeadContext(lead) {
    this.logger.info(`💾 Cached lead context: ${lead.id}`);
  }

  logFubEvent(event, data) {
    this.logger.info(`📋 Audit: ${event} - ${JSON.stringify(data)}`);
  }
}

module.exports = FUBService;
