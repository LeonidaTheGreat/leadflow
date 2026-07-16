'use strict';

/**
 * Integration tests: UC-8 Lead Sequence Enrollment
 * Task: 6f0eb91e-5004-40c5-a703-755994a8ff31
 *
 * Verifies:
 *  1. FUB webhook triggers lead_sequences INSERT even when SMS sending fails
 *  2. Phone-based fallback enrolls lead when fub_id lookup returns null
 *  3. Enrollment is skipped for DNC and SMS opt-out leads
 *  4. Backfill SQL structure is idempotent and excludes dnc/spam/closed leads
 */

const assert = require('assert');
const path = require('path');
const FUBService = require(path.join(__dirname, '../../lib/services/FUBService'));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

// ── Shared mock factory ────────────────────────────────────────────────────────

function makeService(overrides = {}) {
  const createdSequences = [];

  // Instance-method overrides are applied after construction (not passed to constructor).
  // Extract them so they don't get silently ignored by the constructor.
  const {
    fetchLeadFromFub: fetchOverride,
    checkDncStatus: dncOverride,
    generateAiSmsResponse: aiOverride,
    logSmsInFub: logOverride,
    ...constructorOptions
  } = overrides;

  const defaults = {
    registerEventHandlers: false,
    logger: { log() {}, info() {}, warn() {}, error() {} },
    sendSmsViatwilio: async () => ({ sid: 'SM-test', status: 'queued' }),
    scheduleSatisfactionPing: () => {},
    createLeadSequence: async (params) => { createdSequences.push(params); return params; },
    findLeadByFubId: async () => 'internal-uuid-from-fub',
    findLeadByPhone: async () => null,
  };

  const svc = new FUBService({ ...defaults, ...constructorOptions });

  svc.fetchLeadFromFub = fetchOverride || (async (id) => ({
    id,
    firstName: 'Test',
    phoneNumber: '+14165550001',
    consents: { sms: true },
    assignedTo: { id: 'agent-1' },
    satisfactionPingEnabled: true,
  }));
  svc.checkDncStatus = dncOverride || (async () => false);
  svc.generateAiSmsResponse = aiOverride || (async () => ({ message: 'Hi!', trigger: 'initial_response' }));
  svc.logSmsInFub = logOverride || (async () => {});

  return { svc, createdSequences };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Integration: UC-8 Lead Sequence Enrollment              ║');
  console.log('║  Task: 6f0eb91e-5004-40c5-a703-755994a8ff31              ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Happy path: enrollment fires after successful SMS
  await test('creates no_response sequence on FUB lead.created (happy path)', async () => {
    const { svc, createdSequences } = makeService();
    await svc.handleLeadCreated({ id: 'fub-1', phoneNumber: '+14165550001' });
    assert.strictEqual(createdSequences.length, 1);
    assert.strictEqual(createdSequences[0].sequence_type, 'no_response');
    assert.strictEqual(createdSequences[0].trigger_reason, 'new_lead_no_response');
    assert.strictEqual(createdSequences[0].lead_id, 'internal-uuid-from-fub');
  });

  // 2. Enrollment fires even when SMS send throws
  await test('creates sequence even when sendSmsViatwilio throws', async () => {
    const { svc, createdSequences } = makeService({
      sendSmsViatwilio: async () => { throw new Error('Twilio unavailable'); },
    });
    await svc.handleLeadCreated({ id: 'fub-2', phoneNumber: '+14165550002' });
    assert.strictEqual(createdSequences.length, 1, 'Sequence must be created despite SMS failure');
    assert.strictEqual(createdSequences[0].sequence_type, 'no_response');
  });

  // 3. Enrollment fires even when fetchLeadFromFub throws (no FUB API key)
  await test('creates sequence even when fetchLeadFromFub throws', async () => {
    const { svc, createdSequences } = makeService({
      findLeadByFubId: async (id) => id === 'fub-3' ? 'internal-uuid-3' : null,
    });
    svc.fetchLeadFromFub = async () => { throw new Error('FUB_API_KEY not set'); };
    await svc.handleLeadCreated({ id: 'fub-3', phoneNumber: '+14165550003' });
    assert.strictEqual(createdSequences.length, 1, 'Sequence must be created when FUB API fails');
    assert.strictEqual(createdSequences[0].lead_id, 'internal-uuid-3');
  });

  // 4. Phone fallback: fub_id lookup returns null, phone lookup finds lead
  await test('falls back to phone lookup when fub_id not in local DB', async () => {
    const { svc, createdSequences } = makeService({
      findLeadByFubId: async () => null,
      findLeadByPhone: async () => 'phone-resolved-uuid',
    });
    await svc.handleLeadCreated({ id: 'fub-4', phoneNumber: '+14165550004' });
    assert.strictEqual(createdSequences.length, 1, 'Sequence must be created via phone fallback');
    assert.strictEqual(createdSequences[0].lead_id, 'phone-resolved-uuid');
  });

  // 5. No enrollment when both fub_id and phone lookups return null
  await test('does NOT create sequence when lead is not found in DB by any method', async () => {
    const { svc, createdSequences } = makeService({
      findLeadByFubId: async () => null,
      findLeadByPhone: async () => null,
    });
    await svc.handleLeadCreated({ id: 'fub-5', phoneNumber: '+14165550005' });
    assert.strictEqual(createdSequences.length, 0, 'No sequence when lead not in DB');
  });

  // 6. No enrollment when lead has no phone number
  await test('skips enrollment when lead has no phone number', async () => {
    const { svc, createdSequences } = makeService();
    await svc.handleLeadCreated({ id: 'fub-6', phoneNumber: null });
    assert.strictEqual(createdSequences.length, 0, 'No sequence for leads without phone');
  });

  // 7. No enrollment for SMS opt-out leads
  await test('skips enrollment when lead has opted out of SMS', async () => {
    const { svc, createdSequences } = makeService();
    svc.fetchLeadFromFub = async (id) => ({
      id,
      firstName: 'Optout',
      phoneNumber: '+14165550007',
      consents: { sms: false },
    });
    await svc.handleLeadCreated({ id: 'fub-7', phoneNumber: '+14165550007' });
    assert.strictEqual(createdSequences.length, 0, 'No sequence for SMS opt-outs');
  });

  // 8. No enrollment for DNC leads
  await test('skips enrollment for DNC leads', async () => {
    const { svc, createdSequences } = makeService({
      checkDncStatus: async () => true,
    });
    await svc.handleLeadCreated({ id: 'fub-8', phoneNumber: '+14165550008' });
    assert.strictEqual(createdSequences.length, 0, 'No sequence for DNC leads');
  });

  // 9. Backfill SQL file existence check
  await test('backfill migration SQL file exists', () => {
    const fs = require('fs');
    const sqlPath = path.join(__dirname, '../../migrations/024_backfill_lead_sequences.sql');
    assert.ok(fs.existsSync(sqlPath), 'migrations/024_backfill_lead_sequences.sql must exist');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    assert.ok(sql.includes('INSERT INTO lead_sequences'), 'SQL must INSERT into lead_sequences');
    assert.ok(sql.includes('NOT EXISTS'), 'SQL must use NOT EXISTS guard for idempotency');
    assert.ok(sql.includes("NOT IN ('dnc', 'spam', 'closed')"), 'SQL must exclude dnc/spam/closed leads');
    assert.ok(sql.includes("'no_response'"), "SQL must set sequence_type='no_response'");
    assert.ok(sql.includes("INTERVAL '24 hours'"), 'SQL must set next_send_at to 24h from now');
  });

  // 10. Backfill JS runner exports run()
  await test('backfill script exports run()', () => {
    const backfillMod = require(path.join(__dirname, '../../scripts/db/backfill-lead-sequences'));
    assert.strictEqual(typeof backfillMod.run, 'function', 'backfill-lead-sequences must export run()');
  });

  // 11. handleLeadCreated stores fub_id in sequence metadata
  await test('sequence metadata includes fub_id and triggered_by', async () => {
    const { svc, createdSequences } = makeService();
    await svc.handleLeadCreated({ id: 'fub-11', phoneNumber: '+14165550011' });
    assert.strictEqual(createdSequences.length, 1);
    assert.ok(createdSequences[0].metadata, 'metadata must be set');
    assert.strictEqual(createdSequences[0].metadata.triggered_by, 'lead.created');
    assert.ok(createdSequences[0].metadata.fub_id, 'fub_id must be in metadata');
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                       SUMMARY                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  const rate = (passed + failed) > 0 ? passed / (passed + failed) : 1;
  console.log(`  📈 Pass rate: ${(rate * 100).toFixed(0)}%\n`);

  return { passed, failed, total: passed + failed, passRate: rate };
}

module.exports = { runTests };

if (require.main === module) {
  runTests().then((r) => {
    process.exit(r.failed > 0 ? 1 : 0);
  }).catch((err) => {
    console.error('Test runner error:', err);
    process.exit(1);
  });
}
