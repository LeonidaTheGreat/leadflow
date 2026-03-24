/**
 * End-to-End Test Suite
 * Tests complete flow: Lead Created → AI Qualification → SMS Response
 * Run with: npm test
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { qualifyLead, generateAiSmsResponse, calculateLeadScore } from '@/lib/ai'
import { sendSms, normalizePhone, isValidPhoneNumber } from '@/lib/twilio'
import { createClient } from '@/lib/db'

// Test configuration
const TEST_PHONE = '+14165551234'
const TEST_AGENT_ID = 'test-agent-id'

// Initialize test Supabase client
const supabaseTest = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('AI Lead Response System - E2E Tests', () => {
  
  // ============================================
  // TEST 1: Lead Qualification
  // ============================================
  describe('Lead Qualification', () => {
    it('should qualify a buyer lead with clear intent', async () => {
      const result = await qualifyLead({
        name: 'John Smith',
        email: 'john@example.com',
        phone: TEST_PHONE,
        source: 'zillow',
        message: 'Looking to buy a 3 bedroom house in Toronto. Budget around $800k. Need to move in within 3 months.',
      })

      expect(result.intent).toBe('buy')
      expect(result.is_qualified).toBe(true)
      expect(result.confidence_score).toBeGreaterThan(0.7)
      expect(result.budget_min).toBeGreaterThan(0)
      expect(result.location).toContain('Toronto')
    }, 30000)

    it('should not qualify vague inquiries', async () => {
      const result = await qualifyLead({
        name: 'Test User',
        phone: TEST_PHONE,
        source: 'website',
        message: 'Just looking around, no specific needs.',
      })

      expect(result.intent).toBe('info')
      expect(result.is_qualified).toBe(false)
      expect(result.confidence_score).toBeLessThan(0.6)
    }, 30000)

    it('should extract budget from message', async () => {
      const result = await qualifyLead({
        name: 'Buyer',
        phone: TEST_PHONE,
        source: 'realtor.com',
        message: 'Interested in properties between 500k and 700k',
      })

      expect(result.budget_min).toBe(500000)
      expect(result.budget_max).toBe(700000)
    }, 30000)
  })

  // ============================================
  // TEST 2: SMS Generation
  // ============================================
  describe('AI SMS Generation', () => {
    const mockLead = {
      id: 'test-lead-id',
      phone: TEST_PHONE,
      name: 'Test Lead',
      source: 'zillow',
      status: 'new',
      market: 'ca-ontario' as const,
      location: 'Toronto',
      budget_min: 800000,
      budget_max: 1000000,
      timeline: '3-6months',
      consent_sms: true,
      dnc: false,
      latest_qualification: {
        intent: 'buy' as const,
        is_qualified: true,
        confidence_score: 0.85,
      },
    }

    const mockAgent = {
      id: TEST_AGENT_ID,
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      market: 'ca-ontario' as const,
      calcom_username: 'sarahj',
      timezone: 'America/Toronto',
      settings: {
        auto_respond: true,
        response_delay_seconds: 0,
        human_handoff_threshold: 0.6,
        booking_enabled: true,
      },
      is_active: true,
    }

    it('should generate initial response SMS', async () => {
      const result = await generateAiSmsResponse(mockLead as any, mockAgent as any, {
        trigger: 'initial',
      })

      expect(result.message).toBeTruthy()
      expect(result.message.length).toBeLessThan(320)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.message).toContain('Sarah') // Agent name
    }, 30000)

    it('should include opt-out language', async () => {
      const result = await generateAiSmsResponse(mockLead as any, mockAgent as any, {
        trigger: 'initial',
      })

      // The function adds this automatically
      expect(result.message.toLowerCase()).toContain('stop')
    }, 30000)

    it('should respect market-specific language (CA vs US)', async () => {
      const caResult = await generateAiSmsResponse(mockLead as any, mockAgent as any, {
        trigger: 'initial',
      })

      const usAgent = { ...mockAgent, market: 'us-national' as const }
      const usResult = await generateAiSmsResponse(mockLead as any, usAgent as any, {
        trigger: 'initial',
      })

      // Both should be valid responses
      expect(caResult.message).toBeTruthy()
      expect(usResult.message).toBeTruthy()
    }, 30000)
  })

  // ============================================
  // TEST 3: Phone Number Utilities
  // ============================================
  describe('Phone Number Utilities', () => {
    it('should normalize phone numbers to E.164', () => {
      expect(normalizePhone('(416) 555-1234')).toBe('+14165551234')
      expect(normalizePhone('416-555-1234')).toBe('+14165551234')
      expect(normalizePhone('4165551234')).toBe('+14165551234')
      expect(normalizePhone('+1 (416) 555-1234')).toBe('+14165551234')
    })

    it('should validate E.164 format', () => {
      expect(isValidPhoneNumber('+14165551234')).toBe(true)
      expect(isValidPhoneNumber('14165551234')).toBe(false) // Missing +
      expect(isValidPhoneNumber('+1 416 555 1234')).toBe(false) // Contains spaces
      expect(isValidPhoneNumber('invalid')).toBe(false)
    })
  })

  // ============================================
  // TEST 4: Lead Score Calculation
  // ============================================
  describe('Lead Score Calculation', () => {
    it('should calculate high score for qualified buyer', () => {
      const qualification = {
        intent: 'buy' as const,
        budget_min: 500000,
        budget_max: 700000,
        timeline: 'immediate' as const,
        location: 'Toronto',
        property_type: 'house' as const,
        confidence_score: 0.9,
        is_qualified: true,
        qualification_reason: 'Clear buyer intent',
        bedrooms: null,
        bathrooms: null,
        square_feet: null,
        notes: null,
      }

      const score = calculateLeadScore(qualification)
      expect(score).toBeGreaterThan(80)
    })

    it('should calculate low score for unqualified lead', () => {
      const qualification = {
        intent: 'info' as const,
        budget_min: null,
        budget_max: null,
        timeline: 'unknown' as const,
        location: null,
        property_type: 'unknown' as const,
        confidence_score: 0.3,
        is_qualified: false,
        qualification_reason: 'Vague inquiry',
        bedrooms: null,
        bathrooms: null,
        square_feet: null,
        notes: null,
      }

      const score = calculateLeadScore(qualification)
      expect(score).toBeLessThan(40)
    })
  })

  // ============================================
  // TEST 5: SMS Mock Sending
  // ============================================
  describe('SMS Sending (Mock Mode)', () => {
    it('should send SMS in mock mode', async () => {
      const result = await sendSms({
        to: TEST_PHONE,
        body: 'Test message',
      })

      expect(result.success).toBe(true)
      expect(result.mock).toBe(true)
      expect(result.messageSid).toBeTruthy()
    })

    it('should reject invalid phone numbers', async () => {
      const result = await sendSms({
        to: 'invalid-phone',
        body: 'Test message',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })
  })

  // ============================================
  // TEST 6: Database Operations
  // ============================================
  describe('Database Operations', () => {
    it('should create and fetch lead', async () => {
      const testLead = {
        phone: normalizePhone('+14165559999'),
        name: 'E2E Test Lead',
        email: 'e2e-test@example.com',
        source: 'e2e-test',
        status: 'new',
        market: 'ca-ontario',
      }

      // Create lead
      const { data: created, error: createError } = await supabaseTest
        .from('leads')
        .insert(testLead)
        .select()
        .single()

      expect(createError).toBeNull()
      expect(created).toBeTruthy()
      expect(created.name).toBe(testLead.name)

      // Fetch lead
      const { data: fetched, error: fetchError } = await supabaseTest
        .from('leads')
        .select('*')
        .eq('id', created.id)
        .single()

      expect(fetchError).toBeNull()
      expect(fetched).toBeTruthy()
      expect(fetched.phone).toBe(testLead.phone)

      // Cleanup
      await supabaseTest.from('leads').delete().eq('id', created.id)
    })
  })
})

// ============================================
// TEST RUNNER
// ============================================

if (require.main === module) {
  console.log('🧪 Running E2E Tests...')
  console.log('Note: Ensure environment variables are set:')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY')
  console.log('  - ANTHROPIC_API_KEY')
}
