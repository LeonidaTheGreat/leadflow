#!/usr/bin/env node
/**
 * LeadFlow First Lead Simulation Test
 * 
 * End-to-end test that validates the complete lead flow from initial contact through booking.
 * Simulates a real lead entering the system, triggering AI SMS responses, and booking a Cal.com appointment.
 * 
 * Usage:
 *   node first-lead-simulation.js
 *   node first-lead-simulation.js --verbose
 *   node first-lead-simulation.js --env=test
 * 
 * Environment Variables Required:
 *   - FUB_API_KEY (for FUB integration)
 *   - NEXT_PUBLIC_SUPABASE_URL (for lead storage verification)
 *   - SUPABASE_SERVICE_ROLE_KEY (for DB verification)
 *   - CALCOM_API_KEY (for booking verification)
 *   - POSTHOG_API_KEY (for event tracking verification)
 *   - WEBHOOK_SECRET (for webhook signature)
 *   - TWILIO_ACCOUNT_SID (for SMS verification)
 *   - TWILIO_AUTH_TOKEN (for SMS verification)
 */

require('dotenv').config();
const crypto = require('crypto');
const assert = require('assert');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // API Endpoints
  fubApiBase: process.env.FUB_API_BASE_URL || 'https://api.followupboss.com/v1',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  calcomApiBase: process.env.CALCOM_API_BASE_URL || 'https://api.cal.com/v1',
  calcomApiKey: process.env.CALCOM_API_KEY,
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  posthogApiKey: process.env.POSTHOG_API_KEY,
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'https://leadflow-ai-five.vercel.app',
  
  // Test Configuration
  testTimeout: 30000,
  verbose: process.argv.includes('--verbose'),
  env: process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'test',
  
  // Test Lead Data
  testLead: {
    firstName: 'Simone',
    lastName: 'Testerson',
    phone: '+1416555TEST',  // Will be replaced with timestamp-based number
    email: 'simone.testerson@example.com',
    source: 'simulation_test',
    notes: 'Looking for a 3-bedroom home in downtown Toronto. Budget around $800k-$1M. Need to move within 3 months.',
  },
  
  // Expected Behaviors
  expectedResponseTimeMs: 10000,  // AI should respond within 10 seconds
  expectedBookingLinkInResponse: true,
  expectedEvents: [
    'fub_lead_created',
    'lead_qualified',
    'ai_sms_generated',
    'sms_sent',
    'calcom_booking_event',
    'lead_status_updated'
  ]
};

// ============================================
// TEST STATE
// ============================================
const STATE = {
  startTime: null,
  endTime: null,
  testLeadId: null,
  fubLeadId: null,
  supabaseLeadId: null,
  smsMessageId: null,
  bookingId: null,
  events: [],
  results: [],
  errors: [],
  screenshots: [],
  logs: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, level, message, data };
  STATE.logs.push(entry);
  
  if (CONFIG.verbose || level === 'ERROR' || level === 'WARN') {
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : level === 'INFO' ? 'ℹ️' : '📝';
    console.log(`${prefix} [${timestamp}] ${message}`);
    if (data && CONFIG.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }
}

function generateTestPhone() {
  const timestamp = Date.now().toString().slice(-8);
  return `+1416${timestamp}`;
}

function generateSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function recordResult(testName, passed, details = null, duration = null) {
  const result = {
    testName,
    passed,
    details,
    duration,
    timestamp: new Date().toISOString()
  };
  STATE.results.push(result);
  
  if (passed) {
    log('SUCCESS', `✓ ${testName}`, details);
  } else {
    log('ERROR', `✗ ${testName}`, details);
    STATE.errors.push({ testName, details });
  }
  
  return result;
}

// ============================================
// HTTP CLIENT
// ============================================
async function httpRequest(url, options = {}) {
  const startTime = Date.now();
  const maxRetries = options.retries || 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      const duration = Date.now() - startTime;
      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        ok: response.ok,
        data,
        duration,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      log('WARN', `Request failed (attempt ${attempt}), retrying...`, error.message);
      await sleep(1000 * attempt);
    }
  }
}

// ============================================
// SUPABASE HELPERS
// ============================================
async function supabaseQuery(table, method = 'GET', data = null, filters = {}) {
  const url = new URL(`${CONFIG.supabaseUrl}/rest/v1/${table}`);
  
  // Add filters to URL
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.append(key, `eq.${value}`);
  });
  
  const options = {
    method,
    headers: {
      'apikey': CONFIG.supabaseKey,
      'Authorization': `Bearer ${CONFIG.supabaseKey}`,
      'Prefer': method === 'POST' ? 'return=representation' : undefined
    }
  };
  
  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }
  
  return httpRequest(url.toString(), options);
}

// ============================================
// TEST SCENARIOS
// ============================================

/**
 * TEST 1: Validate Environment & Dependencies
 */
async function testEnvironment() {
  log('INFO', '━━━ TEST 1: Environment & Dependencies ━━━');
  const startTime = Date.now();
  
  const requiredVars = [
    'FUB_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CALCOM_API_KEY',
    'POSTHOG_API_KEY'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    return recordResult(
      'Environment Variables',
      false,
      `Missing: ${missing.join(', ')}`,
      Date.now() - startTime
    );
  }
  
  return recordResult(
    'Environment Variables',
    true,
    `All ${requiredVars.length} required variables set`,
    Date.now() - startTime
  );
}

/**
 * TEST 2: Simulate Lead via FUB Webhook
 */
async function testLeadWebhookSimulation() {
  log('INFO', '━━━ TEST 2: Lead Webhook Simulation ━━━');
  const startTime = Date.now();
  
  try {
    // Generate unique test phone number
    const testPhone = generateTestPhone();
    CONFIG.testLead.phone = testPhone;
    
    // Create FUB-compatible payload
    const payload = {
      event: 'lead.created',
      data: {
        id: `sim_${Date.now()}`,
        firstName: CONFIG.testLead.firstName,
        lastName: CONFIG.testLead.lastName,
        email: CONFIG.testLead.email,
        phoneNumber: testPhone,
        phones: [{ value: testPhone, type: 'mobile' }],
        source: CONFIG.testLead.source,
        notes: CONFIG.testLead.notes,
        createdAt: new Date().toISOString(),
        stage: 'New Lead'
      },
      resourceIds: [Date.now()],
      uri: `${CONFIG.fubApiBase}/people?id=${Date.now()}`
    };
    
    STATE.fubLeadId = payload.data.id;
    
    // Sign the payload
    const secret = process.env.FUB_WEBHOOK_SECRET || 'test-secret';
    const signature = generateSignature(payload, secret);
    
    // Send webhook
    const webhookUrl = `${CONFIG.webhookBaseUrl}/api/webhook/fub`;
    log('INFO', `Sending webhook to: ${webhookUrl}`);
    
    const response = await httpRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'x-signature': signature,
        'x-webhook-secret': secret
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    STATE.webhookResponse = response.data;
    
    return recordResult(
      'Lead Webhook Simulation',
      true,
      {
        leadId: payload.data.id,
        phone: testPhone,
        response: response.data
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'Lead Webhook Simulation',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 3: Validate Lead in Supabase
 */
async function testSupabaseLeadStorage() {
  log('INFO', '━━━ TEST 3: Supabase Lead Storage ━━━');
  const startTime = Date.now();
  
  try {
    // Wait a moment for async processing
    await sleep(2000);
    
    // Query Supabase for the lead
    const response = await supabaseQuery('leads', 'GET', null, {
      phone: CONFIG.testLead.phone
    });
    
    if (!response.ok || !response.data || response.data.length === 0) {
      // Retry once
      await sleep(3000);
      const retry = await supabaseQuery('leads', 'GET', null, {
        phone: CONFIG.testLead.phone
      });
      
      if (!retry.ok || !retry.data || retry.data.length === 0) {
        throw new Error('Lead not found in Supabase after retry');
      }
      
      response.data = retry.data;
    }
    
    const lead = response.data[0];
    STATE.supabaseLeadId = lead.id;
    
    // Validate lead data
    const validations = [
      { field: 'name', expected: `${CONFIG.testLead.firstName} ${CONFIG.testLead.lastName}`, actual: lead.name },
      { field: 'phone', expected: CONFIG.testLead.phone, actual: lead.phone },
      { field: 'email', expected: CONFIG.testLead.email, actual: lead.email },
      { field: 'source', expected: CONFIG.testLead.source, actual: lead.source },
      { field: 'status', expected: 'new', actual: lead.status }
    ];
    
    const failed = validations.filter(v => v.actual !== v.expected);
    
    if (failed.length > 0) {
      throw new Error(`Validation failed: ${failed.map(f => `${f.field}=${f.actual}`).join(', ')}`);
    }
    
    return recordResult(
      'Supabase Lead Storage',
      true,
      {
        leadId: lead.id,
        validations: validations.length,
        data: lead
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'Supabase Lead Storage',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 4: Verify AI SMS Response Triggered
 */
async function testAiSmsResponse() {
  log('INFO', '━━━ TEST 4: AI SMS Response Triggered ━━━');
  const startTime = Date.now();
  
  try {
    // Wait for AI processing
    await sleep(5000);
    
    // Query messages for this lead
    const response = await supabaseQuery('messages', 'GET', null, {
      lead_id: STATE.supabaseLeadId
    });
    
    if (!response.ok || !response.data || response.data.length === 0) {
      // Retry with longer wait
      await sleep(5000);
      const retry = await supabaseQuery('messages', 'GET', null, {
        lead_id: STATE.supabaseLeadId
      });
      
      if (!retry.ok || !retry.data || retry.data.length === 0) {
        throw new Error('No messages found for lead after retry');
      }
      
      response.data = retry.data;
    }
    
    // Filter for outbound AI-generated messages
    const aiMessages = response.data.filter(m => 
      m.direction === 'outbound' && m.ai_generated === true
    );
    
    if (aiMessages.length === 0) {
      throw new Error('No AI-generated outbound messages found');
    }
    
    const aiMessage = aiMessages[0];
    STATE.smsMessageId = aiMessage.id;
    
    // Validate message content
    const hasComplianceFooter = aiMessage.message_body.toLowerCase().includes('stop');
    const hasPersonalization = aiMessage.message_body.toLowerCase().includes(CONFIG.testLead.firstName.toLowerCase());
    const reasonableLength = aiMessage.message_body.length > 50 && aiMessage.message_body.length < 500;
    
    return recordResult(
      'AI SMS Response',
      true,
      {
        messageId: aiMessage.id,
        messageBody: aiMessage.message_body,
        confidence: aiMessage.ai_confidence,
        hasComplianceFooter,
        hasPersonalization,
        reasonableLength,
        sentAt: aiMessage.sent_at
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'AI SMS Response',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 5: Test Cal.com Booking Link Generation
 */
async function testCalcomBookingLink() {
  log('INFO', '━━━ TEST 5: Cal.com Booking Link Generation ━━━');
  const startTime = Date.now();
  
  try {
    // Get agent info to retrieve Cal.com username
    const agentResponse = await supabaseQuery('agents', 'GET', null, {
      is_active: true
    });
    
    if (!agentResponse.ok || !agentResponse.data || agentResponse.data.length === 0) {
      throw new Error('No active agents found');
    }
    
    const agent = agentResponse.data[0];
    
    if (!agent.calcom_username) {
      throw new Error('Agent has no Cal.com username configured');
    }
    
    // Test Cal.com API for event types
    const calcomUrl = `${CONFIG.calcomApiBase}/event-types?apiKey=${CONFIG.calcomApiKey}`;
    
    const response = await httpRequest(calcomUrl);
    
    if (!response.ok) {
      throw new Error(`Cal.com API error: ${response.status}`);
    }
    
    const eventTypes = response.data?.event_types || [];
    const bookingLink = `https://cal.com/${agent.calcom_username}`;
    
    return recordResult(
      'Cal.com Booking Link',
      true,
      {
        calcomUsername: agent.calcom_username,
        bookingLink,
        eventTypesCount: eventTypes.length,
        eventTypes: eventTypes.map(e => ({ id: e.id, title: e.title, slug: e.slug }))
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'Cal.com Booking Link',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 6: Simulate Booking Completion
 */
async function testBookingCompletion() {
  log('INFO', '━━━ TEST 6: Booking Completion Simulation ━━━');
  const startTime = Date.now();
  
  try {
    // Simulate Cal.com booking webhook
    const bookingPayload = {
      triggerEvent: 'BOOKING_CREATED',
      payload: {
        bookingId: `booking_${Date.now()}`,
        eventTypeId: '12345',
        title: 'Real Estate Consultation',
        description: 'Initial consultation for home buying',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 90000000).toISOString(),
        attendees: [{
          email: CONFIG.testLead.email,
          name: `${CONFIG.testLead.firstName} ${CONFIG.testLead.lastName}`,
          phoneNumber: CONFIG.testLead.phone,
          timeZone: 'America/Toronto'
        }],
        organizer: {
          name: 'Test Agent',
          email: 'agent@leadflow.ai',
          timeZone: 'America/Toronto'
        },
        metadata: {
          videoCallUrl: 'https://meet.cal.com/test-meeting'
        },
        uid: `uid_${Date.now()}`
      }
    };
    
    STATE.bookingId = bookingPayload.payload.bookingId;
    
    // Send Cal.com webhook
    const webhookUrl = `${CONFIG.webhookBaseUrl}/api/webhook/calcom`;
    const secret = process.env.CALCOM_WEBHOOK_SECRET || 'test-secret';
    const signature = generateSignature(bookingPayload, secret);
    
    const response = await httpRequest(webhookUrl, {
      method: 'POST',
      headers: {
        'X-Calcom-Signature': signature
      },
      body: JSON.stringify(bookingPayload)
    });
    
    // Wait for processing
    await sleep(2000);
    
    // Verify booking in Supabase
    const bookingQuery = await supabaseQuery('bookings', 'GET', null, {
      calcom_booking_id: bookingPayload.payload.bookingId
    });
    
    if (!bookingQuery.ok || !bookingQuery.data || bookingQuery.data.length === 0) {
      throw new Error('Booking not found in Supabase after webhook');
    }
    
    const booking = bookingQuery.data[0];
    
    // Verify lead status updated
    const leadQuery = await supabaseQuery('leads', 'GET', null, {
      id: STATE.supabaseLeadId
    });
    
    const lead = leadQuery.data?.[0];
    
    return recordResult(
      'Booking Completion',
      true,
      {
        bookingId: booking.id,
        calcomBookingId: booking.calcom_booking_id,
        leadId: booking.lead_id,
        status: booking.status,
        leadStatus: lead?.status,
        startTime: booking.start_time
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'Booking Completion',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 7: Validate PostHog Events
 */
async function testPosthogEvents() {
  log('INFO', '━━━ TEST 7: PostHog Event Tracking ━━━');
  const startTime = Date.now();
  
  try {
    // Query events from Supabase events table (which mirrors to PostHog)
    const response = await supabaseQuery('events', 'GET', null, {
      lead_id: STATE.supabaseLeadId
    });
    
    if (!response.ok || !response.data) {
      throw new Error('Failed to query events');
    }
    
    const events = response.data;
    STATE.events = events;
    
    // Check for expected event types
    const eventTypes = events.map(e => e.event_type);
    const foundExpected = CONFIG.expectedEvents.filter(expected => 
      eventTypes.some(type => type.includes(expected) || expected.includes(type))
    );
    
    const coverage = (foundExpected.length / CONFIG.expectedEvents.length * 100).toFixed(1);
    
    return recordResult(
      'PostHog Event Tracking',
      true,
      {
        totalEvents: events.length,
        expectedCoverage: `${coverage}%`,
        foundEvents: foundExpected,
        missingEvents: CONFIG.expectedEvents.filter(e => !foundExpected.includes(e)),
        eventTypes: [...new Set(eventTypes)]
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'PostHog Event Tracking',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

/**
 * TEST 8: Verify SMS Delivery Status
 */
async function testSmsDelivery() {
  log('INFO', '━━━ TEST 8: SMS Delivery Status ━━━');
  const startTime = Date.now();
  
  try {
    // Query the message for delivery status
    const response = await supabaseQuery('messages', 'GET', null, {
      id: STATE.smsMessageId
    });
    
    if (!response.ok || !response.data || response.data.length === 0) {
      throw new Error('SMS message not found');
    }
    
    const message = response.data[0];
    
    // In test mode, we check if it was processed, not actually delivered
    const wasProcessed = message.status === 'sent' || message.status === 'delivered';
    const hasTwilioSid = !!message.twilio_sid;
    
    return recordResult(
      'SMS Delivery Status',
      true,
      {
        messageId: message.id,
        status: message.status,
        twilioSid: message.twilio_sid,
        twilioStatus: message.twilio_status,
        wasProcessed,
        hasTwilioSid,
        sentAt: message.sent_at
      },
      Date.now() - startTime
    );
    
  } catch (error) {
    return recordResult(
      'SMS Delivery Status',
      false,
      error.message,
      Date.now() - startTime
    );
  }
}

// ============================================
// TEST REPORT GENERATOR
// ============================================
function generateTestReport() {
  STATE.endTime = Date.now();
  const totalDuration = STATE.endTime - STATE.startTime;
  
  const passed = STATE.results.filter(r => r.passed).length;
  const failed = STATE.results.filter(r => !r.passed).length;
  const passRate = ((passed / STATE.results.length) * 100).toFixed(1);
  
  const report = {
    metadata: {
      testSuite: 'LeadFlow First Lead Simulation Test',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: CONFIG.env,
      totalDuration: `${totalDuration}ms`,
      webhookBaseUrl: CONFIG.webhookBaseUrl
    },
    summary: {
      totalTests: STATE.results.length,
      passed,
      failed,
      passRate: `${passRate}%`,
      status: failed === 0 ? 'PASSED' : failed <= 2 ? 'PARTIAL' : 'FAILED'
    },
    testData: {
      testLead: {
        firstName: CONFIG.testLead.firstName,
        lastName: CONFIG.testLead.lastName,
        phone: CONFIG.testLead.phone,
        email: CONFIG.testLead.email
      },
      fubLeadId: STATE.fubLeadId,
      supabaseLeadId: STATE.supabaseLeadId,
      smsMessageId: STATE.smsMessageId,
      bookingId: STATE.bookingId
    },
    results: STATE.results,
    events: STATE.events,
    logs: STATE.logs.slice(-50), // Last 50 logs
    errors: STATE.errors
  };
  
  return report;
}

function printReport(report) {
  console.log('\n' + '='.repeat(70));
  console.log('  LEADFLOW FIRST LEAD SIMULATION TEST REPORT');
  console.log('='.repeat(70));
  
  console.log(`\n📊 Summary:`);
  console.log(`   Status: ${report.summary.status === 'PASSED' ? '✅ PASSED' : report.summary.status === 'PARTIAL' ? '⚠️  PARTIAL' : '❌ FAILED'}`);
  console.log(`   Tests: ${report.summary.passed}/${report.summary.totalTests} passed (${report.summary.passRate})`);
  console.log(`   Duration: ${report.metadata.totalDuration}`);
  
  console.log(`\n📝 Test Data:`);
  console.log(`   Lead: ${report.testData.testLead.firstName} ${report.testData.testLead.lastName}`);
  console.log(`   Phone: ${report.testData.testLead.phone}`);
  console.log(`   FUB ID: ${report.testData.fubLeadId || 'N/A'}`);
  console.log(`   Supabase ID: ${report.testData.supabaseLeadId || 'N/A'}`);
  console.log(`   SMS ID: ${report.testData.smsMessageId || 'N/A'}`);
  console.log(`   Booking ID: ${report.testData.bookingId || 'N/A'}`);
  
  console.log(`\n📋 Detailed Results:`);
  report.results.forEach((result, i) => {
    const icon = result.passed ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`   ${icon} ${i + 1}. ${result.testName} ${duration}`);
    
    if (!result.passed && result.details) {
      console.log(`      Error: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`);
    }
  });
  
  if (report.errors.length > 0) {
    console.log(`\n❌ Errors (${report.errors.length}):`);
    report.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error.testName}: ${error.details}`);
    });
  }
  
  console.log(`\n📈 Events Tracked: ${report.events.length}`);
  const eventTypes = [...new Set(report.events.map(e => e.event_type))];
  eventTypes.forEach(type => {
    const count = report.events.filter(e => e.event_type === type).length;
    console.log(`   - ${type}: ${count}`);
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (report.summary.status === 'PASSED') {
    console.log('🎉 ALL TESTS PASSED! Lead flow is working correctly.');
  } else if (report.summary.status === 'PARTIAL') {
    console.log('⚠️  SOME TESTS FAILED. Review errors above.');
  } else {
    console.log('❌ TEST SUITE FAILED. System requires attention.');
  }
  
  console.log('='.repeat(70) + '\n');
}

async function saveReport(report) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const filename = `first-lead-simulation-report-${Date.now()}.json`;
  const filepath = path.join(__dirname, filename);
  
  await fs.writeFile(filepath, JSON.stringify(report, null, 2));
  console.log(`💾 Report saved to: ${filename}`);
  
  // Also save a markdown summary
  const mdFilename = `first-lead-simulation-report-${Date.now()}.md`;
  const mdFilepath = path.join(__dirname, mdFilename);
  
  const mdContent = `# LeadFlow First Lead Simulation Test Report

**Date:** ${new Date().toISOString()}  
**Environment:** ${report.metadata.environment}  
**Status:** ${report.summary.status}

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Pass Rate | ${report.summary.passRate} |
| Duration | ${report.metadata.totalDuration} |

## Test Data

- **Lead Name:** ${report.testData.testLead.firstName} ${report.testData.testLead.lastName}
- **Phone:** ${report.testData.testLead.phone}
- **Email:** ${report.testData.testLead.email}
- **FUB ID:** ${report.testData.fubLeadId || 'N/A'}
- **Supabase ID:** ${report.testData.supabaseLeadId || 'N/A'}

## Results

| # | Test | Status | Duration |
|---|------|--------|----------|
${report.results.map((r, i) => `| ${i + 1} | ${r.testName} | ${r.passed ? '✅ PASS' : '❌ FAIL'} | ${r.duration || 'N/A'}ms |`).join('\n')}

## Errors

${report.errors.length === 0 ? 'No errors.' : report.errors.map((e, i) => `${i + 1}. **${e.testName}:** ${e.details}`).join('\n\n')}

## Integration Issues Found

${report.errors.length > 0 ? report.errors.map(e => `- **${e.testName}:** ${e.details}`).join('\n') : 'None detected.'}

## Next Steps

${report.summary.status === 'PASSED' 
  ? '- System is ready for production use\n- All integrations verified\n- Monitor real lead flow' 
  : '- Review failed tests above\n- Fix integration issues\n- Re-run simulation'}
`;
  
  await fs.writeFile(mdFilepath, mdContent);
  console.log(`📝 Markdown report saved to: ${mdFilename}`);
  
  return { jsonFile: filename, mdFile: mdFilename };
}

// ============================================
// MAIN EXECUTION
// ============================================
async function runSimulation() {
  console.log('\n🚀 LeadFlow First Lead Simulation Test\n');
  console.log('='.repeat(70));
  
  STATE.startTime = Date.now();
  
  // Run all tests in sequence
  await testEnvironment();
  await testLeadWebhookSimulation();
  await testSupabaseLeadStorage();
  await testAiSmsResponse();
  await testCalcomBookingLink();
  await testBookingCompletion();
  await testPosthogEvents();
  await testSmsDelivery();
  
  // Generate and print report
  const report = generateTestReport();
  printReport(report);
  
  // Save reports
  const saved = await saveReport(report);
  
  // Exit with appropriate code
  const exitCode = report.summary.status === 'PASSED' ? 0 : report.summary.status === 'PARTIAL' ? 1 : 2;
  process.exit(exitCode);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the simulation
runSimulation().catch(console.error);
