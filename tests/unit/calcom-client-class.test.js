'use strict';

const assert = require('assert');
const CalcomClient = require('../../lib/services/CalcomClient');

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
  console.log('\n🧪 CalcomClient class tests\n');

  await check('exports a class constructor', async () => {
    assert.strictEqual(typeof CalcomClient, 'function');
    assert.strictEqual(typeof CalcomClient.getEventTypes, 'function');
  });

  await check('returns mock event types when unconfigured', async () => {
    const client = new CalcomClient({ apiKey: '' });
    const eventTypes = await client.getEventTypes();
    assert.strictEqual(Array.isArray(eventTypes), true);
    assert.strictEqual(eventTypes.length > 0, true);
    assert.strictEqual(eventTypes[0].mock, true);
  });

  await check('calApiRequest sets cal-api-version header for bookings endpoints', async () => {
    let capturedHeaders = null;
    const client = new CalcomClient({
      apiKey: 'test-key',
      httpClient: async (config) => {
        capturedHeaders = config.headers;
        return { data: { ok: true } };
      }
    });

    await client.calApiRequest('/bookings/123');
    assert.strictEqual(capturedHeaders['cal-api-version'], '2024-08-13');
    assert.strictEqual(capturedHeaders.Authorization, 'Bearer test-key');
  });

  await check('getEventTypes maps API response into booking models', async () => {
    const client = new CalcomClient({
      apiKey: 'test-key',
      defaultUsername: 'agent-a',
      httpClient: async () => ({
        data: {
          data: [
            {
              id: 42,
              slug: 'discovery-call',
              title: 'Discovery',
              description: 'intro',
              length: 30,
              hidden: false
            }
          ]
        }
      })
    });

    const eventTypes = await client.getEventTypes({ username: 'agent-a' });
    assert.strictEqual(eventTypes[0].duration, 30);
    assert.strictEqual(eventTypes[0].bookingUrl, 'https://cal.com/agent-a/discovery-call');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
