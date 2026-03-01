#!/usr/bin/env node

/**
 * Cal.com Webhook Integration Test
 * Tests UC-6 acceptance criteria
 */

const crypto = require('crypto')

// Test configuration
const WEBHOOK_URL = 'http://localhost:3000/api/webhook/calcom'
const WEBHOOK_SECRET = 'test-secret-123'

// Mock Cal.com booking event
const mockBookingCreatedEvent = {
  triggerEvent: 'BOOKING_CREATED',
  payload: {
    type: 'discovery_call',
    title: 'Discovery Call with Test Lead',
    description: 'Discussing LeadFlow AI implementation',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
    attendees: [
      {
        email: 'test@example.com',
        name: 'Test Lead',
        timeZone: 'America/New_York',
        phoneNumber: '+15555551234'
      }
    ],
    organizer: {
      email: 'agent@leadflow.ai',
      name: 'Sarah Chen',
      timeZone: 'America/Los_Angeles'
    },
    uid: 'test-booking-' + Date.now(),
    bookingId: Math.floor(Math.random() * 1000000),
    eventTypeId: 12345,
    status: 'ACCEPTED',
    metadata: {
      videoCallUrl: 'https://meet.google.com/abc-defg-hij'
    }
  }
}

// Helper: Generate HMAC signature
function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
}

// Test functions
const tests = [
  {
    name: 'Webhook signature verification',
    test: async () => {
      const { verifyWebhookSignature } = require('../lib/calcom')
      const payload = JSON.stringify(mockBookingCreatedEvent)
      const validSignature = generateSignature(mockBookingCreatedEvent, WEBHOOK_SECRET)
      const invalidSignature = 'invalid-signature-12345'
      
      const validResult = verifyWebhookSignature(payload, validSignature, WEBHOOK_SECRET)
      const invalidResult = verifyWebhookSignature(payload, invalidSignature, WEBHOOK_SECRET)
      
      if (!validResult) throw new Error('Valid signature was rejected')
      if (invalidResult) throw new Error('Invalid signature was accepted')
      
      return { success: true }
    }
  },
  {
    name: 'Webhook payload parsing',
    test: async () => {
      const { parseWebhookPayload } = require('../lib/calcom')
      
      const parsed = parseWebhookPayload(mockBookingCreatedEvent)
      
      if (!parsed) throw new Error('Failed to parse valid payload')
      if (parsed.triggerEvent !== 'BOOKING_CREATED') {
        throw new Error('Incorrect event type parsed')
      }
      if (!parsed.payload.bookingId) {
        throw new Error('Missing booking ID in parsed payload')
      }
      
      return { success: true, parsed }
    }
  },
  {
    name: 'Booking webhook handler',
    test: async () => {
      const { handleBookingWebhook } = require('../lib/calcom')
      
      const result = await handleBookingWebhook(mockBookingCreatedEvent)
      
      if (!result.success) throw new Error('Handler failed for valid event')
      if (result.action !== 'booking_created') {
        throw new Error(`Expected action 'booking_created', got '${result.action}'`)
      }
      if (!result.bookingData) throw new Error('No booking data returned')
      if (!result.bookingData.start_time) throw new Error('Missing start_time')
      
      return { success: true, result }
    }
  },
  {
    name: 'Booking link generation',
    test: async () => {
      const { generateBookingLink } = require('../lib/calcom')
      
      const link = generateBookingLink({
        agentUsername: 'sarah-chen',
        leadName: 'John Doe',
        leadEmail: 'john@example.com',
        leadPhone: '+15555551234'
      })
      
      if (!link.includes('sarah-chen')) throw new Error('Missing agent username')
      if (!link.includes('name=John')) throw new Error('Missing lead name')
      if (!link.includes('utm_source=ai-lead-response')) {
        throw new Error('Missing UTM tracking')
      }
      
      return { success: true, link }
    }
  },
  {
    name: 'SMS templates exist',
    test: async () => {
      const { generateConfirmationMessage } = require('../lib/calcom')
      
      const booking = {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      }
      
      const message = generateConfirmationMessage(booking, 'Sarah Chen')
      
      if (!message.includes('Sarah Chen')) throw new Error('Missing agent name')
      if (!message.includes('STOP')) throw new Error('Missing compliance footer')
      
      return { success: true, message }
    }
  },
  {
    name: 'Database schema check',
    test: async () => {
      const fs = require('fs')
      const path = require('path')
      
      const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql')
      
      if (!fs.existsSync(migrationPath)) {
        throw new Error('Migration file not found')
      }
      
      const migration = fs.readFileSync(migrationPath, 'utf-8')
      
      const requiredFields = [
        'calcom_booking_id',
        'calcom_event_type_id',
        'start_time',
        'end_time',
        'meeting_link',
        'status'
      ]
      
      for (const field of requiredFields) {
        if (!migration.includes(field)) {
          throw new Error(`Missing required field: ${field}`)
        }
      }
      
      return { success: true, fieldsChecked: requiredFields.length }
    }
  }
]

// Run all tests
async function runTests() {
  console.log('\n' + '═'.repeat(60))
  console.log('🧪 Cal.com Webhook Integration Test Suite')
  console.log('═'.repeat(60))
  console.log(`\nRunning ${tests.length} tests...\n`)
  
  const results = []
  let passed = 0
  let failed = 0
  
  for (const { name, test } of tests) {
    try {
      process.stdout.write(`  ${name}... `)
      const result = await test()
      console.log('✅ PASS')
      results.push({ name, success: true, ...result })
      passed++
    } catch (error) {
      console.log(`❌ FAIL: ${error.message}`)
      results.push({ name, success: false, error: error.message })
      failed++
    }
  }
  
  // Summary
  console.log('\n' + '─'.repeat(60))
  console.log(`\n📊 Test Results: ${passed}/${tests.length} passed`)
  
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed:\n`)
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  • ${r.name}`)
        console.log(`    ${r.error}`)
      })
  } else {
    console.log('\n✅ All tests passed!')
  }
  
  console.log('\n' + '═'.repeat(60))
  
  // Save results
  const fs = require('fs')
  fs.writeFileSync(
    'calcom-test-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results, passed, failed }, null, 2)
  )
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
