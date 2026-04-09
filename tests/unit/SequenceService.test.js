/**
 * Unit Tests: lib/services/SequenceService.js
 * Task: 911b8227-b248-4290-92de-8b9c271f3dd2
 */

'use strict';

const assert = require('assert');
const { SequenceService } = require('../../lib/services/SequenceService');

// ===== MOCK DB =====
let mockInsertedRow = null;
let mockExistingSequence = null;
let mockInsertError = null;

function makeMockDB() {
  return {
    from(table) {
      return {
        select(fields) {
          return {
            eq(col, val) {
              return {
                eq(col2, val2) {
                  return {
                    eq(col3, val3) {
                      return {
                        limit(n) {
                          return Promise.resolve({ data: mockExistingSequence ? [mockExistingSequence] : [], error: null });
                        }
                      };
                    }
                  };
                },
                single() {
                  if (col === 'fub_id' || col === 'phone') {
                    return Promise.resolve({ data: { id: 'lead-uuid-001' }, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                }
              };
            }
          };
        },
        insert(row) {
          return {
            select() {
              return {
                single() {
                  if (mockInsertError) {
                    return Promise.resolve({ data: null, error: mockInsertError });
                  }
                  mockInsertedRow = { id: 'seq-uuid-123', ...row };
                  return Promise.resolve({ data: mockInsertedRow, error: null });
                }
              };
            }
          };
        }
      };
    }
  };
}

function reset() {
  mockInsertedRow = null;
  mockExistingSequence = null;
  mockInsertError = null;
}

// ===== TEST RUNNER =====
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
  console.log('║  Unit Tests: SequenceService                        ║');
  console.log('║  Task: 911b8227-b248-4290-92de-8b9c271f3dd2         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const svc = new SequenceService({ db: makeMockDB() });

  // ---- getInitialSendTime ----
  console.log('📋 getInitialSendTime:');

  await test('no_response is ~24h in future', () => {
    const ts = svc.getInitialSendTime('no_response');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 23 * 3600 * 1000 && ms <= 25 * 3600 * 1000, `Expected ~24h, got ${ms}ms`);
  });

  await test('post_viewing is ~4h in future', () => {
    const ts = svc.getInitialSendTime('post_viewing');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 3.9 * 3600 * 1000, `Expected ~4h, got ${ms}ms`);
  });

  await test('no_show is ~30m in future', () => {
    const ts = svc.getInitialSendTime('no_show');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 29 * 60 * 1000 && ms <= 31 * 60 * 1000, `Expected ~30m, got ${ms}ms`);
  });

  await test('nurture is ~7 days in future', () => {
    const ts = svc.getInitialSendTime('nurture');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 6.9 * 24 * 3600 * 1000, `Expected ~7d, got ${ms}ms`);
  });

  await test('unknown type falls back to no_response delay', () => {
    const ts = svc.getInitialSendTime('unknown_type');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 23 * 3600 * 1000, `Expected ~24h fallback, got ${ms}ms`);
  });

  // ---- createLeadSequence ----
  console.log('\n📋 createLeadSequence:');

  await test('creates no_response sequence successfully', async () => {
    reset();
    const seq = await svc.createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      trigger_reason: 'new_lead_no_response',
    });
    assert.ok(seq, 'Expected sequence to be created');
    assert.strictEqual(seq.sequence_type, 'no_response');
    assert.strictEqual(seq.status, 'active');
    assert.strictEqual(seq.step, 1);
    assert.strictEqual(seq.total_messages_sent, 0);
    assert.strictEqual(seq.max_messages, 3);
    assert.strictEqual(seq.trigger_reason, 'new_lead_no_response');
  });

  await test('creates post_viewing sequence successfully', async () => {
    reset();
    const seq = await svc.createLeadSequence({ lead_id: 'lead-uuid-002', sequence_type: 'post_viewing' });
    assert.ok(seq);
    assert.strictEqual(seq.sequence_type, 'post_viewing');
  });

  await test('creates no_show sequence successfully', async () => {
    reset();
    const seq = await svc.createLeadSequence({ lead_id: 'lead-uuid-003', sequence_type: 'no_show' });
    assert.ok(seq);
    assert.strictEqual(seq.sequence_type, 'no_show');
  });

  await test('returns null when lead_id is missing', async () => {
    reset();
    const seq = await svc.createLeadSequence({ sequence_type: 'no_response' });
    assert.strictEqual(seq, null);
  });

  await test('returns null for invalid sequence_type', async () => {
    reset();
    const seq = await svc.createLeadSequence({ lead_id: 'lead-uuid-001', sequence_type: 'bad_type' });
    assert.strictEqual(seq, null);
  });

  await test('returns null when active sequence already exists', async () => {
    reset();
    mockExistingSequence = { id: 'existing-seq', status: 'active' };
    const seq = await svc.createLeadSequence({ lead_id: 'lead-uuid-001', sequence_type: 'no_response' });
    assert.strictEqual(seq, null);
  });

  await test('uses provided next_send_at timestamp', async () => {
    reset();
    const customTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const seq = await svc.createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      next_send_at: customTime,
    });
    assert.ok(seq);
    assert.strictEqual(seq.next_send_at, customTime);
  });

  await test('returns null on DB insert error', async () => {
    reset();
    mockInsertError = { message: 'DB constraint violation' };
    const seq = await svc.createLeadSequence({ lead_id: 'lead-uuid-001', sequence_type: 'no_response' });
    assert.strictEqual(seq, null);
  });

  await test('stores metadata on sequence', async () => {
    reset();
    const meta = { fub_id: '12345', triggered_by: 'lead.created' };
    const seq = await svc.createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      metadata: meta,
    });
    assert.deepStrictEqual(seq.metadata, meta);
  });

  // ---- findLeadByFubId / findLeadByPhone ----
  console.log('\n📋 findLeadByFubId / findLeadByPhone:');

  await test('findLeadByFubId returns lead id', async () => {
    const id = await svc.findLeadByFubId('fub-123');
    assert.strictEqual(id, 'lead-uuid-001');
  });

  await test('findLeadByFubId returns null for falsy fubId', async () => {
    const id = await svc.findLeadByFubId(null);
    assert.strictEqual(id, null);
  });

  await test('findLeadByPhone returns lead id', async () => {
    const id = await svc.findLeadByPhone('+15551234567');
    assert.strictEqual(id, 'lead-uuid-001');
  });

  await test('findLeadByPhone returns null for falsy phone', async () => {
    const id = await svc.findLeadByPhone('');
    assert.strictEqual(id, null);
  });

  // ---- Module exports ----
  console.log('\n📋 Module exports:');

  await test('default export is SequenceService instance', () => {
    const instance = require('../../lib/services/SequenceService');
    assert.ok(instance instanceof SequenceService);
  });

  await test('SequenceService class is exported', () => {
    assert.strictEqual(typeof SequenceService, 'function');
    assert.ok(new SequenceService() instanceof SequenceService);
  });

  // ---- Shim backward compat ----
  console.log('\n📋 lib/sequence-service.js shim:');

  await test('shim exports createLeadSequence function', () => {
    const shim = require('../../lib/sequence-service');
    assert.strictEqual(typeof shim.createLeadSequence, 'function');
  });

  await test('shim exports findLeadByFubId function', () => {
    const shim = require('../../lib/sequence-service');
    assert.strictEqual(typeof shim.findLeadByFubId, 'function');
  });

  await test('shim exports findLeadByPhone function', () => {
    const shim = require('../../lib/sequence-service');
    assert.strictEqual(typeof shim.findLeadByPhone, 'function');
  });

  await test('shim exports hasActiveSequence function', () => {
    const shim = require('../../lib/sequence-service');
    assert.strictEqual(typeof shim.hasActiveSequence, 'function');
  });

  await test('shim exports getInitialSendTime function', () => {
    const shim = require('../../lib/sequence-service');
    assert.strictEqual(typeof shim.getInitialSendTime, 'function');
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
