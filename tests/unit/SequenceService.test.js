/**
 * Unit Tests: lib/services/SequenceService.js
 * Task: 911b8227-b248-4290-92de-8b9c271f3dd2
 */

'use strict';

const assert = require('assert');
const { SequenceService } = require('../../lib/services/SequenceService');

let mockInsertedRow = null;
let mockExistingSequence = null;
let mockInsertError = null;

function makeMockDB() {
  return {
    from() {
      return {
        select() {
          return {
            eq(col, val) {
              return {
                eq(col2, val2) {
                  return {
                    eq(col3, val3) {
                      return {
                        limit() {
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
                  if (mockInsertError) return Promise.resolve({ data: null, error: mockInsertError });
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

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  return Promise.resolve().then(() => fn())
    .then(() => { passed++; results.push({ name, passed: true }); console.log(`  \u2705 ${name}`); })
    .catch((err) => { failed++; results.push({ name, passed: false, error: err.message }); console.log(`  \u274c ${name}: ${err.message}`); });
}

async function runTests() {
  console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  Unit Tests: SequenceService                        \u2551');
  console.log('\u2551  Task: 911b8227-b248-4290-92de-8b9c271f3dd2         \u2551');
  console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n');

  const svc = new SequenceService({ db: makeMockDB() });

  console.log('\ud83d\udccb getInitialSendTime:');
  await test('no_response ~24h', () => { const ms = new Date(svc.getInitialSendTime('no_response')).getTime() - Date.now(); assert.ok(ms >= 23*3600000 && ms <= 25*3600000); });
  await test('post_viewing ~4h', () => { const ms = new Date(svc.getInitialSendTime('post_viewing')).getTime() - Date.now(); assert.ok(ms >= 3.9*3600000); });
  await test('no_show ~30m', () => { const ms = new Date(svc.getInitialSendTime('no_show')).getTime() - Date.now(); assert.ok(ms >= 29*60000 && ms <= 31*60000); });
  await test('nurture ~7d', () => { const ms = new Date(svc.getInitialSendTime('nurture')).getTime() - Date.now(); assert.ok(ms >= 6.9*24*3600000); });
  await test('unknown falls back to no_response', () => { const ms = new Date(svc.getInitialSendTime('x')).getTime() - Date.now(); assert.ok(ms >= 23*3600000); });

  console.log('\n\ud83d\udccb createLeadSequence:');
  await test('creates no_response sequence', async () => {
    reset();
    const seq = await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'no_response', trigger_reason: 'new_lead_no_response' });
    assert.ok(seq); assert.strictEqual(seq.sequence_type, 'no_response'); assert.strictEqual(seq.status, 'active');
    assert.strictEqual(seq.step, 1); assert.strictEqual(seq.max_messages, 3); assert.strictEqual(seq.trigger_reason, 'new_lead_no_response');
  });
  await test('creates post_viewing sequence', async () => { reset(); const seq = await svc.createLeadSequence({ lead_id: 'l2', sequence_type: 'post_viewing' }); assert.ok(seq); });
  await test('creates no_show sequence', async () => { reset(); const seq = await svc.createLeadSequence({ lead_id: 'l3', sequence_type: 'no_show' }); assert.ok(seq); });
  await test('returns null without lead_id', async () => { reset(); assert.strictEqual(await svc.createLeadSequence({ sequence_type: 'no_response' }), null); });
  await test('returns null for invalid type', async () => { reset(); assert.strictEqual(await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'bad' }), null); });
  await test('returns null on duplicate (duplicate guard)', async () => { reset(); mockExistingSequence = { id: 'x', status: 'active' }; assert.strictEqual(await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'no_response' }), null); });
  await test('uses provided next_send_at', async () => {
    reset();
    const t = new Date(Date.now() + 48*3600000).toISOString();
    const seq = await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'no_response', next_send_at: t });
    assert.strictEqual(seq.next_send_at, t);
  });
  await test('returns null on DB error', async () => { reset(); mockInsertError = { message: 'fail' }; assert.strictEqual(await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'no_response' }), null); });
  await test('stores metadata', async () => {
    reset();
    const meta = { fub_id: '1' };
    const seq = await svc.createLeadSequence({ lead_id: 'l1', sequence_type: 'no_response', metadata: meta });
    assert.deepStrictEqual(seq.metadata, meta);
  });

  console.log('\n\ud83d\udccb findLeadByFubId / findLeadByPhone:');
  await test('findLeadByFubId returns id', async () => { assert.strictEqual(await svc.findLeadByFubId('x'), 'lead-uuid-001'); });
  await test('findLeadByFubId returns null for null', async () => { assert.strictEqual(await svc.findLeadByFubId(null), null); });
  await test('findLeadByPhone returns id', async () => { assert.strictEqual(await svc.findLeadByPhone('+1'), 'lead-uuid-001'); });
  await test('findLeadByPhone returns null for empty', async () => { assert.strictEqual(await svc.findLeadByPhone(''), null); });

  console.log('\n\ud83d\udccb Module exports:');
  await test('default export is SequenceService instance', () => { assert.ok(require('../../lib/services/SequenceService') instanceof SequenceService); });
  await test('SequenceService class exported', () => { assert.strictEqual(typeof SequenceService, 'function'); });

  console.log('\n\ud83d\udccb Shim exports:');
  const shim = require('../../lib/sequence-service');
  await test('shim.createLeadSequence', () => { assert.strictEqual(typeof shim.createLeadSequence, 'function'); });
  await test('shim.findLeadByFubId', () => { assert.strictEqual(typeof shim.findLeadByFubId, 'function'); });
  await test('shim.findLeadByPhone', () => { assert.strictEqual(typeof shim.findLeadByPhone, 'function'); });
  await test('shim.hasActiveSequence', () => { assert.strictEqual(typeof shim.hasActiveSequence, 'function'); });
  await test('shim.getInitialSendTime', () => { assert.strictEqual(typeof shim.getInitialSendTime, 'function'); });

  const total = passed + failed;
  console.log(`\n  \u2705 Passed: ${passed}  \u274c Failed: ${failed}  \ud83d\udcc8 ${(passed/total*100).toFixed(0)}%\n`);
  return { passed, failed, total, passRate: passed/total, results };
}

module.exports = { runTests };
if (require.main === module) {
  runTests().then(r => process.exit(r.failed > 0 ? 1 : 0)).catch(err => { console.error(err); process.exit(1); });
}
