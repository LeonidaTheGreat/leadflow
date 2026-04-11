'use strict';

const assert = require('assert');
const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ❌ ${name}: ${error.message}`);
  }
}

async function runTests() {
  console.log('\n🧪 CalcomWebhookHandler class tests\n');

  await test('exports a class constructor', async () => {
    assert.strictEqual(typeof CalcomWebhookHandler, 'function');
    const handler = new CalcomWebhookHandler();
    assert.strictEqual(typeof handler.handleCalWebhook, 'function');
  });

  await test('routes booking.created events to handleBookingCreated', async () => {
    const handler = new CalcomWebhookHandler();
    let called = false;

    handler.handleBookingCreated = async () => {
      called = true;
    };

    const result = await handler.handleCalWebhook({
      type: 'booking.created',
      data: { id: 'bk_1' }
    });

    assert.strictEqual(called, true);
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'booking.created');
  });

  await test('withRetry retries transient failures', async () => {
    const handler = new CalcomWebhookHandler();
    let attempts = 0;

    const value = await handler.withRetry(async () => {
      attempts += 1;
      if (attempts < 2) {
        const error = new Error('temporary');
        error.status = 500;
        throw error;
      }
      return 'ok';
    }, { maxRetries: 2 }, 'unit-retry');

    assert.strictEqual(value, 'ok');
    assert.strictEqual(attempts, 2);
  });

  await test('triggerPostMeetingFollowUp uses injected sequence service', async () => {
    const calls = [];
    const handler = new CalcomWebhookHandler({
      createLeadSequence: async (payload) => {
        calls.push(payload);
        return payload;
      }
    });

    await handler.triggerPostMeetingFollowUp({
      id: 'booking_1',
      cal_booking_uid: 'uid_1',
      lead_id: 'lead_1'
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].sequence_type, 'post_viewing');
    assert.strictEqual(calls[0].trigger_reason, 'meeting_ended');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('Fatal test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
