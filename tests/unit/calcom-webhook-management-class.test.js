'use strict';

const assert = require('assert');
const CalcomWebhookManagement = require('../../lib/services/CalcomWebhookManagement');

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

function createDbMock({ insertResult } = {}) {
  return {
    from(tableName) {
      assert.strictEqual(tableName, 'webhook_configs');
      return {
        insert(payload) {
          return {
            select() {
              return {
                single: async () => ({
                  data: insertResult || {
                    id: 'row-1',
                    webhook_id: payload.webhook_id,
                    subscriber_url: payload.subscriber_url,
                    event_triggers: payload.event_triggers,
                    active: payload.active,
                    created_at: payload.created_at
                  },
                  error: null
                })
              };
            }
          };
        }
      };
    }
  };
}

async function runTests() {
  console.log('\n🧪 CalcomWebhookManagement class tests\n');

  await test('exports a class constructor', async () => {
    assert.strictEqual(typeof CalcomWebhookManagement, 'function');
    const service = new CalcomWebhookManagement();
    assert.strictEqual(typeof service.registerWebhook, 'function');
  });

  await test('returns mock webhooks when db is not configured', async () => {
    const service = new CalcomWebhookManagement();
    const result = await service.listWebhooks();

    assert.ok(Array.isArray(result));
    assert.ok(result.length > 0);
    assert.strictEqual(result[0].webhookId, 'wh_mock_001');
  });

  await test('validates webhook registration payload', async () => {
    const service = new CalcomWebhookManagement({ db: createDbMock() });

    await assert.rejects(
      () => service.registerWebhook({ eventTriggers: ['BOOKING_CREATED'] }),
      /subscriberUrl is required/
    );

    await assert.rejects(
      () => service.registerWebhook({ subscriberUrl: 'https://example.com/webhook', eventTriggers: [] }),
      /eventTriggers must be a non-empty array/
    );
  });

  await test('registers webhook and returns created shape', async () => {
    const service = new CalcomWebhookManagement({ db: createDbMock() });

    const result = await service.registerWebhook({
      subscriberUrl: 'https://example.com/webhook/calcom',
      eventTriggers: ['BOOKING_CREATED'],
      registeredBy: 'unit-test'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.webhook.subscriberUrl, 'https://example.com/webhook/calcom');
    assert.ok(result.webhook.webhookId.startsWith('wh_'));
    assert.ok(result.webhook.secret.startsWith('whsec_'));
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
