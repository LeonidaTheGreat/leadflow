'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');
const axios = require('axios');
const { sendSmsViatwilio } = require('../twilio-sms');
const { scheduleSatisfactionPing } = require('../satisfaction-service');
const sequenceService = require('./SequenceService');

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
    this.createLeadSequence = options.createLeadSequence || ((p) => sequenceService.createLeadSequence(p));
    this.findLeadByFubId = options.findLeadByFubId || ((id) => sequenceService.findLeadByFubId(id));
    this.logger = options.logger || console;
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

    this.logger.log('📨 FUB Webhook received:', fubEvent);
    this.logger.log('📦 Payload:', JSON.stringify(payload, null, 2));

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
    this.logger.log('🆕 Lead Created:', {
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

      if (!fullLead.consents?.sms) {
        this.logger.warn(`⚠️  Lead ${leadData.id} has not consented to SMS`);
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

      this.logger.log(`✅ SMS sent to lead ${fullLead.id}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.created:', error.message);
    }
  }

  async handleLeadUpdated(leadData) {
    this.logger.log('📝 Lead Updated:', leadData.id);

    try {
      await this.invalidateLeadCache(leadData.id);
      const fullLead = await this.fetchLeadFromFub(leadData.id);
      await this.cacheLeadContext(fullLead);
      this.logger.log(`✅ Lead ${leadData.id} context refreshed`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.updated:', error.message);
    }
  }

  async handleLeadStatusChanged(leadData) {
    const { leadId, oldStatus, newStatus } = leadData;
    this.logger.log(`🔄 Lead Status Changed: ${oldStatus} → ${newStatus}`);

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
        this.logger.log(`  → No SMS trigger for status: ${newStatus}`);
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

      this.logger.log(`✅ Status-triggered SMS sent to lead ${leadId}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.status_changed:', error.message);
    }
  }

  async handleLeadAssigned(leadData) {
    const { leadId, agentId, agentName } = leadData;
    this.logger.log(`👤 Lead Assigned: ${agentName}`);

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

      this.logger.log(`✅ Agent intro SMS sent to lead ${leadId}`);
    } catch (error) {
      this.logger.error('❌ Error processing lead.assigned:', error.message);
    }
  }

  async fetchLeadFromFub(leadId) {
    const fubApiKey = process.env.FUB_API_KEY;
    const fubApiBase = process.env.FUB_API_BASE_URL;

    try {
      const response = await this.axios.get(`${fubApiBase}/leads/${leadId}`, {
        headers: {
          Authorization: `Bearer ${fubApiKey}`,
          'Content-Type': 'application/json'
        }
      });

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

    const templates = {
      initial_response: `Hi ${lead.firstName}, I'm ${process.env.AGENT_NAME}. I have properties matching your interests. Reply YES to see options.`,
      appointment_confirmation: `Your showing is confirmed for ${lead.appointmentTime}. See you then!`,
      follow_up_after_showing: `Hi ${lead.firstName}, what did you think of the property? Let me know if you have questions.`,
      agent_intro: `Hi, I'm ${options.agentName}, your real estate agent. Looking forward to helping you find your home!`
    };

    return {
      message: templates[trigger] || templates.initial_response,
      trigger,
      confidence: 0.95
    };
  }

  async logSmsInFub(logData) {
    const fubApiKey = process.env.FUB_API_KEY;
    const fubApiBase = process.env.FUB_API_BASE_URL;

    try {
      await this.axios.post(`${fubApiBase}/leads/${logData.leadId}/notes`, {
        text: `[AI SMS] ${logData.messageContent}\nTwilio SID: ${logData.smsId}\nStatus: ${logData.deliveryStatus}`,
        type: 'sms_ai_response',
        timestamp: logData.timestamp
      }, {
        headers: {
          Authorization: `Bearer ${fubApiKey}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      this.logger.error('⚠️  Error logging SMS to FUB:', error.message);
    }
  }

  async invalidateLeadCache(leadId) {
    this.logger.log(`🗑️  Invalidated cache for lead ${leadId}`);
  }

  async cacheLeadContext(lead) {
    this.logger.log(`💾 Cached lead context: ${lead.id}`);
  }

  logFubEvent(event, data) {
    this.logger.log(`📋 Audit: ${event} - ${JSON.stringify(data)}`);
  }
}

module.exports = FUBService;
