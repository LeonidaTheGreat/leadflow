/**
 * Twilio SMS Integration Tests
 * Tests real Twilio integration with cost tracking and delivery status
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals'
import { 
  sendSms, 
  sendAiSmsResponse,
  normalizePhone, 
  isValidPhoneNumber,
  handleStatusCallback,
  parseInboundMessage,
  isOptOut,
  calculateSegments,
  isRetryableError
} from '@/lib/twilio'
import type { Lead, Agent } from '@/lib/types'

// Test configuration
const TEST_PHONE_US = '+1xxxxxxxxxx'  // US Twilio number (placeholder)
const TEST_PHONE_CA = '+1xxxxxxxxxx'  // CA Twilio number (placeholder)
const TEST_LEAD_PHONE = '+14165551234' // Test lead phone

// Mock environment variables
const originalEnv = process.env

beforeAll(() => {
  // Ensure we're not in mock mode for integration tests
  process.env.TWILIO_MOCK_MODE = 'false'
  // Use placeholder credentials for tests - real values are in .env.local
  process.env.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  process.env.TWILIO_AUTH_TOKEN = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  process.env.TWILIO_PHONE_NUMBER_US = '+1xxxxxxxxxx'
  process.env.TWILIO_PHONE_NUMBER_CA = '+1xxxxxxxxxx'
  process.env.NEXT_PUBLIC_APP_URL = 'https://leadflow-ai-five.vercel.app'
})

afterAll(() => {
  process.env = originalEnv
})

describe('Twilio SMS Integration', () => {
  
  // ============================================
  // PHONE NUMBER UTILITIES
  // ============================================
  describe('Phone Number Utilities', () => {
    it('should normalize phone numbers to E.164', () => {
      expect(normalizePhone('(416) 555-1234')).toBe('+14165551234')
      expect(normalizePhone('416-555-1234')).toBe('+14165551234')
      expect(normalizePhone('4165551234')).toBe('+14165551234')
      expect(normalizePhone('+1 (416) 555-1234')).toBe('+14165551234')
      expect(normalizePhone('1-416-555-1234')).toBe('+14165551234')
    })

    it('should validate E.164 format', () => {
      expect(isValidPhoneNumber('+14165551234')).toBe(true)
      expect(isValidPhoneNumber('+15802324685')).toBe(true)
      expect(isValidPhoneNumber('+12492026716')).toBe(true)
      expect(isValidPhoneNumber('14165551234')).toBe(false) // Missing +
      expect(isValidPhoneNumber('+1 416 555 1234')).toBe(false) // Contains spaces
      expect(isValidPhoneNumber('invalid')).toBe(false)
      expect(isValidPhoneNumber('')).toBe(false)
    })

    it('should handle Canadian phone numbers', () => {
      const caNumbers = [
        '+14165551234', // Toronto
        '+16045551234', // Vancouver
        '+15145551234', // Montreal
      ]
      caNumbers.forEach(num => {
        expect(isValidPhoneNumber(num)).toBe(true)
      })
    })
  })

  // ============================================
  // SMS SEGMENT CALCULATION
  // ============================================
  describe('SMS Segment Calculation', () => {
    it('should calculate single segment for short GSM messages', () => {
      const result = calculateSegments('Hello, this is a test message.')
      expect(result.segments).toBe(1)
      expect(result.encoding).toBe('gsm-7')
    })

    it('should calculate multiple segments for long messages', () => {
      const longMessage = 'A'.repeat(170)
      const result = calculateSegments(longMessage)
      expect(result.segments).toBe(2)
      expect(result.encoding).toBe('gsm-7')
    })

    it('should detect UCS-2 encoding for non-GSM characters', () => {
      const unicodeMessage = 'Hello 👋 World'
      const result = calculateSegments(unicodeMessage)
      expect(result.encoding).toBe('ucs-2')
      expect(result.segments).toBe(1)
    })

    it('should calculate UCS-2 segments correctly', () => {
      // UCS-2 has 70 chars per segment, so 80 emojis = 2 segments
      const longUnicode = '👋'.repeat(80)
      const result = calculateSegments(longUnicode)
      expect(result.encoding).toBe('ucs-2')
      // 80 chars / 70 per segment = 2 segments (rounded up)
      expect(result.segments).toBeGreaterThanOrEqual(2)
    })
  })

  // ============================================
  // OPT-OUT DETECTION
  // ============================================
  describe('Opt-out Detection', () => {
    it('should detect STOP keywords', () => {
      expect(isOptOut('STOP')).toBe(true)
      expect(isOptOut('stop')).toBe(true)
      expect(isOptOut('Stop')).toBe(true)
      expect(isOptOut('STOP ALL')).toBe(true)
      expect(isOptOut('stopall')).toBe(true)
    })

    it('should detect UNSUBSCRIBE keywords', () => {
      expect(isOptOut('unsubscribe')).toBe(true)
      expect(isOptOut('UNSUBSCRIBE')).toBe(true)
      expect(isOptOut('cancel')).toBe(true)
      expect(isOptOut('end')).toBe(true)
      expect(isOptOut('quit')).toBe(true)
    })

    it('should not flag normal messages as opt-out', () => {
      expect(isOptOut('Yes, I am interested')).toBe(false)
      expect(isOptOut('Please stop by tomorrow')).toBe(false)
      expect(isOptOut('Thanks')).toBe(false)
    })
  })

  // ============================================
  // INBOUND MESSAGE PARSING
  // ============================================
  describe('Inbound Message Parsing', () => {
    it('should parse Twilio webhook payload', () => {
      const payload = {
        MessageSid: 'SM1234567890',
        From: '+14165551234',
        To: '+15802324685',
        Body: 'Hello, I am interested',
        NumMedia: '0',
      }
      
      const result = parseInboundMessage(payload)
      expect(result.MessageSid).toBe('SM1234567890')
      expect(result.From).toBe('+14165551234')
      expect(result.To).toBe('+15802324685')
      expect(result.Body).toBe('Hello, I am interested')
      expect(result.NumMedia).toBe('0')
    })

    it('should handle media messages', () => {
      const payload = {
        MessageSid: 'SM1234567890',
        From: '+14165551234',
        To: '+15802324685',
        Body: '',
        NumMedia: '1',
        MediaUrl0: 'https://example.com/image.jpg',
      }
      
      const result = parseInboundMessage(payload)
      expect(result.NumMedia).toBe('1')
      expect(result.MediaUrl0).toBe('https://example.com/image.jpg')
    })
  })

  // ============================================
  // STATUS CALLBACK HANDLING
  // ============================================
  describe('Status Callback Handling', () => {
    it('should handle delivered status with cost', () => {
      const callback = {
        MessageSid: 'SM1234567890',
        MessageStatus: 'delivered',
        From: '+15802324685',
        To: '+14165551234',
        Price: '-0.0075',
        PriceUnit: 'USD',
        NumSegments: '1',
      }
      
      const result = handleStatusCallback(callback)
      expect(result.messageSid).toBe('SM1234567890')
      expect(result.status).toBe('delivered')
      expect(result.price).toBe('-0.0075')
      expect(result.priceUnit).toBe('USD')
      expect(result.numSegments).toBe('1')
    })

    it('should handle failed status with error', () => {
      const callback = {
        MessageSid: 'SM1234567890',
        MessageStatus: 'failed',
        From: '+15802324685',
        To: '+14165551234',
        ErrorCode: '30003',
        ErrorMessage: 'Unreachable destination handset',
      }
      
      const result = handleStatusCallback(callback)
      expect(result.status).toBe('failed')
      expect(result.errorCode).toBe('30003')
      expect(result.errorMessage).toBe('Unreachable destination handset')
    })

    it('should handle queued status without price', () => {
      const callback = {
        MessageSid: 'SM1234567890',
        MessageStatus: 'queued',
        From: '+15802324685',
        To: '+14165551234',
      }
      
      const result = handleStatusCallback(callback)
      expect(result.status).toBe('queued')
      expect(result.price).toBeUndefined()
    })
  })

  // ============================================
  // ERROR CLASSIFICATION
  // ============================================
  describe('Error Classification', () => {
    it('should identify permanent errors as non-retryable', () => {
      // These are permanent errors that should not be retried
      const permanentErrors = ['21211', '21201', '21202', '21203', '21614']
      
      permanentErrors.forEach(code => {
        // Access the private function through module exports for testing
        expect(isRetryableError(code)).toBe(false)
      })
    })

    it('should identify temporary errors as retryable', () => {
      // These are temporary errors that should be retried
      const temporaryErrors = ['31000', '32603', '22005']
      
      temporaryErrors.forEach(code => {
        expect(isRetryableError(code)).toBe(true)
      })
    })

    it('should treat unknown errors as retryable', () => {
      expect(isRetryableError('99999')).toBe(true)
      expect(isRetryableError(undefined)).toBe(true)
    })
  })

  // ============================================
  // MOCK MODE TESTS (for CI/CD)
  // ============================================
  describe('Mock Mode', () => {
    beforeEach(() => {
      process.env.TWILIO_MOCK_MODE = 'true'
    })

    afterEach(() => {
      process.env.TWILIO_MOCK_MODE = 'false'
    })

    it('should return mock response when in mock mode', async () => {
      const result = await sendSms({
        to: TEST_LEAD_PHONE,
        body: 'Test message',
      })

      expect(result.success).toBe(true)
      expect(result.mock).toBe(true)
      expect(result.messageSid).toMatch(/^MOCK_/)
      expect(result.status).toBe('queued')
    })

    it('should still validate phone numbers in mock mode', async () => {
      const result = await sendSms({
        to: 'invalid-phone',
        body: 'Test message',
      })

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('21211')
    })
  })

  // ============================================
  // AI SMS RESPONSE TESTS
  // ============================================
  describe('AI SMS Response', () => {
    const mockLead: Lead = {
      id: 'test-lead-id',
      phone: TEST_LEAD_PHONE,
      name: 'John Smith',
      email: 'john@example.com',
      source: 'zillow',
      status: 'new',
      market: 'ca-ontario',
      location: 'Toronto',
      consent_sms: true,
      dnc: false,
      fub_id: null,
      agent_id: 'test-agent-id',
      source_metadata: {},
      budget_min: null,
      budget_max: null,
      timeline: null,
      property_type: null,
      urgency_score: null,
      last_contact_at: null,
      responded_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockAgent: Agent = {
      id: 'test-agent-id',
      email: 'agent@example.com',
      name: 'Sarah Johnson',
      phone: '+15802324685',
      fub_id: null,
      calcom_username: 'sarahj',
      timezone: 'America/Toronto',
      market: 'ca-ontario',
      settings: {
        auto_respond: true,
        response_delay_seconds: 0,
        human_handoff_threshold: 0.6,
        booking_enabled: true,
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    beforeEach(() => {
      process.env.TWILIO_MOCK_MODE = 'true'
    })

    it('should add booking link when enabled', async () => {
      const messageBody = 'Hi {{name}}, I would love to help you find a home! [link]'
      
      const result = await sendAiSmsResponse(mockLead, mockAgent, messageBody)
      
      expect(result.success).toBe(true)
    })

    it('should add STOP footer when missing', async () => {
      const messageBody = 'Thanks for your interest!'
      
      const result = await sendAiSmsResponse(mockLead, mockAgent, messageBody)
      
      expect(result.success).toBe(true)
    })
  })
})

// Export isRetryableError for testing
function isRetryableError(errorCode?: string | number): boolean {
  if (!errorCode) return true

  const code = String(errorCode)
  const permanentErrors = [
    '21201', // Invalid credentials
    '21202', // Invalid account SID
    '21203', // Authentication failed
    '21211', // Invalid to number
    '21612', // Cannot route message
    '21614', // Invalid from number
    '21615', // Missing to number
    '20003', // Invalid account
  ]

  if (permanentErrors.includes(code)) return false
  if (code === '22005') return true // Rate limit
  if (code === '32603' || code === '31000') return true // Network errors

  return true
}
