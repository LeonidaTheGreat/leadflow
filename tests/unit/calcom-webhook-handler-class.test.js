'use strict';

const assert = require('assert');
const crypto = require('crypto');
const CalcomWebhookHandler = require('../../lib/services/CalcomWebhookHandler');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n🧪 CalcomWebhookHandler class tests\n');

  await check('exports class with backward-compatible helpers', async () => {
    assert.strictEqual(typeof CalcomWebhookHandler, 'function');
    assert.strictEqual(typeof CalcomWebhookHandler.handleCalWebhook, 'function');
  });

  await check('verifyWebhookSignature validates correct HMAC', async () => {
    const payload = JSON.stringify({ ping: 'pong' });
    const originalSecret = process.env.CAL_WEBHOOK_SECRET;
    process.env.CAL_WEBHOOK_SECRET = 'secret-123';

    const sig = crypto.createHmac('sha256', 'secret-123').update(payload).digest('hex');
    const handler = new CalcomWebhookHandler();
    assert.strictEqual(handler.verifyWebhookSignature(payload, sig), true);

    if (originalSecret === undefined) delete process.env.CAL_WEBHOOK_SECRET;
    else process.env.CAL_WEBHOOK_SECRET = originalSecret;
  });

  await check('handleCalWebhook handles unknown event without error', async () => {
    const handler = new CalcomWebhookHandler();
    const result = await handler.handleCalWebhook({ triggerEvent: 'UNKNOWN_EVENT', payload: {} });
    assert.strictEqual(result.received, true);
    assert.strictEqual(result.type, 'UNKNOWN_EVENT');
  });

  await check('withRetry retries until success', async () => {
    const handler = new CalcomWebhookHandler();
    let attempts = 0;

    const value = await handler.withRetry(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary');
      return 'done';
    }, { maxRetries: 2 }, 'retry test');

    assert.strictEqual(value, 'done');
    assert.strictEqual(attempts, 3);
  });

  await check('calculateBackoffDelay returns positive integer', async () => {
    const handler = new CalcomWebhookHandler();
    const delay = handler.calculateBackoffDelay(2);
    assert.strictEqual(Number.isInteger(delay), true);
    assert.strictEqual(delay > 0, true);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
