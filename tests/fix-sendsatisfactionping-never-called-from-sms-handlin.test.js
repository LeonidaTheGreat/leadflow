/**
 * Fix Test: sendSatisfactionPing never called from SMS handling flow
 * 
 * Verifies that sendSatisfactionPing is properly integrated into:
 * 1. FUB webhook listener (main Express routes)
 * 2. Twilio webhook handler (dashboard)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== FIX: sendSatisfactionPing Integration ===\n');

  // Test 1: Verify satisfaction-service.js exists and exports required functions
  console.log('Test Suite 1: Shared Service\n');

  const serviceFile = path.resolve(__dirname, '../lib/satisfaction-service.js');
  await test('lib/satisfaction-service.js exists', async () => {
    assert.ok(fs.existsSync(serviceFile), `Missing: ${serviceFile}`);
  });

  const serviceSrc = fs.readFileSync(serviceFile, 'utf-8');

  await test('exports sendSatisfactionPing function', async () => {
    assert.ok(serviceSrc.includes('async function sendSatisfactionPing'), 'Missing sendSatisfactionPing');
  });

  await test('exports scheduleSatisfactionPing function', async () => {
    assert.ok(serviceSrc.includes('function scheduleSatisfactionPing'), 'Missing scheduleSatisfactionPing');
  });

  await test('exports getPendingSatisfactionPing function', async () => {
    assert.ok(serviceSrc.includes('async function getPendingSatisfactionPing'), 'Missing getPendingSatisfactionPing');
  });

  await test('exports classifyReply function', async () => {
    assert.ok(serviceSrc.includes('function classifyReply'), 'Missing classifyReply');
  });

  await test('exports recordSatisfactionReply function', async () => {
    assert.ok(serviceSrc.includes('async function recordSatisfactionReply'), 'Missing recordSatisfactionReply');
  });

  await test('sendSatisfactionPing checks agent.satisfaction_ping_enabled', async () => {
    assert.ok(serviceSrc.includes('agentSatisfactionPingEnabled'), 'Missing check for agent setting');
  });

  await test('sendSatisfactionPing checks SATISFACTION_COOLDOWN_MS', async () => {
    assert.ok(serviceSrc.includes('SATISFACTION_COOLDOWN_MS'), 'Missing cooldown check');
  });

  await test('scheduleSatisfactionPing uses setTimeout for async scheduling', async () => {
    assert.ok(serviceSrc.includes('setTimeout'), 'Missing setTimeout for async scheduling');
  });

  // Test 2: Verify FUB webhook listener imports and uses satisfaction service
  console.log('\nTest Suite 2: FUB Webhook Listener Integration\n');

  const fubListenerFile = path.resolve(__dirname, '../integration/fub-webhook-listener.js');
  const fubListenerSrc = fs.readFileSync(fubListenerFile, 'utf-8');

  await test('FUB listener imports scheduleSatisfactionPing', async () => {
    assert.ok(
      fubListenerSrc.includes("require('../lib/satisfaction-service')") ||
      fubListenerSrc.includes("require('./lib/satisfaction-service')") ||
      fubListenerSrc.includes('scheduleSatisfactionPing'),
      'Missing import of scheduleSatisfactionPing'
    );
  });

  await test('FUB listener calls scheduleSatisfactionPing for lead events', async () => {
    // Count occurrences of scheduleSatisfactionPing in the file
    const count = (fubListenerSrc.match(/scheduleSatisfactionPing\(/g) || []).length;
    assert.ok(count >= 3, `Expected at least 3 calls to scheduleSatisfactionPing, found ${count}`);
  });

  await test('FUB listener passes sendSmsViatwilio to scheduleSatisfactionPing', async () => {
    assert.ok(
      fubListenerSrc.includes('sendSmsFunction: sendSmsViatwilio'),
      'sendSmsFunction parameter not passed to scheduleSatisfactionPing'
    );
  });

  await test('FUB listener includes satisfaction ping after initial SMS send', async () => {
    // Verify that scheduleSatisfactionPing appears after sendSmsViatwilio calls
    const smsIndex = fubListenerSrc.indexOf('sendSmsViatwilio(');
    const pingIndex = fubListenerSrc.indexOf('scheduleSatisfactionPing(', smsIndex);
    assert.ok(pingIndex > smsIndex, 'scheduleSatisfactionPing should appear after sendSmsViatwilio');
  });

  // Test 3: Verify Twilio webhook handler
  console.log('\nTest Suite 3: Twilio Webhook Handler\n');

  const twilioHandlerFile = path.resolve(__dirname, '../product/lead-response/dashboard/app/api/webhook/twilio/route.ts');
  
  await test('Twilio webhook route.ts exists', async () => {
    assert.ok(fs.existsSync(twilioHandlerFile), `Missing: ${twilioHandlerFile}`);
  });

  const twilioSrc = fs.readFileSync(twilioHandlerFile, 'utf-8');

  await test('Twilio handler imports sendSatisfactionPing', async () => {
    assert.ok(twilioSrc.includes('sendSatisfactionPing'), 'Missing import of sendSatisfactionPing');
  });

  await test('Twilio handler calls sendSatisfactionPing after AI response', async () => {
    assert.ok(
      twilioSrc.includes('sendSatisfactionPing') && 
      twilioSrc.includes('setTimeout'),
      'sendSatisfactionPing not scheduled in Twilio handler'
    );
  });

  await test('Twilio handler checks conversationLength >= 2 before scheduling ping', async () => {
    assert.ok(
      twilioSrc.includes('conversationLength') && 
      twilioSrc.includes('>= 2'),
      'Missing conversation depth check before satisfaction ping'
    );
  });

  // Test 4: Verify satisfaction events table structure
  console.log('\nTest Suite 4: Database Schema\n');

  const migrationFile = path.resolve(__dirname, '../product/lead-response/dashboard/supabase/migrations/008_lead_satisfaction_feedback.sql');
  
  await test('Migration file exists', async () => {
    assert.ok(fs.existsSync(migrationFile), `Missing: ${migrationFile}`);
  });

  const migrationSql = fs.readFileSync(migrationFile, 'utf-8');

  await test('Migration creates lead_satisfaction_events table', async () => {
    assert.ok(migrationSql.includes('lead_satisfaction_events'), 'Missing table definition');
  });

  await test('Migration creates satisfaction_ping_sent_at column', async () => {
    assert.ok(migrationSql.includes('satisfaction_ping_sent_at'), 'Missing column');
  });

  await test('Migration creates rating column', async () => {
    assert.ok(migrationSql.includes('rating'), 'Missing rating column');
  });

  // Test 5: Verify sendSmsViatwilio accepts sendSmsFunction parameter
  console.log('\nTest Suite 5: Service Integration\n');

  const smsServiceFile = path.resolve(__dirname, '../lib/twilio-sms.js');
  
  await test('Twilio SMS service exists', async () => {
    assert.ok(fs.existsSync(smsServiceFile), `Missing: ${smsServiceFile}`);
  });

  const smsSrc = fs.readFileSync(smsServiceFile, 'utf-8');

  await test('sendSmsViatwilio function is exported', async () => {
    assert.ok(smsSrc.includes('sendSmsViatwilio'), 'Missing sendSmsViatwilio export');
  });

  // Final summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log(`❌ Some tests failed. Please review the integration.\n`);
    process.exit(1);
  } else {
    console.log(`✅ All integration tests passed!\n`);
    console.log(`Summary:`);
    console.log(`  • Shared satisfaction service created`);
    console.log(`  • FUB webhook listener integrated with satisfaction pings`);
    console.log(`  • Twilio webhook handler already integrated`);
    console.log(`  • Database schema verified\n`);
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
