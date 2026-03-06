/**
 * Twilio SMS Service
 * Real Twilio integration for sending SMS messages to leads
 * Includes error handling, delivery status tracking, and message logging
 */

const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Supabase client for logging
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ===== CONFIGURATION =====
const SMS_CONFIG = {
  // Phone numbers by market
  phoneNumbers: {
    us: process.env.TWILIO_PHONE_NUMBER_US,
    ca: process.env.TWILIO_PHONE_NUMBER_CA,
  },
  // Default to US number if market not specified
  defaultPhoneNumber: process.env.TWILIO_PHONE_NUMBER_US,
  // Maximum SMS length (GSM-7 encoding: 160 chars, UCS-2: 70 chars)
  // Using conservative limit for safety
  maxMessageLength: 160,
  // Status callback URL for delivery tracking (if configured)
  statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || null,
};

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
};

/**
 * Send SMS via Twilio
 * @param {string} toNumber - Recipient phone number (E.164 format: +14165551234)
 * @param {string} messageContent - SMS message body
 * @param {Object} options - Additional options
 * @param {string} options.leadId - Lead ID for logging
 * @param {string} options.agentId - Agent ID for logging
 * @param {string} options.trigger - What triggered this SMS (e.g., 'lead.created', 'appointment_confirmation')
 * @param {string} options.market - Market code (us, ca-ontario, etc.)
 * @returns {Promise<Object>} SMS result with sid, status, and metadata
 */
async function sendSmsViatwilio(toNumber, messageContent, options = {}) {
  const startTime = Date.now();
  const { leadId, agentId, trigger, market } = options;

  console.log(`📤 Sending SMS via Twilio to ${toNumber}`);

  try {
    // 1. Validate inputs
    validateSmsInput(toNumber, messageContent);

    // 2. Determine from number based on market
    const fromNumber = selectFromNumber(market, toNumber);

    // 3. Truncate message if needed (with warning)
    const truncatedMessage = truncateMessage(messageContent);
    if (truncatedMessage !== messageContent) {
      console.warn(`⚠️  Message truncated from ${messageContent.length} to ${truncatedMessage.length} chars`);
    }

    // 4. Build Twilio message parameters
    const messageParams = {
      to: toNumber,
      from: fromNumber,
      body: truncatedMessage,
    };

    // Add status callback if configured
    if (SMS_CONFIG.statusCallback) {
      messageParams.statusCallback = SMS_CONFIG.statusCallback;
    }

    // 5. Send SMS via Twilio API
    const message = await twilioClient.messages.create(messageParams);

    const duration = Date.now() - startTime;

    console.log(`✅ SMS sent successfully`);
    console.log(`   SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   From: ${message.from}`);
    console.log(`   To: ${message.to}`);
    console.log(`   Duration: ${duration}ms`);

    // 6. Prepare result object
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

    // 7. Log to database (async, don't block response)
    logSmsToDatabase(result, { leadId, agentId, trigger, market })
      .catch(err => console.error('❌ Failed to log SMS to database:', err.message));

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ SMS send failed after ${duration}ms:`, error.message);

    // Classify error for better handling
    const errorInfo = classifyTwilioError(error);

    // Log failed attempt to database
    const failedResult = {
      sid: null,
      status: DeliveryStatus.FAILED,
      from: selectFromNumber(market, toNumber),
      to: toNumber,
      body: messageContent,
      errorCode: error.code || errorInfo.code,
      errorMessage: error.message,
      duration,
      success: false,
    };

    logSmsToDatabase(failedResult, { leadId, agentId, trigger, market, error: errorInfo })
      .catch(err => console.error('❌ Failed to log SMS error to database:', err.message));

    // Throw enriched error
    const enrichedError = new Error(errorInfo.message);
    enrichedError.code = errorInfo.code;
    enrichedError.category = errorInfo.category;
    enrichedError.retryable = errorInfo.retryable;
    enrichedError.originalError = error;
    throw enrichedError;
  }
}

/**
 * Validate SMS input parameters
 */
function validateSmsInput(toNumber, messageContent) {
  // Validate phone number (E.164 format)
  if (!toNumber) {
    throw new Error('Recipient phone number is required');
  }

  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(toNumber)) {
    throw new Error(
      `Invalid phone number format: ${toNumber}. Must be E.164 format (e.g., +14165551234)`
    );
  }

  // Validate message content
  if (!messageContent || messageContent.trim().length === 0) {
    throw new Error('Message content is required');
  }

  // Check for required STOP language (TCPA compliance)
  const hasStopLanguage = /\b(stop|unsubscribe|cancel|end|quit)\b/i.test(messageContent);
  if (!hasStopLanguage) {
    console.warn(`⚠️  SMS missing STOP language - may violate TCPA compliance`);
  }
}

/**
 * Select appropriate from number based on market
 */
function selectFromNumber(market, toNumber) {
  // If market specified, use corresponding number
  if (market) {
    const marketLower = market.toLowerCase();
    if (marketLower.includes('ca') || marketLower.includes('canada')) {
      if (SMS_CONFIG.phoneNumbers.ca) {
        return SMS_CONFIG.phoneNumbers.ca;
      }
      console.warn(`⚠️  CA phone number not configured, using US number`);
    }
  }

  // Try to detect from toNumber country code
  if (toNumber.startsWith('+1')) {
    // North America - check area code for Canada
    const areaCode = toNumber.slice(2, 5);
    const canadianAreaCodes = [
      '204', '226', '236', '249', '250', '289', '306', '403', '416', '418',
      '431', '437', '438', '450', '506', '514', '519', '548', '581', '587',
      '600', '613', '647', '705', '709', '778', '780', '807', '819', '825',
      '867', '902', '905', '920',
    ];

    if (canadianAreaCodes.includes(areaCode) && SMS_CONFIG.phoneNumbers.ca) {
      return SMS_CONFIG.phoneNumbers.ca;
    }
  }

  // Default to US number
  if (!SMS_CONFIG.defaultPhoneNumber) {
    throw new Error('No Twilio phone number configured. Set TWILIO_PHONE_NUMBER_US or TWILIO_PHONE_NUMBER_CA');
  }

  return SMS_CONFIG.defaultPhoneNumber;
}

/**
 * Truncate message to fit SMS limits
 * GSM-7 encoding: 160 chars per segment
 * UCS-2 encoding: 70 chars per segment
 * Using conservative 160 char limit
 */
function truncateMessage(message) {
  if (message.length <= SMS_CONFIG.maxMessageLength) {
    return message;
  }

  // Truncate and add ellipsis
  const truncated = message.slice(0, SMS_CONFIG.maxMessageLength - 3) + '...';
  return truncated;
}

/**
 * Classify Twilio error for better handling
 */
function classifyTwilioError(error) {
  const code = error.code;

  // Invalid number errors
  if (code === TwilioErrorCodes.INVALID_TO_NUMBER ||
      code === TwilioErrorCodes.TO_NUMBER_NOT_SMS_CAPABLE) {
    return {
      code,
      category: 'INVALID_NUMBER',
      message: `Invalid or non-SMS-capable phone number: ${error.message}`,
      retryable: false,
    };
  }

  // Message content errors
  if (code === TwilioErrorCodes.MESSAGE_BODY_TOO_LONG) {
    return {
      code,
      category: 'CONTENT_ERROR',
      message: `Message content error: ${error.message}`,
      retryable: true, // Can retry with shorter message
    };
  }

  // Account errors
  if (code === TwilioErrorCodes.ACCOUNT_SUSPENDED ||
      code === TwilioErrorCodes.INSUFFICIENT_FUNDS) {
    return {
      code,
      category: 'ACCOUNT_ERROR',
      message: `Twilio account issue: ${error.message}`,
      retryable: false,
    };
  }

  // Rate limiting
  if (code === TwilioErrorCodes.RATE_LIMIT_EXCEEDED) {
    return {
      code,
      category: 'RATE_LIMIT',
      message: `Rate limit exceeded: ${error.message}`,
      retryable: true, // Can retry after delay
    };
  }

  // Default: unknown error
  return {
    code: code || 'UNKNOWN',
    category: 'UNKNOWN',
    message: `SMS send failed: ${error.message}`,
    retryable: true, // Conservative: allow retry
  };
}

/**
 * Log SMS to database for tracking and analytics
 */
async function logSmsToDatabase(result, metadata = {}) {
  const { leadId, agentId, trigger, market, error } = metadata;

  try {
    const logEntry = {
      twilio_sid: result.sid,
      lead_id: leadId || null,
      agent_id: agentId || null,
      to_number: result.to,
      from_number: result.from,
      message_body: result.body,
      direction: result.direction || 'outbound-api',
      status: result.status,
      trigger: trigger || null,
      market: market || null,
      num_segments: result.numSegments || 1,
      price: result.price ? parseFloat(result.price) : null,
      price_unit: result.priceUnit || null,
      error_code: result.errorCode || (error ? error.code : null),
      error_message: result.errorMessage || (error ? error.message : null),
      error_category: error ? error.category : null,
      duration_ms: result.duration,
      date_created: result.dateCreated ? new Date(result.dateCreated) : new Date(),
      date_sent: result.dateSent ? new Date(result.dateSent) : null,
      date_updated: result.dateUpdated ? new Date(result.dateUpdated) : null,
      api_version: result.apiVersion || null,
      uri: result.uri || null,
      metadata: {
        retryable: error ? error.retryable : null,
        original_error: error ? error.originalError?.message : null,
      },
    };

    const { data, error: dbError } = await supabase
      .from('sms_messages')
      .insert(logEntry)
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError.message);
      return null;
    }

    console.log(`💾 SMS logged to database (ID: ${data.id})`);
    return data;

  } catch (err) {
    console.error('❌ Failed to log SMS to database:', err.message);
    return null;
  }
}

/**
 * Update SMS status from Twilio webhook callback
 * @param {Object} statusData - Twilio status callback data
 * @returns {Promise<Object>} Updated record
 */
async function updateSmsStatus(statusData) {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = statusData;

  console.log(`🔄 Updating SMS status: ${MessageSid} → ${MessageStatus}`);

  try {
    const updateData = {
      status: MessageStatus,
      error_code: ErrorCode || null,
      error_message: ErrorMessage || null,
      date_updated: new Date(),
    };

    // Update delivery timestamp based on status
    if (MessageStatus === 'delivered') {
      updateData.date_delivered = new Date();
    } else if (MessageStatus === 'sent') {
      updateData.date_sent = new Date();
    }

    const { data, error } = await supabase
      .from('sms_messages')
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
 * Get SMS delivery status by SID
 * @param {string} sid - Twilio message SID
 * @returns {Promise<Object>} Message status from Twilio API
 */
async function getSmsStatus(sid) {
  try {
    const message = await twilioClient.messages(sid).fetch();

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
 * Fetch SMS history for a lead
 * @param {string} leadId - Lead ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results (default: 50)
 * @param {string} options.status - Filter by status
 * @returns {Promise<Array>} SMS history
 */
async function getSmsHistoryForLead(leadId, options = {}) {
  const { limit = 50, status = null } = options;

  try {
    let query = supabase
      .from('sms_messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('date_created', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
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
 * Get SMS analytics for an agent
 * @param {string} agentId - Agent ID
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @returns {Promise<Object>} SMS analytics
 */
async function getSmsAnalytics(agentId, options = {}) {
  const { startDate, endDate } = options;

  try {
    let query = supabase
      .from('sms_messages')
      .select('status, count')
      .eq('agent_id', agentId);

    if (startDate) {
      query = query.gte('date_created', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('date_created', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch SMS analytics:', error.message);
      throw error;
    }

    // Aggregate stats
    const stats = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      byStatus: {},
    };

    for (const row of data || []) {
      stats.total++;
      stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + 1;

      if (row.status === 'delivered') {
        stats.delivered++;
      } else if (row.status === 'failed' || row.status === 'undelivered') {
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

// ===== EXPORTS =====
module.exports = {
  sendSmsViatwilio,
  updateSmsStatus,
  getSmsStatus,
  getSmsHistoryForLead,
  getSmsAnalytics,
  DeliveryStatus,
  TwilioErrorCodes,
  SMS_CONFIG,
  // For testing
  validateSmsInput,
  selectFromNumber,
  truncateMessage,
  classifyTwilioError,
};
