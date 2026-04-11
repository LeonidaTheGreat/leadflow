'use strict';

const assert = require('assert');
const CalcomClient = require('../../lib/services/CalcomClient');

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
  console.log('\n🧪 CalcomClient class tests\n');

  await test('exports a class constructor', async () => {
    assert.strictEqual(typeof CalcomClient, 'function');
    const client = new CalcomClient();
    assert.strictEqual(typeof client.getEventTypes, 'function');
  });

  await test('returns mock event types when unconfigured', async () => {
    const client = new CalcomClient({ defaultUsername: 'agent-demo' });
    const eventTypes = await client.getEventTypes();

    assert.ok(Array.isArray(eventTypes));
    assert.ok(eventTypes.length > 0);
    assert.ok(eventTypes[0].bookingUrl.includes('/agent-demo/'));
  });

  await test('calApiRequest sets cal-api-version header for bookings endpoints', async () => {
    const calls = [];
    const client = new CalcomClient({
      apiKey: 'test_api_key',
      httpClient: async (config) => {
        calls.push(config);
        return { data: { ok: true } };
      }
    });

    await client.calApiRequest('/bookings/123');

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer test_api_key');
    assert.strictEqual(calls[0].headers['cal-api-version'], '2024-08-13');
  });

  await test('getEventTypes maps API response into booking models', async () => {
    const client = new CalcomClient({
      apiKey: 'test_api_key',
      defaultUsername: 'agent-user',
      httpClient: async () => ({
        data: {
          data: [{
            id: 42,
            slug: 'discovery-call',
            title: 'Discovery',
            description: 'Intro call',
            length: 30,
            hidden: false
          }]
        }
      })
    });

    const eventTypes = await client.getEventTypes({ username: 'agent-user' });
    assert.strictEqual(eventTypes.length, 1);
    assert.strictEqual(eventTypes[0].id, 42);
    assert.strictEqual(eventTypes[0].duration, 30);
    assert.strictEqual(eventTypes[0].bookingUrl, 'https://cal.com/agent-user/discovery-call');
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
