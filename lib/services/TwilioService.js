/**
 * TwilioService — SMS sending, status tracking, and analytics via Twilio.
 *
 * Provisioning modes:
 *   platform — LeadFlow's own Twilio account (env vars TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)
 *   customer — Agent-provided credentials stored in agent_integrations table
 *
 * Resolution order when sending for a specific agent:
 *   1. Agent's own credentials from agent_integrations (if present)
 *   2. Platform credentials from environment variables (fallback)
 */

'use strict';

const twilio = require('twilio');
const { createClient } = require('../db');

// ===== SMS DELIVERY STATUS ENUM =====
const DeliveryStatus = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  UNDELIVERED: 'undelivered',
  RECEIVING: 'receiving',
  RECEIVED: 'received',
  ACCEPTED: 'accepted',
  SCHEDULED: 'scheduled',
  READ: 'read',
};

// ===== ERROR CODES =====
const TwilioErrorCodes = {
  INVALID_TO_NUMBER: 21211,
  TO_NUMBER_NOT_SMS_CAPABLE: 21614,
  MESSAGE_BODY_TOO_LONG: 21605,
  INVALID_FROM_NUMBER: 21212,
  ACCOUNT_SUSPENDED: 20003,
  INSUFFICIENT_FUNDS: 20005,
  RATE_LIMIT_EXCEEDED: 20429,
  A2P_CARRIER_FILTERED: 30034,
  CARRIER_FILTERED: 30007,
  CARRIER_FILTERED_UNKNOWN: 30008,
  UNREACHABLE_CARRIER: 30003,
  LANDLINE_OR_UNREACHABLE: 30006,
};

// A2P error codes as a set for fast lookup
const A2P_ERROR_CODE_SET = new Set([
  TwilioErrorCodes.A2P_CARRIER_FILTERED,
  TwilioErrorCodes.CARRIER_FILTERED,
  TwilioErrorCodes.CARRIER_FILTERED_UNKNOWN,
  TwilioErrorCodes.UNREACHABLE_CARRIER,
  TwilioErrorCodes.LANDLINE_OR_UNREACHABLE,
]);

// ===== HELPERS =====

function cleanEnvValue(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

/**
 * Returns true when the error is an A2P 10DLC carrier filtering error.
 */
function isA2pBlockedError(error) {
  return A2P_ERROR_CODE_SET.has(error.code);
}

/**
 * Classify Twilio error for better handling.
 */
function classifyTwilioError(error) {
  const code = error.code;

  if (isA2pBlockedError(error)) {
    return {
      code,
      category: 'A2P_BLOCKED',
      message: `SMS blocked by carrier — A2P 10DLC registration required (error ${code}): ${error.message}`,
      retryable: false,
    };
  }

  if (code === TwilioErrorCodes.INVALID_TO_NUMBER ||
      code === TwilioErrorCodes.TO_NUMBER_NOT_SMS_CAPABLE) {
    return {
      code,
      category: 'INVALID_NUMBER',
      message: `Invalid or non-SMS-capable phone number: ${error.message}`,
      retryable: false,
    };
  }

  if (code === TwilioErrorCodes.MESSAGE_BODY_TOO_LONG) {
    return {
      code,
      category: 'CONTENT_ERROR',
      message: `Message content error: ${error.message}`,
      retryable: true,
    };
  }

  if (code === TwilioErrorCodes.ACCOUNT_SUSPENDED ||
      code === TwilioErrorCodes.INSUFFICIENT_FUNDS) {
    return {
      code,
      category: 'ACCOUNT_ERROR',
      message: `Twilio account issue: ${error.message}`,
      retryable: false,
    };
  }

  if (code === TwilioErrorCodes.RATE_LIMIT_EXCEEDED) {
    return {
      code,
      category: 'RATE_LIMIT',
      message: `Rate limit exceeded: ${error.message}`,
      retryable: true,
    };
  }

  return {
    code: code || 'UNKNOWN',
    category: 'UNKNOWN',
    message: `SMS send failed: ${error.message}`,
    retryable: true,
  };
}

// ===== SERVICE CLASS =====

class TwilioService {
  constructor(options = {}) {
    this.db = options.db || createClient();
    this._platformClient = null;

    // Capture credentials at construction time so tests can set env then restore
    this._accountSid = process.env.TWILIO_ACCOUNT_SID;
    this._authToken = process.env.TWILIO_AUTH_TOKEN;

    const phoneUs = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER_US);
    const phoneCa = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER_CA);
    const phoneLegacy = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER);

    this.smsConfig = {
      phoneNumbers: {
        us: phoneUs || phoneLegacy,
        ca: phoneCa,
      },
      defaultPhoneNumber: phoneUs || phoneLegacy || phoneCa,
      maxMessageLength: 160,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || null,
    };
  }

  // ----- Platform client (lazy init) -----

  getPlatformTwilioClient() {
    if (this._platformClient) return this._platformClient;

    if (this._accountSid && this._authToken) {
      this._platformClient = twilio(this._accountSid, this._authToken);
    }

    return this._platformClient;
  }

  // ----- Credential resolution -----

  /**
   * Resolve Twilio client + from-number for a given agent.
   *   1. Agent's own credentials from agent_integrations
   *   2. Platform credentials (fallback)
   */
  async resolveTwilioContext(agentId, toNumber, market) {
    if (agentId) {
      try {
        const { data: integration } = await this.db
          .from('agent_integrations')
          .select('twilio_account_sid, twilio_auth_token, twilio_phone_e164, twilio_phone_number')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (integration && integration.twilio_account_sid && integration.twilio_auth_token) {
          const customerClient = this._buildTwilioClient(
            integration.twilio_account_sid,
            integration.twilio_auth_token,
          );
          if (customerClient) {
            const fromNumber =
              integration.twilio_phone_e164 ||
              (integration.twilio_phone_number
                ? `+1${integration.twilio_phone_number}`
                : null);

            if (fromNumber) {
              return { client: customerClient, fromNumber, mode: 'customer' };
            }
          }
        }
      } catch (err) {
        console.warn('[TwilioService] Could not load agent integrations, using platform credentials:', err.message);
      }
    }

    const platformClient = this.getPlatformTwilioClient();
    const fromNumber = this.selectFromNumber(market, toNumber);

    if (!platformClient) {
      throw new Error(
        'No Twilio credentials available. Configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, ' +
        'or connect a Twilio account in Settings → Integrations.',
      );
    }

    return { client: platformClient, fromNumber, mode: 'platform' };
  }

  // ----- Phone number selection -----

  selectFromNumber(market, toNumber) {
    if (market) {
      const marketLower = market.toLowerCase();
      if (marketLower.includes('ca') || marketLower.includes('canada')) {
        if (this.smsConfig.phoneNumbers.ca) {
          return this.smsConfig.phoneNumbers.ca;
        }
        console.warn('⚠️  CA phone number not configured, using US number');
      }
    }

    if (toNumber && toNumber.startsWith('+1')) {
      const areaCode = toNumber.slice(2, 5);
      const canadianAreaCodes = [
        '204', '226', '236', '249', '250', '289', '306', '403', '416', '418',
        '431', '437', '438', '450', '506', '514', '519', '548', '581', '587',
        '600', '613', '647', '705', '709', '778', '780', '807', '819', '825',
        '867', '902', '905', '920',
      ];

      if (canadianAreaCodes.includes(areaCode) && this.smsConfig.phoneNumbers.ca) {
        return this.smsConfig.phoneNumbers.ca;
      }
    }

    if (!this.smsConfig.defaultPhoneNumber) {
      throw new Error('No Twilio phone number configured. Set TWILIO_PHONE_NUMBER_US or TWILIO_PHONE_NUMBER_CA');
    }

    return this.smsConfig.defaultPhoneNumber;
  }

  // ----- Validation -----

  validateSmsInput(toNumber, messageContent) {
    if (!toNumber) {
      throw new Error('Recipient phone number is required');
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(toNumber)) {
      throw new Error(
        `Invalid phone number format: ${toNumber}. Must be E.164 format (e.g., +14165551234)`,
      );
    }

    if (!messageContent || messageContent.trim().length === 0) {
      throw new Error('Message content is required');
    }

    const hasStopLanguage = /\b(stop|unsubscribe|cancel|end|quit)\b/i.test(messageContent);
    if (!hasStopLanguage) {
      console.warn('⚠️  SMS missing STOP language - may violate TCPA compliance');
    }
  }

  // ----- Message truncation -----

  truncateMessage(message) {
    if (message.length <= this.smsConfig.maxMessageLength) {
      return message;
    }
    return message.slice(0, this.smsConfig.maxMessageLength - 3) + '...';
  }

  // ----- Send SMS -----

  /**
   * Send SMS via Twilio.
   * Automatically resolves platform vs customer credentials.
   */
  async sendSms(toNumber, messageContent, options = {}) {
    const startTime = Date.now();
    const { leadId, agentId, trigger, market } = options;

    console.log(`📤 Sending SMS via Twilio to ${toNumber}`);

    let resolvedFromNumber = this.selectFromNumber(market, toNumber);

    try {
      this.validateSmsInput(toNumber, messageContent);

      const { client, fromNumber, mode } = await this.resolveTwilioContext(agentId, toNumber, market);
      resolvedFromNumber = fromNumber;
      console.log(`   Provisioning mode: ${mode}`);

      const truncatedMessage = this.truncateMessage(messageContent);
      if (truncatedMessage !== messageContent) {
        console.warn(`⚠️  Message truncated from ${messageContent.length} to ${truncatedMessage.length} chars`);
      }

      const messageParams = {
        to: toNumber,
        from: fromNumber,
        body: truncatedMessage,
      };

      if (this.smsConfig.statusCallback) {
        messageParams.statusCallback = this.smsConfig.statusCallback;
      }

      const message = await client.messages.create(messageParams);
      const duration = Date.now() - startTime;

      console.log(`✅ SMS sent successfully`);
      console.log(`   SID: ${message.sid}`);
      console.log(`   Status: ${message.status}`);
      console.log(`   From: ${message.from}`);
      console.log(`   To: ${message.to}`);
      console.log(`   Duration: ${duration}ms`);

      const result = {
        sid: message.sid,
        status: message.status,
        from: message.from,
        to: message.to,
        body: truncatedMessage,
        direction: message.direction,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        numSegments: message.numSegments,
        price: message.price,
        priceUnit: message.priceUnit,
        uri: message.uri,
        apiVersion: message.apiVersion,
        duration,
        success: true,
      };

      this._logSmsToDatabase(result, { leadId, agentId, trigger, market })
        .catch(err => console.error('❌ Failed to log SMS to database:', err.message));

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ SMS send failed after ${duration}ms:`, error.message);

      const errorInfo = classifyTwilioError(error);

      const failedResult = {
        sid: null,
        status: DeliveryStatus.FAILED,
        from: resolvedFromNumber,
        to: toNumber,
        body: messageContent,
        errorCode: error.code || errorInfo.code,
        errorMessage: error.message,
        duration,
        success: false,
      };

      this._logSmsToDatabase(failedResult, { leadId, agentId, trigger, market, error: errorInfo })
        .catch(err => console.error('❌ Failed to log SMS error to database:', err.message));

      const enrichedError = new Error(errorInfo.message);
      enrichedError.code = errorInfo.code;
      enrichedError.category = errorInfo.category;
      enrichedError.retryable = errorInfo.retryable;
      enrichedError.originalError = error;
      throw enrichedError;
    }
  }

  // ----- Status tracking -----

  async updateSmsStatus(statusData) {
    const { MessageSid, MessageStatus } = statusData;
    console.log(`🔄 Updating SMS status: ${MessageSid} → ${MessageStatus}`);

    try {
      const updateData = { twilio_status: MessageStatus };
      if (MessageStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { data, error } = await this.db
        .from('conversations')
        .update(updateData)
        .eq('twilio_sid', MessageSid)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update SMS status:', error.message);
        return null;
      }

      console.log(`✅ SMS status updated: ${MessageSid} → ${MessageStatus}`);
      return data;

    } catch (err) {
      console.error('❌ Error updating SMS status:', err.message);
      return null;
    }
  }

  async getSmsStatus(sid) {
    const client = this.getPlatformTwilioClient();
    if (!client) {
      throw new Error('Platform Twilio credentials not configured');
    }
    try {
      const message = await client.messages(sid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
      };
    } catch (error) {
      console.error(`❌ Failed to fetch SMS status for ${sid}:`, error.message);
      throw error;
    }
  }

  // ----- History & Analytics -----

  async getSmsHistoryForLead(leadId, options = {}) {
    const { limit = 50, status = null } = options;

    try {
      let query = this.db
        .from('conversations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('twilio_status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch SMS history:', error.message);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error('❌ Error fetching SMS history:', err.message);
      throw err;
    }
  }

  async getSmsAnalytics(agentId, options = {}) {
    const { startDate, endDate } = options;

    try {
      let query = this.db
        .from('conversations')
        .select('twilio_status, leads!inner(agent_id)')
        .eq('leads.agent_id', agentId);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch SMS analytics:', error.message);
        throw error;
      }

      const stats = {
        total: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        byStatus: {},
      };

      for (const row of data || []) {
        const rowStatus = row.twilio_status;
        stats.total++;
        stats.byStatus[rowStatus] = (stats.byStatus[rowStatus] || 0) + 1;

        if (rowStatus === 'delivered') {
          stats.delivered++;
        } else if (rowStatus === 'failed' || rowStatus === 'undelivered') {
          stats.failed++;
        } else {
          stats.pending++;
        }
      }

      stats.deliveryRate = stats.total > 0
        ? ((stats.delivered / stats.total) * 100).toFixed(2)
        : 0;

      return stats;
    } catch (err) {
      console.error('❌ Error fetching SMS analytics:', err.message);
      throw err;
    }
  }

  // ----- Private helpers -----

  _buildTwilioClient(accountSid, authToken) {
    if (!accountSid || !authToken) return null;
    return twilio(accountSid, authToken);
  }

  async _logSmsToDatabase(result, metadata = {}) {
    const { leadId, agentId, trigger, market, error } = metadata;

    try {
      const logEntry = {
        lead_id: leadId || null,
        direction: result.direction?.includes('inbound') ? 'inbound' : 'outbound',
        message_body: result.body,
        twilio_sid: result.sid,
        twilio_status: result.status,
        from_number: result.from,
        to_number: result.to,
        trigger_type: trigger || null,
        created_at: result.dateCreated ? new Date(result.dateCreated).toISOString() : new Date().toISOString(),
        delivered_at: result.status === 'delivered' ? new Date().toISOString() : null,
      };

      const { data, error: dbError } = await this.db
        .from('conversations')
        .insert(logEntry)
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database insert error:', dbError.message);
        return null;
      }

      console.log(`💾 SMS logged to database (ID: ${data.id})`);

      await this.db.from('events').insert({
        lead_id: leadId || null,
        event_type: logEntry.direction === 'inbound' ? 'sms_received' : 'sms_sent',
        event_data: {
          twilio_sid: result.sid,
          status: result.status,
          trigger: trigger || null,
          error_code: result.errorCode || (error ? error.code : null),
          duration_ms: result.duration,
        },
        created_at: new Date().toISOString(),
      }).catch(e => console.error('❌ Failed to log event:', e.message));

      return data;

    } catch (err) {
      console.error('❌ Failed to log SMS to database:', err.message);
      return null;
    }
  }
}

// Static references for backward compatibility
TwilioService.DeliveryStatus = DeliveryStatus;
TwilioService.TwilioErrorCodes = TwilioErrorCodes;
TwilioService.A2P_ERROR_CODE_SET = A2P_ERROR_CODE_SET;
TwilioService.classifyTwilioError = classifyTwilioError;
TwilioService.isA2pBlockedError = isA2pBlockedError;
TwilioService.cleanEnvValue = cleanEnvValue;

// Default singleton for callers that don't need a custom instance
let _defaultInstance = null;
function getDefaultInstance() {
  if (!_defaultInstance) _defaultInstance = new TwilioService();
  return _defaultInstance;
}

// Backward-compat named exports (delegate to default singleton)
function sendSmsViatwilio(toNumber, messageContent, options) {
  return getDefaultInstance().sendSms(toNumber, messageContent, options);
}

module.exports = TwilioService;

// Named exports for backward compatibility with callers that destructure
module.exports.TwilioService = TwilioService;
module.exports.sendSmsViatwilio = sendSmsViatwilio;
module.exports.DeliveryStatus = DeliveryStatus;
module.exports.TwilioErrorCodes = TwilioErrorCodes;
module.exports.A2P_ERROR_CODE_SET = A2P_ERROR_CODE_SET;
module.exports.SMS_CONFIG = { get phoneNumbers() { return getDefaultInstance().smsConfig.phoneNumbers; }, get defaultPhoneNumber() { return getDefaultInstance().smsConfig.defaultPhoneNumber; }, get maxMessageLength() { return getDefaultInstance().smsConfig.maxMessageLength; }, get statusCallback() { return getDefaultInstance().smsConfig.statusCallback; } };
module.exports.classifyTwilioError = classifyTwilioError;
module.exports.isA2pBlockedError = isA2pBlockedError;
module.exports.cleanEnvValue = cleanEnvValue;
module.exports.resolveTwilioContext = function(agentId, toNumber, market) { return getDefaultInstance().resolveTwilioContext(agentId, toNumber, market); };
module.exports.getPlatformTwilioClient = function() { return getDefaultInstance().getPlatformTwilioClient(); };
module.exports.validateSmsInput = function(toNumber, msg) { return getDefaultInstance().validateSmsInput(toNumber, msg); };
module.exports.selectFromNumber = function(market, toNumber) { return getDefaultInstance().selectFromNumber(market, toNumber); };
module.exports.truncateMessage = function(msg) { return getDefaultInstance().truncateMessage(msg); };
module.exports.updateSmsStatus = function(data) { return getDefaultInstance().updateSmsStatus(data); };
module.exports.getSmsStatus = function(sid) { return getDefaultInstance().getSmsStatus(sid); };
module.exports.getSmsHistoryForLead = function(leadId, opts) { return getDefaultInstance().getSmsHistoryForLead(leadId, opts); };
module.exports.getSmsAnalytics = function(agentId, opts) { return getDefaultInstance().getSmsAnalytics(agentId, opts); };
