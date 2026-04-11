'use strict';

const assert = require('assert');
const CalcomWebhookManagement = require('../../lib/services/CalcomWebhookManagement');

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
  console.log('\n🧪 CalcomWebhookManagement class tests\n');

  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalApiKey = process.env.API_SECRET_KEY;
  const originalLeadflowApiKey = process.env.LEADFLOW_API_KEY;

  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.API_SECRET_KEY;
  delete process.env.LEADFLOW_API_KEY;

  await check('exports class with backward-compatible helpers', async () => {
    assert.strictEqual(typeof CalcomWebhookManagement, 'function');
    assert.strictEqual(typeof CalcomWebhookManagement.listWebhooks, 'function');
  });

  await check('listWebhooks returns mock values without DB config', async () => {
    const service = new CalcomWebhookManagement();
    const items = await service.listWebhooks();
    assert.strictEqual(Array.isArray(items), true);
    assert.strictEqual(items.length > 0, true);
  });

  await check('getWebhook resolves known mock webhook', async () => {
    const service = new CalcomWebhookManagement();
    const result = await service.getWebhook('wh_mock_001');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.webhook.webhookId, 'wh_mock_001');
  });

  await check('testWebhook returns mock success without DB config', async () => {
    const service = new CalcomWebhookManagement();
    const result = await service.testWebhook('wh_mock_001');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mock, true);
  });

  await check('generateWebhookSecret returns whsec-prefixed value', async () => {
    const service = new CalcomWebhookManagement();
    const secret = service.generateWebhookSecret();
    assert.strictEqual(secret.startsWith('whsec_'), true);
    assert.strictEqual(secret.length > 20, true);
  });

  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;

  if (originalApiKey === undefined) delete process.env.API_SECRET_KEY;
  else process.env.API_SECRET_KEY = originalApiKey;

  if (originalLeadflowApiKey === undefined) delete process.env.LEADFLOW_API_KEY;
  else process.env.LEADFLOW_API_KEY = originalLeadflowApiKey;

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
