'use strict';

const assert = require('assert');
const EmailService = require('../../lib/services/EmailService');

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
  console.log('\n=== unit: EmailService class ===\n');

  await check('isConfigured() returns false without API key', async () => {
    const service = new EmailService({ apiKey: '' });
    assert.strictEqual(service.isConfigured(), false);
  });

  await check('constructor trims API key and from email', async () => {
    const service = new EmailService({ apiKey: '  key  ', fromEmail: '  x@y.com  ' });
    assert.strictEqual(service.apiKey, 'key');
    assert.strictEqual(service.fromEmail, 'x@y.com');
  });

  await check('send() fails when unconfigured by default', async () => {
    const service = new EmailService({ apiKey: '' });
    const result = await service.send({ to: 'a@test.com', subject: 'x', html: '<p>x</p>' });
    assert.deepStrictEqual(result, { success: false, error: 'RESEND_API_KEY not configured' });
  });

  await check('send() returns mock when unconfigured + failIfUnconfigured=false', async () => {
    const service = new EmailService({ apiKey: '' });
    const result = await service.send({
      to: 'a@test.com',
      subject: 'x',
      html: '<p>x</p>',
      failIfUnconfigured: false,
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mock, true);
    assert.ok(result.id.startsWith('mock_'));
  });

  await check('sendPilotConversion() adds pilot-conversion tag', async () => {
    let payload = null;
    const service = new EmailService({
      apiKey: 'key',
      fetchImpl: async (_url, options) => {
        payload = JSON.parse(options.body);
        return {
          ok: true,
          async json() { return { id: 're_123' }; }
        };
      }
    });

    const result = await service.sendPilotConversion({
      to: 'pilot@test.com',
      subject: 'Pilot',
      html: '<p>pilot</p>',
      text: 'pilot'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(payload.tags[0].value, 'pilot-conversion');
  });

  await check('sendActivationOutreach() sends outreach html', async () => {
    let payload = null;
    const service = new EmailService({
      apiKey: 'key',
      fetchImpl: async (_url, options) => {
        payload = JSON.parse(options.body);
        return {
          ok: true,
          async json() { return { id: 're_456' }; }
        };
      }
    });

    const result = await service.sendActivationOutreach({
      to: 'agent@test.com',
      firstName: 'Alex',
      subject: 'Setup',
      appUrl: 'https://leadflow.test'
    });

    assert.strictEqual(result.success, true);
    assert.ok(payload.html.includes('Hi Alex'));
    assert.ok(payload.html.includes('https://leadflow.test/dashboard/onboarding'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
