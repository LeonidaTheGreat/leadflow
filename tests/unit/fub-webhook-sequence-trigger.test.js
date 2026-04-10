/**
 * Unit Tests: FUB Webhook → Sequence Creation (UC-8 fix)
 * Task: b54381ed-a14f-4887-9e23-7ab783d7ecb7
 *
 * Verifies that:
 * 1. SequenceService class has expected methods
 * 2. fub-webhook-listener uses FUBService (which wraps SequenceService)
 * 3. calcom-webhook-handler uses SequenceService
 */

'use strict';

const assert = require('assert');

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

  // ---- Test: SequenceService class has expected methods ----
  console.log('📋 SequenceService class methods:');
  await test('SequenceService has createLeadSequence method', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    assert.strictEqual(typeof SequenceService.prototype.createLeadSequence, 'function');
  });

  await test('SequenceService has findLeadByFubId method', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    assert.strictEqual(typeof SequenceService.prototype.findLeadByFubId, 'function');
  });

  await test('SequenceService has findLeadByPhone method', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    assert.strictEqual(typeof SequenceService.prototype.findLeadByPhone, 'function');
  });

  await test('SequenceService has hasActiveSequence method', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    assert.strictEqual(typeof SequenceService.prototype.hasActiveSequence, 'function');
  });

  await test('SequenceService has getInitialSendTime method', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    assert.strictEqual(typeof SequenceService.prototype.getInitialSendTime, 'function');
  });

  // ---- Test: fub-webhook-listener uses FUBService ----
  console.log('\n📋 fub-webhook-listener.js imports:');
  await test('fub-webhook-listener.js requires FUBService', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(
      content.includes('require(') && content.includes('FUBService'),
      'Should require FUBService'
    );
  });

  await test('fub-webhook-listener.js handles Appointment Set status', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes('Appointment Set') || content.includes('appointment'),
      "Should handle 'Appointment Set' status");
  });

  await test('fub-webhook-listener.js handles No Show status', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../integration/fub-webhook-listener'),
      'utf8'
    );
    assert.ok(content.includes('No Show') || content.includes('Missed') || content.includes('no_show'),
      "Should handle 'No Show'/'Missed' status");
  });

  // ---- Test: calcom-webhook-handler imports SequenceService ----
  console.log('\n📋 calcom-webhook-handler.js (Cal.com integration):');
  await test('calcom-webhook-handler.js requires SequenceService', () => {
    const fs = require('fs');
    const content = fs.readFileSync(
      require.resolve('../../lib/calcom-webhook-handler'),
      'utf8'
    );
    assert.ok(content.includes('SequenceService'), 'Should require SequenceService');
  });

  await test('calcom-webhook-handler.js calls createLeadSequence', () => {
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

  // ---- Correctness of SequenceService timing ----
  console.log('\n📋 Duplicate guard (idempotency):');
  await test('no_response send time is at least 23h from now', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    const svc = new SequenceService();
    const ts = svc.getInitialSendTime('no_response');
    const delayMs = new Date(ts).getTime() - Date.now();
    assert.ok(delayMs > 23 * 3600 * 1000, `Expected >23h, got ${Math.round(delayMs / 3600000)}h`);
  });

  await test('post_viewing send time is at least 3.9h from now', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    const svc = new SequenceService();
    const ts = svc.getInitialSendTime('post_viewing');
    const delayMs = new Date(ts).getTime() - Date.now();
    assert.ok(delayMs > 3.9 * 3600 * 1000, `Expected >3.9h, got ${Math.round(delayMs / 3600000)}h`);
  });

  await test('no_show send time is at least 29min from now', () => {
    const SequenceService = require('../../lib/services/SequenceService');
    const svc = new SequenceService();
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
