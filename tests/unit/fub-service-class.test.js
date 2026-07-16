'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const FUBService = require('../../lib/services/FUBService');

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
  console.log('\n🧪 FUBService class refactor tests\n');

  await test('maps FUB webhook events and emits asynchronously', async () => {
    const eventBus = new EventEmitter();
    const service = new FUBService({ eventBus, registerEventHandlers: false, logger: { log() {}, info() {}, warn() {}, error() {} } });

    const emitted = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for lead.created emit')), 500);
      eventBus.once('lead.created', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    const response = service.handleWebhookPayload({ event: 'peopleCreated', id: 'lead-123' });
    assert.strictEqual(response.received, true);
    assert.strictEqual(response.event, 'lead.created');

    const payload = await emitted;
    assert.strictEqual(payload.id, 'lead-123');
  });

  await test('creates no_response sequence for new lead when mapped lead exists', async () => {
    const createdSequences = [];
    const pingCalls = [];
    const service = new FUBService({
      registerEventHandlers: false,
      logger: { log() {}, info() {}, warn() {}, error() {} },
      sendSmsViatwilio: async () => ({ sid: 'SM123', status: 'queued' }),
      scheduleSatisfactionPing: (payload) => pingCalls.push(payload),
      createLeadSequence: async (payload) => {
        createdSequences.push(payload);
        return payload;
      },
      findLeadByFubId: async () => 'internal-lead-uuid'
    });

    service.fetchLeadFromFub = async () => ({
      id: 'fub-lead-1',
      firstName: 'Ava',
      phoneNumber: '+14165551234',
      consents: { sms: true },
      assignedTo: { id: 'agent-1' },
      satisfactionPingEnabled: true
    });

    service.checkDncStatus = async () => false;
    service.generateAiSmsResponse = async () => ({ message: 'Hello from AI', trigger: 'initial_response' });
    service.logSmsInFub = async () => {};

    await service.handleLeadCreated({ id: 'fub-lead-1', phoneNumber: '+14165551234' });

    assert.strictEqual(createdSequences.length, 1);
    assert.strictEqual(createdSequences[0].sequence_type, 'no_response');
    assert.strictEqual(createdSequences[0].trigger_reason, 'new_lead_no_response');
    assert.strictEqual(pingCalls.length, 1);
    assert.strictEqual(pingCalls[0].sendSmsFunction, service.sendSmsViatwilio);
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
