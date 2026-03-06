import twilio from 'twilio'
import type { TwilioMessage, Message, Lead, Agent } from '@/lib/types'

// ============================================
// TWILIO SMS CLIENT
// ============================================

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const phoneNumberUS = process.env.TWILIO_PHONE_NUMBER_US
const phoneNumberCA = process.env.TWILIO_PHONE_NUMBER_CA
const isMockMode = process.env.TWILIO_MOCK_MODE === 'true' || !accountSid

// Initialize Twilio client (or mock)
let twilioClient: twilio.Twilio | null = null

function getTwilioClient(): twilio.Twilio | null {
  if (twilioClient) return twilioClient
  
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  
  if (sid && token && sid.startsWith('AC')) {
    twilioClient = twilio(sid, token)
    return twilioClient
  }
  
  return null
}

// ============================================
// SEND SMS
// ============================================

export interface SendSmsOptions {
  to: string
  body: string
  from?: string
  mediaUrl?: string
  statusCallback?: string
}

export interface SendSmsResult {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
  errorCode?: string
  mock?: boolean
  price?: string
  priceUnit?: string
  numSegments?: string
}

/**
 * Send SMS via Twilio (or mock if in test mode)
 * Includes retry logic with exponential backoff
 */
export async function sendSms(options: SendSmsOptions): Promise<SendSmsResult> {
  const { to, body, from, mediaUrl, statusCallback } = options

  // Validate phone number format
  if (!isValidPhoneNumber(to)) {
    return {
      success: false,
      error: `Invalid phone number format: ${to}`,
      errorCode: '21211', // Twilio error code for invalid number
    }
  }

  // Determine from number based on destination
  const fromNumber = from || getFromNumber(to)

  // Get Twilio client (lazy initialization)
  const client = getTwilioClient()
  
  // Mock mode for development/testing
  if (isMockMode || !client) {
    console.log('📤 [MOCK SMS]', {
      to,
      from: fromNumber,
      body: body.substring(0, 50) + (body.length > 50 ? '...' : ''),
    })

    return {
      success: true,
      messageSid: `MOCK_${Date.now()}`,
      status: 'queued',
      mock: true,
    }
  }

  // Retry logic with exponential backoff
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const messageParams: any = {
        body,
        to,
        from: fromNumber,
      }

      if (mediaUrl) {
        messageParams.mediaUrl = [mediaUrl]
      }

      if (statusCallback) {
        messageParams.statusCallback = statusCallback
      }

      const message = await client.messages.create(messageParams)

      console.log('📤 SMS sent:', {
        sid: message.sid,
        to,
        status: message.status,
        price: message.price,
        segments: message.numSegments,
        attempt: attempt + 1,
      })

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        price: message.price,
        priceUnit: message.priceUnit,
        numSegments: message.numSegments,
      }
    } catch (error: any) {
      const errorCode = error.code || error.status;
      const isRetryable = isRetryableError(errorCode);

      console.error(`❌ Twilio send error (attempt ${attempt + 1}/${maxRetries}):`, {
        errorCode,
        message: error.message,
        retryable: isRetryable,
      })

      // If not retryable or last attempt, return error
      if (!isRetryable || attempt === maxRetries - 1) {
        return {
          success: false,
          error: error.message,
          errorCode: String(errorCode),
        }
      }

      // Wait before retry with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should not reach here, but return error if it does
  return {
    success: false,
    error: 'Failed to send SMS after retries',
    errorCode: '31000',
  }
}

/**
 * Check if error is retryable (network/timeout) or permanent (validation/auth)
 */
function isRetryableError(errorCode?: string | number): boolean {
  if (!errorCode) return true; // Unknown errors are retryable

  const code = String(errorCode);

  // Permanent errors (not retryable)
  const permanentErrors = [
    '21201', // Invalid credentials
    '21202', // Invalid account SID
    '21203', // Authentication failed
    '21211', // Invalid to number
    '21612', // Cannot route message
    '21614', // Invalid from number
    '21615', // Missing to number
    '20003', // Invalid account
  ];

  if (permanentErrors.includes(code)) return false;

  // Rate limit (may be retryable after backoff)
  if (code === '22005') return true;

  // Carrier/network errors are retryable
  if (code === '32603' || code === '31000') return true;

  // Default to retryable for unknown errors
  return true;
}

/**
 * Send AI-generated SMS response to a lead
 */
export async function sendAiSmsResponse(
  lead: Lead,
  agent: Agent,
  messageBody: string,
  metadata?: Record<string, any>
): Promise<SendSmsResult> {
  // Add booking link if enabled and not present
  let body = messageBody
  if (agent.settings.booking_enabled && agent.calcom_username && !body.includes('http')) {
    const bookingLink = generateCalComLink(agent.calcom_username, lead)
    body = body.replace('[link]', bookingLink)
    // If no placeholder was replaced, append link if space permits
    if (body === messageBody && body.length + bookingLink.length < 150) {
      body += ` Book: ${bookingLink}`
    }
  }

  // Ensure compliance footer
  if (!body.includes('STOP')) {
    const footer = ' Reply STOP to opt out.'
    if (body.length + footer.length <= 320) {
      body += footer
    }
  }

  // Send the SMS
  const result = await sendSms({
    to: lead.phone,
    body,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`,
  })

  return result
}

// ============================================
// MESSAGE STATUS HANDLING
// ============================================

export interface TwilioStatusCallback {
  MessageSid: string
  MessageStatus: string
  ErrorCode?: string
  ErrorMessage?: string
  From: string
  To: string
  Price?: string
  PriceUnit?: string
  NumSegments?: string
}

/**
 * Handle Twilio status callback webhook
 */
export function handleStatusCallback(body: TwilioStatusCallback): {
  messageSid: string
  status: string
  errorCode?: string
  errorMessage?: string
  price?: string
  priceUnit?: string
  numSegments?: string
} {
  const { MessageSid, MessageStatus, ErrorCode, ErrorMessage, From, To, Price, PriceUnit, NumSegments } = body

  console.log('📊 Twilio status:', {
    sid: MessageSid,
    status: MessageStatus,
    from: From,
    to: To,
    price: Price,
    segments: NumSegments,
  })

  return {
    messageSid: MessageSid,
    status: MessageStatus,
    errorCode: ErrorCode,
    errorMessage: ErrorMessage,
    price: Price,
    priceUnit: PriceUnit,
    numSegments: NumSegments,
  }
}

// ============================================
// INBOUND MESSAGE HANDLING
// ============================================

export interface InboundMessage {
  MessageSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
  MediaUrl0?: string
}

/**
 * Parse inbound SMS from Twilio webhook
 */
export function parseInboundMessage(body: Record<string, any>): InboundMessage {
  return {
    MessageSid: body.MessageSid,
    From: body.From,
    To: body.To,
    Body: body.Body || '',
    NumMedia: body.NumMedia || '0',
    MediaUrl0: body.MediaUrl0,
  }
}

/**
 * Check if message is an opt-out request
 */
export function isOptOut(message: string): boolean {
  const optOutKeywords = [
    'stop', 'unsubscribe', 'cancel', 'end', 'quit', 
    'stop all', 'stopall', 'opt out', 'opt-out'
  ]
  
  const normalized = message.toLowerCase().trim()
  return optOutKeywords.includes(normalized)
}

/**
 * Check if message is a positive response
 */
export function isPositiveResponse(message: string): boolean {
  const positiveKeywords = [
    'yes', 'yeah', 'sure', 'ok', 'okay', 'interested', 
    'tell me more', 'send info', 'book', 'schedule', 'call me'
  ]
  
  const normalized = message.toLowerCase().trim()
  return positiveKeywords.some(kw => normalized.includes(kw))
}

// ============================================
// PHONE NUMBER UTILITIES
// ============================================

/**
 * Validate E.164 phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ''

  // Remove all non-numeric except +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure + prefix
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('1')) {
      normalized = `+${normalized}`
    } else if (normalized.length === 10) {
      normalized = `+1${normalized}`
    } else {
      normalized = `+${normalized}`
    }
  }

  return normalized
}

/**
 * Get appropriate from number based on destination
 */
function getFromNumber(toNumber: string): string {
  // Canadian numbers start with +1 and have Canadian area codes
  const canadianAreaCodes = [
    '204', '226', '236', '249', '250', '289', '306', '403', '416', '418',
    '431', '437', '438', '450', '506', '514', '519', '548', '581', '587',
    '600', '613', '647', '705', '709', '778', '780', '807', '819', '825',
    '867', '902', '905'
  ]

  const areaCode = toNumber.slice(2, 5)
  const isCanadian = canadianAreaCodes.includes(areaCode)

  return isCanadian ? phoneNumberCA! : phoneNumberUS!
}

/**
 * Detect market from phone number
 */
export function detectMarketFromPhone(phone: string): 'ca-ontario' | 'us-national' {
  const canadianAreaCodes = [
    '416', '647', '437', '905', '289', '365', '742', '519', '226', '548',
    '613', '343', '753', '705', '249', '683', '807', '437'
  ]

  const normalized = normalizePhone(phone)
  const areaCode = normalized.slice(2, 5)

  return canadianAreaCodes.includes(areaCode) ? 'ca-ontario' : 'us-national'
}

// ============================================
// CAL.COM LINK GENERATION
// ============================================

function generateCalComLink(username: string, lead: Lead): string {
  const baseUrl = process.env.CALCOM_BASE_URL || 'https://cal.com'
  const params = new URLSearchParams()
  
  if (lead.name) params.set('name', lead.name)
  if (lead.email) params.set('email', lead.email)
  if (lead.phone) params.set('phone', lead.phone)
  
  const queryString = params.toString()
  return `${baseUrl}/${username}${queryString ? '?' + queryString : ''}`
}

// ============================================
// SMS SEGMENT CALCULATION
// ============================================

/**
 * Calculate how many SMS segments a message will use
 * GSM-7: 160 chars per segment
 * UCS-2: 70 chars per segment
 */
export function calculateSegments(message: string): { segments: number; encoding: 'gsm-7' | 'ucs-2' } {
  // Check if message contains non-GSM characters
  const gsmChars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,-.\/0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà]*$/
  
  const isGsm = gsmChars.test(message)
  const encoding = isGsm ? 'gsm-7' : 'ucs-2'
  const charsPerSegment = isGsm ? 160 : 70
  
  const segments = Math.ceil(message.length / charsPerSegment)
  
  return { segments, encoding }
}

// ============================================
// TEMPLATE PROCESSING
// ============================================

/**
 * Process SMS template with variables
 */
export function processTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replace(new RegExp(placeholder, 'g'), String(value ?? ''))
  }
  
  // Remove any remaining placeholders
  result = result.replace(/\{\{[^}]+\}\}/g, '')
  
  return result
}
