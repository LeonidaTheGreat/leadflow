'use strict';

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

function cleanEnvValue(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^['"]|['"]$/g, '');
}

class TwilioService {
  /**
   * @param {Object} options
   * @param {Object} options.db - Database client (PostgREST). Defaults to createClient().
   * @param {Function} options.twilioFactory - Factory to build Twilio clients. Defaults to twilio().
   */
  constructor(options = {}) {
    this.db = options.db || createClient();
    this._twilioFactory = options.twilioFactory || twilio;
    this._platformClient = null;

    const twilioPhoneNumberUs = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER_US);
    const twilioPhoneNumberCa = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER_CA);
    const twilioPhoneNumberLegacy = cleanEnvValue(process.env.TWILIO_PHONE_NUMBER);

    this.smsConfig = {
      phoneNumbers: {
        us: twilioPhoneNumberUs || twilioPhoneNumberLegacy,
        ca: twilioPhoneNumberCa,
      },
      defaultPhoneNumber: twilioPhoneNumberUs || twilioPhoneNumberLegacy || twilioPhoneNumberCa,
      maxMessageLength: 160,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || null,
    };
  }

  // ===== CLIENT RESOLUTION =====

  /**
   * Get the platform-owned Twilio client (lazy init).
   * Returns null when platform credentials are not configured.
   */
  getPlatformTwilioClient() {
    if (this._platformClient) return this._platformClient;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this._platformClient = this._twilioFactory(accountSid, authToken);
    }

    return this._platformClient;
  }

  /**
   * Build a Twilio client for the given credentials.
   * Returns null when credentials are incomplete.
   */
  _buildTwilioClient(accountSid, authToken) {
    if (!accountSid || !authToken) return null;
    return this._twilioFactory(accountSid, authToken);
  }

  /**
   * Resolve the Twilio client and from-number to use for a given agent.
   *
   * Steps:
   *   1. Look up agent_integrations for customer-provided credentials.
   *   2. If found and valid, use those.
   *   3. Otherwise fall back to platform credentials.
   *
   * @param {string|null} agentId - Agent ID (real estate agent / customer)
   * @param {string} toNumber - Destination phone (E.164), used for market detection
   * @param {string|null} market - Market override ('us', 'ca', etc.)
   * @returns {Promise<{client: object, fromNumber: string, mode: 'platform'|'customer'}>}
   */
  async resolveTwilioContext(agentId, toNumber, market) {
    if (agentId) {
      try {
        const { data: integration } = await this.db
          .from('agent_integrations')
          .select('twilio_account_sid, twilio_auth_token, twilio_phone_e164, twilio_phone_number')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (
          integration &&
          integration.twilio_account_sid &&
          integration.twilio_auth_token
        ) {
          const customerClient = this._buildTwilioClient(
            integration.twilio_account_sid,
            integration.twilio_auth_token
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
        'or connect a Twilio account in Settings → Integrations.'
      );
    }

    return { client: platformClient, fromNumber, mode: 'platform' };
  }

  // ===== SMS SENDING =====

  /**
   * Send SMS via Twilio.
   *
   * Automatically selects the right Twilio credentials:
   *   - If the agent has their own credentials in agent_integrations, those are used.
   *   - Otherwise, falls back to platform-owned credentials (env vars).
   *
   * @param {string} toNumber - Recipient phone number (E.164 format: +14165551234)
   * @param {string} messageContent - SMS message body
   * @param {Object} options - Additional options
   * @param {string} options.leadId - Lead ID for logging
   * @param {string} options.agentId - Agent ID (real estate agent) for credential resolution
   * @param {string} options.trigger - What triggered this SMS
   * @param {string} options.market - Market code (us, ca-ontario, etc.)
   * @returns {Promise<Object>} SMS result with sid, status, and metadata
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

      const errorInfo = TwilioService.classifyTwilioError(error);

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

  // Backward-compatible alias
  async sendSmsViatwilio(toNumber, messageContent, options = {}) {
    return this.sendSms(toNumber, messageContent, options);
  }

  // ===== VALIDATION & HELPERS =====

  /**
   * Validate SMS input parameters.
   */
  validateSmsInput(toNumber, messageContent) {
    if (!toNumber) {
      throw new Error('Recipient phone number is required');
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(toNumber)) {
      throw new Error(
        `Invalid phone number format: ${toNumber}. Must be E.164 format (e.g., +14165551234)`
      );
    }

    if (!messageContent || messageContent.trim().length === 0) {
      throw new Error('Message content is required');
    }

    const hasStopLanguage = /\b(stop|unsubscribe|cancel|end|quit)\b/i.test(messageContent);
    if (!hasStopLanguage) {
      console.warn(`⚠️  SMS missing STOP language - may violate TCPA compliance`);
    }
  }

  /**
   * Select appropriate from number based on market.
   */
  selectFromNumber(market, toNumber) {
    if (market) {
      const marketLower = market.toLowerCase();
      if (marketLower.includes('ca') || marketLower.includes('canada')) {
        if (this.smsConfig.phoneNumbers.ca) {
          return this.smsConfig.phoneNumbers.ca;
        }
        console.warn(`⚠️  CA phone number not configured, using US number`);
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

  /**
   * Truncate message to fit SMS limits.
   */
  truncateMessage(message) {
    if (message.length <= this.smsConfig.maxMessageLength) {
      return message;
    }
    return message.slice(0, this.smsConfig.maxMessageLength - 3) + '...';
  }

  // ===== ERROR CLASSIFICATION =====

  /**
   * Returns true when the error is an A2P 10DLC carrier filtering error.
   */
  static isA2pBlockedError(error) {
    return A2P_ERROR_CODE_SET.has(error.code);
  }

  /**
   * Classify Twilio error for better handling.
   */
  static classifyTwilioError(error) {
    const code = error.code;

    if (TwilioService.isA2pBlockedError(error)) {
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

  // ===== DATABASE LOGGING =====

  /**
   * Log SMS to database for tracking and analytics.
   */
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

  // ===== STATUS & HISTORY =====

  /**
   * Update SMS status from Twilio webhook callback.
   */
  async updateSmsStatus(statusData) {
    const { MessageSid, MessageStatus } = statusData;

    console.log(`🔄 Updating SMS status: ${MessageSid} → ${MessageStatus}`);

    try {
      const updateData = {
        twilio_status: MessageStatus,
      };

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

  /**
   * Get SMS delivery status by SID.
   * Uses platform credentials (not per-agent).
   */
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

  /**
   * Fetch SMS history for a lead.
   */
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

  /**
   * Get SMS analytics for an agent.
   */
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
        const status = row.twilio_status;
        stats.total++;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        if (status === 'delivered') {
          stats.delivered++;
        } else if (status === 'failed' || status === 'undelivered') {
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
}

// ===== EXPORTS =====
// Export the class as default, plus constants and static helpers for direct access
module.exports = TwilioService;
module.exports.TwilioService = TwilioService;
module.exports.DeliveryStatus = DeliveryStatus;
module.exports.TwilioErrorCodes = TwilioErrorCodes;
module.exports.A2P_ERROR_CODE_SET = A2P_ERROR_CODE_SET;
