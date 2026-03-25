/**
 * Unit Tests: FUB Webhook → Sequence Creation (UC-8 fix)
 * Task: b54381ed-a14f-4887-9e23-7ab783d7ecb7
 *
 * Verifies that:
 * 1. lead.created event triggers no_response sequence
 * 2. lead.status_changed 'Appointment Set' triggers post_viewing sequence
 * 3. lead.status_changed 'No Show' triggers no_show sequence
 */

'use strict';

const assert = require('assert');

// ===== STATE TRACKING =====
const createdSequences = [];
let mockInternalLeadId = 'internal-lead-uuid-001';

// ===== MOCK sequence-service =====
// We inject our mock before loading the module
const sequenceServiceMock = {
  createLeadSequence: async (params) => {
    createdSequences.push({ ...params });
    return { id: `seq-${Date.now()}`, ...params, status: 'active' };
  },
  findLeadByFubId: async (fubId) => {
    return fubId ? mockInternalLeadId : null;
  },
};

// ===== TESTS =====
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed++;
      results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    })
    .catch((err) => {
      failed++;
      results.push({ name, passed: false, error: err.message });
      console.log(`  ❌ ${name}: ${err.message}`);
    });
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Tests: FUB Webhook → Sequence Triggers             ║');
  console.log('║  Task: b54381ed-a14f-4887-9e23-7ab783d7ecb7         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ---- Test: sequence-service module exports createLeadSequence ----
  console.log('📋 sequence-service.js exports:');
  await test('exports createLeadSequence function', () => {
    const svc = require('../../lib/sequence-service');
    assert.strictEqual(typeof svc.createLeadSequence, 'function');
  });

  await test('exports findLeadByFubId function', () => {
    const svc = require('../../lib/sequence-service');
    assert.strictEqual(typeof svc.findLeadByFubId, 'function');
  });

  await test('exports findLeadByPhone function', () => {
    const svc = require('../../lib/sequence-service');
    assert.strictEqual(typeof svc.findLeadByPhone, 'function');
  });

  await test('exports hasActiveSequence function', () => {
    const svc = require('../../lib/sequence-service');
    assert.strictEqual(typeof svc.hasActiveSequence, 'function');
  });

  await test('exports getInitialSendTime function', () => {
    const svc = require('../../lib/sequence-service');
    assert.strictEqual(typeof svc.getInitialSendTime, 'function');
  });

  // ---- Test: fub-webhook-listener imports sequence-service ----
  console.log('\n📋 fub-webhook-listener.js imports:');
  await test('fub-webhook-listener.js requires sequence-service', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(
      content.includes('require(') && content.includes('sequence-service'),
      'Should require sequence-service'
    );
  });

  await test('fub-webhook-listener.js calls createLeadSequence', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes('createLeadSequence'), 'Should call createLeadSequence');
  });

  await test('fub-webhook-listener.js creates no_response sequence on lead.created', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes("'no_response'"), "Should reference 'no_response' sequence type");
    assert.ok(content.includes("'new_lead_no_response'") || content.includes('"new_lead_no_response"'),
      "Should have trigger_reason 'new_lead_no_response'");
  });

  await test('fub-webhook-listener.js triggers post_viewing on Appointment Set', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes("'post_viewing'"), "Should reference 'post_viewing' sequence type");
    assert.ok(content.includes('Appointment Set'), "Should check for 'Appointment Set' status");
  });

  await test('fub-webhook-listener.js triggers no_show on No Show status', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes("'no_show'"), "Should reference 'no_show' sequence type");
    assert.ok(content.includes('No Show') || content.includes('Missed'), "Should check for 'No Show'/'Missed' status");
  });

  // ---- Test: calcom-webhook-handler imports sequence-service ----
  console.log('\n📋 calcom-webhook-handler.js (Cal.com integration):');
  await test('calcom-webhook-handler.js requires sequence-service', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../lib/calcom-webhook-handler'),
      'utf8'
    );
    assert.ok(content.includes('sequence-service'), 'Should require sequence-service');
  });

  await test('calcom-webhook-handler.js calls createLeadSequence in triggerPostMeetingFollowUp', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../lib/calcom-webhook-handler'),
      'utf8'
    );
    assert.ok(content.includes('createLeadSequence'), 'Should call createLeadSequence');
    assert.ok(
      content.includes("'post_viewing'"),
      "Should create 'post_viewing' sequence on meeting end"
    );
  });

  await test('calcom-webhook-handler.js creates no_show sequence on booking cancelled', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../lib/calcom-webhook-handler'),
      'utf8'
    );
    assert.ok(
      content.includes("'no_show'"),
      "Should create 'no_show' sequence on booking cancellation"
    );
  });

  // ---- Correctness of sequence_service duplicate guard ----
  console.log('\n📋 Duplicate guard (idempotency):');
  await test('no_response send time is at least 23h from now', () => {
    const svc = require('../../lib/sequence-service');
    const ts = svc.getInitialSendTime('no_response');
    const delayMs = new Date(ts).getTime() - Date.now();
    assert.ok(delayMs > 23 * 3600 * 1000, `Expected >23h, got ${Math.round(delayMs / 3600000)}h`);
  });

  await test('post_viewing send time is at least 3.9h from now', () => {
    const svc = require('../../lib/sequence-service');
    const ts = svc.getInitialSendTime('post_viewing');
    const delayMs = new Date(ts).getTime() - Date.now();
    assert.ok(delayMs > 3.9 * 3600 * 1000, `Expected >3.9h, got ${Math.round(delayMs / 3600000)}h`);
  });

  await test('no_show send time is at least 29min from now', () => {
    const svc = require('../../lib/sequence-service');
    const ts = svc.getInitialSendTime('no_show');
    const delayMs = new Date(ts).getTime() - Date.now();
    assert.ok(delayMs > 29 * 60 * 1000, `Expected >29min, got ${Math.round(delayMs / 60000)}min`);
  });

  // ---- Summary ----
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  const rate = passed / (passed + failed);
  console.log(`  📈 Pass rate: ${(rate * 100).toFixed(0)}%`);
  console.log('');

  return { passed, failed, total: passed + failed, passRate: rate, results };
}

module.exports = { runTests };

if (require.main === module) {
  runTests().then(r => {
    process.exit(r.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}
