/**
 * Unit Tests: lib/sequence-service.js
 * Task: b54381ed-a14f-4887-9e23-7ab783d7ecb7
 * Bug: No automatic sequence creation on new lead / no-response
 */

'use strict';

const assert = require('assert');

// ===== MOCK SUPABASE =====
let mockInsertedRow = null;
let mockExistingSequence = null;
let mockLeadById = null;
let mockLeadByPhone = null;
let mockInsertError = null;

const mockSupabase = {
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
                        // hasActiveSequence check
                        return Promise.resolve({ data: mockExistingSequence ? [mockExistingSequence] : [], error: null });
                      }
                    };
                  }
                };
              },
              single() {
                // findLeadByFubId / findLeadByPhone
                if (col === 'fub_id' || col === 'phone') {
                  return Promise.resolve({ data: mockLeadById || mockLeadByPhone, error: null });
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

// Inject mock before requiring the module
process.env.SUPABASE_URL = 'http://mock';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

// Patch createClient
const { createClient: origCreateClient } = require('@supabase/supabase-js');
const supabaseModule = require('@supabase/supabase-js');
const origCreate = supabaseModule.createClient;
supabaseModule.createClient = () => mockSupabase;

// Clear module cache so sequence-service picks up our mock
delete require.cache[require.resolve('../../lib/sequence-service')];
const {
  createLeadSequence,
  findLeadByFubId,
  findLeadByPhone,
  hasActiveSequence,
  getInitialSendTime,
} = require('../../lib/sequence-service');

// Restore
supabaseModule.createClient = origCreate;

// ===== TESTS =====

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        passed++;
        results.push({ name, passed: true });
        console.log(`  ✅ ${name}`);
      }).catch(err => {
        failed++;
        results.push({ name, passed: false, error: err.message });
        console.log(`  ❌ ${name}: ${err.message}`);
      });
    } else {
      passed++;
      results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    }
  } catch (err) {
    failed++;
    results.push({ name, passed: false, error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
  return Promise.resolve();
}

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  Unit Tests: sequence-service.js                    ║');
  console.log('║  Task: b54381ed-a14f-4887-9e23-7ab783d7ecb7         ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Reset state before each group
  function reset() {
    mockInsertedRow = null;
    mockExistingSequence = null;
    mockLeadById = null;
    mockLeadByPhone = null;
    mockInsertError = null;
  }

  // ---- getInitialSendTime ----
  console.log('📋 getInitialSendTime:');
  await test('no_response is ~24h in future', () => {
    const before = Date.now();
    const ts = getInitialSendTime('no_response');
    const after = Date.now();
    const ms = new Date(ts).getTime() - before;
    assert.ok(ms >= 23 * 3600 * 1000 && ms <= 25 * 3600 * 1000, `Expected ~24h, got ${ms}ms`);
  });

  await test('post_viewing is ~4h in future', () => {
    const ts = getInitialSendTime('post_viewing');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 3.9 * 3600 * 1000, `Expected ~4h, got ${ms}ms`);
  });

  await test('no_show is ~30m in future', () => {
    const ts = getInitialSendTime('no_show');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 29 * 60 * 1000 && ms <= 31 * 60 * 1000, `Expected ~30m, got ${ms}ms`);
  });

  await test('nurture is ~7 days in future', () => {
    const ts = getInitialSendTime('nurture');
    const ms = new Date(ts).getTime() - Date.now();
    assert.ok(ms >= 6.9 * 24 * 3600 * 1000, `Expected ~7d, got ${ms}ms`);
  });

  // ---- createLeadSequence ----
  console.log('\n📋 createLeadSequence:');

  await test('creates no_response sequence successfully', async () => {
    reset();
    mockLeadById = { id: 'lead-uuid-001' };
    const seq = await createLeadSequence({
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
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-002',
      sequence_type: 'post_viewing',
      trigger_reason: 'booking_confirmed',
    });
    assert.ok(seq, 'Expected sequence to be created');
    assert.strictEqual(seq.sequence_type, 'post_viewing');
  });

  await test('creates no_show sequence successfully', async () => {
    reset();
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-003',
      sequence_type: 'no_show',
      trigger_reason: 'missed_appointment',
    });
    assert.ok(seq, 'Expected sequence to be created');
    assert.strictEqual(seq.sequence_type, 'no_show');
  });

  await test('returns null when lead_id is missing', async () => {
    reset();
    const seq = await createLeadSequence({ sequence_type: 'no_response' });
    assert.strictEqual(seq, null, 'Should return null without lead_id');
  });

  await test('returns null for invalid sequence_type', async () => {
    reset();
    const seq = await createLeadSequence({ lead_id: 'lead-uuid-001', sequence_type: 'invalid_type' });
    assert.strictEqual(seq, null, 'Should return null for invalid type');
  });

  await test('returns null when active sequence already exists (duplicate guard)', async () => {
    reset();
    mockExistingSequence = { id: 'existing-seq-id', status: 'active' };
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      trigger_reason: 'new_lead_no_response',
    });
    assert.strictEqual(seq, null, 'Should not create duplicate active sequence');
  });

  await test('uses provided next_send_at timestamp', async () => {
    reset();
    const customTime = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      next_send_at: customTime,
    });
    assert.ok(seq, 'Expected sequence');
    assert.strictEqual(seq.next_send_at, customTime);
  });

  await test('returns null on Supabase insert error', async () => {
    reset();
    mockInsertError = { message: 'DB constraint violation' };
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
    });
    assert.strictEqual(seq, null, 'Should return null on DB error');
  });

  await test('stores metadata on sequence', async () => {
    reset();
    const meta = { fub_id: '12345', triggered_by: 'lead.created' };
    const seq = await createLeadSequence({
      lead_id: 'lead-uuid-001',
      sequence_type: 'no_response',
      metadata: meta,
    });
    assert.deepStrictEqual(seq.metadata, meta);
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

// Run directly if called as script
if (require.main === module) {
  runTests().then(r => {
    process.exit(r.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}
