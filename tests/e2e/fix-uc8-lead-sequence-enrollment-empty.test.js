'use strict';

/**
 * QC E2E Test: UC-8 Lead Sequence Enrollment Fix
 * PR #1880 — FUBService enroll-on-webhook + phone fallback + backfill
 *
 * Verifies:
 *  1. Sequence enrollment fires even when SMS sending fails
 *  2. Sequence enrollment fires even when FUB API (fetchLeadFromFub) fails
 *  3. Phone-based fallback enrolls lead when fub_id not in local DB
 *  4. DNC leads are NOT enrolled (guard preserved)
 *  5. SMS opt-out leads are NOT enrolled (guard preserved)
 *  6. Leads without phone number are fully skipped (early return preserved)
 *  7. Backfill migration SQL is idempotent and excludes dnc/spam/closed leads
 *  8. findLeadByPhone is wired as a constructor-injected dependency
 */

const assert = require('assert');
const path = require('path');

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeService(opts = {}) {
  const FUBService = require(path.join(__dirname, '../../lib/services/FUBService'));
  const enrolled = [];

  const {
    fetchLeadFromFub: fetchOverride,
    checkDncStatus: dncOverride,
    generateAiSmsResponse: aiOverride,
    sendSmsViatwilio: smsOverride,
    findLeadByFubId: fubLookup,
    findLeadByPhone: phoneLookup,
    ...rest
  } = opts;

  const svc = new FUBService({
    registerEventHandlers: false,
    logger: { log() {}, info() {}, warn() {}, error() {} },
    createLeadSequence: async (p) => { enrolled.push(p); return p; },
    scheduleSatisfactionPing: () => {},
    sendSmsViatwilio: smsOverride || (async () => ({ sid: 'SM-qc', status: 'queued' })),
    findLeadByFubId: fubLookup !== undefined ? fubLookup : async () => 'db-uuid-from-fub',
    findLeadByPhone: phoneLookup !== undefined ? phoneLookup : async () => null,
    ...rest,
  });

  svc.fetchLeadFromFub = fetchOverride || (async (id) => ({
    id,
    firstName: 'QC',
    phoneNumber: '+14165559999',
    consents: { sms: true },
    assignedTo: { id: 'agent-qc' },
    satisfactionPingEnabled: true,
  }));
  svc.checkDncStatus = dncOverride || (async () => false);
  svc.generateAiSmsResponse = aiOverride || (async () => ({ message: 'Hi!', trigger: 'initial_response' }));
  svc.logSmsInFub = async () => {};

  return { svc, enrolled };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  QC E2E: UC-8 Lead Sequence Enrollment (PR #1880)          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. Core fix: SMS failure must not block enrollment
  await test('sequence enrolled even when Twilio throws', async () => {
    const { svc, enrolled } = makeService({
      sendSmsViatwilio: async () => { throw new Error('Twilio 503'); },
    });
    await svc.handleLeadCreated({ id: 'fub-q1', phoneNumber: '+14165550001' });
    assert.strictEqual(enrolled.length, 1, 'Must enroll despite SMS failure');
    assert.strictEqual(enrolled[0].sequence_type, 'no_response');
    assert.strictEqual(enrolled[0].trigger_reason, 'new_lead_no_response');
  });

  // 2. FUB API failure must not block enrollment
  await test('sequence enrolled even when fetchLeadFromFub throws', async () => {
    const { svc, enrolled } = makeService({
      findLeadByFubId: async (id) => id === 'fub-q2' ? 'db-q2' : null,
    });
    svc.fetchLeadFromFub = async () => { throw new Error('FUB_API_KEY not set'); };
    await svc.handleLeadCreated({ id: 'fub-q2', phoneNumber: '+14165550002' });
    assert.strictEqual(enrolled.length, 1, 'Must enroll despite FUB API failure');
    assert.strictEqual(enrolled[0].lead_id, 'db-q2');
  });

  // 3. Phone fallback when fub_id lookup returns null
  await test('phone fallback used when fub_id not in local DB', async () => {
    const { svc, enrolled } = makeService({
      findLeadByFubId: async () => null,
      findLeadByPhone: async () => 'phone-uuid-q3',
    });
    await svc.handleLeadCreated({ id: 'fub-q3', phoneNumber: '+14165550003' });
    assert.strictEqual(enrolled.length, 1, 'Must enroll via phone fallback');
    assert.strictEqual(enrolled[0].lead_id, 'phone-uuid-q3');
  });

  // 4. Both lookups miss → no enrollment (no silent failure)
  await test('no enrollment when lead not in DB by any method', async () => {
    const { svc, enrolled } = makeService({
      findLeadByFubId: async () => null,
      findLeadByPhone: async () => null,
    });
    await svc.handleLeadCreated({ id: 'fub-q4', phoneNumber: '+14165550004' });
    assert.strictEqual(enrolled.length, 0, 'Must not enroll unresolvable lead');
  });

  // 5. DNC guard preserved (no enrollment for DNC leads)
  await test('DNC leads are NOT enrolled in sequences', async () => {
    const { svc, enrolled } = makeService({
      checkDncStatus: async () => true,
    });
    await svc.handleLeadCreated({ id: 'fub-q5', phoneNumber: '+14165550005' });
    assert.strictEqual(enrolled.length, 0, 'DNC leads must not be enrolled');
  });

  // 6. SMS opt-out guard preserved
  await test('SMS opt-out leads are NOT enrolled in sequences', async () => {
    const { svc, enrolled } = makeService();
    svc.fetchLeadFromFub = async (id) => ({
      id, firstName: 'Optout', phoneNumber: '+14165550006', consents: { sms: false },
    });
    await svc.handleLeadCreated({ id: 'fub-q6', phoneNumber: '+14165550006' });
    assert.strictEqual(enrolled.length, 0, 'Opt-out leads must not be enrolled');
  });

  // 7. No phone number → entire flow skipped (early return)
  await test('leads without phone number are fully skipped', async () => {
    const { svc, enrolled } = makeService();
    await svc.handleLeadCreated({ id: 'fub-q7', phoneNumber: null });
    assert.strictEqual(enrolled.length, 0, 'Phoneless leads must be fully skipped');
  });

  // 8. Sequence metadata includes fub_id and triggered_by
  await test('sequence metadata contains fub_id and triggered_by', async () => {
    const { svc, enrolled } = makeService();
    await svc.handleLeadCreated({ id: 'fub-q8', phoneNumber: '+14165550008' });
    assert.ok(enrolled[0]?.metadata?.fub_id, 'fub_id must be in metadata');
    assert.strictEqual(enrolled[0].metadata.triggered_by, 'lead.created');
  });

  // 9. findLeadByPhone is wired as constructor-injected dep
  await test('findLeadByPhone is injected via constructor options', async () => {
    const FUBService = require(path.join(__dirname, '../../lib/services/FUBService'));
    const customPhone = async () => 'injected-phone-uuid';
    const svc = new FUBService({
      registerEventHandlers: false,
      logger: { log() {}, info() {}, warn() {}, error() {} },
      createLeadSequence: async (p) => p,
      scheduleSatisfactionPing: () => {},
      sendSmsViatwilio: async () => ({ sid: 'SM-test', status: 'queued' }),
      findLeadByFubId: async () => null,
      findLeadByPhone: customPhone,
    });
    assert.strictEqual(svc.findLeadByPhone, customPhone, 'findLeadByPhone must be assignable via constructor');
  });

  // 10. Backfill SQL idempotency and correctness
  await test('backfill SQL excludes dnc/spam/closed leads and uses NOT EXISTS guard', () => {
    const fs = require('fs');
    const sqlPath = path.join(__dirname, '../../migrations/024_backfill_lead_sequences.sql');
    assert.ok(fs.existsSync(sqlPath), 'backfill migration file must exist');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    assert.ok(sql.includes('INSERT INTO lead_sequences'), 'must INSERT into lead_sequences');
    assert.ok(sql.includes('NOT EXISTS'), 'must use NOT EXISTS guard for idempotency');
    assert.ok(sql.includes("NOT IN ('dnc', 'spam', 'closed')"), 'must exclude dnc/spam/closed');
    assert.ok(sql.includes("'no_response'"), "must set sequence_type='no_response'");
    assert.ok(sql.includes("'backfill_uc8_fix'"), 'must identify trigger_reason as backfill');
  });

  // 11. Backfill script exports run() and supports dry-run
  await test('backfill script exports run() function', () => {
    const mod = require(path.join(__dirname, '../../scripts/db/backfill-lead-sequences'));
    assert.strictEqual(typeof mod.run, 'function', 'must export run()');
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  const total = passed + failed;
  const rate = total > 0 ? passed / total : 1;
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                       SUMMARY                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Pass rate: ${(rate * 100).toFixed(0)}%\n`);

  return { passed, failed, total, passRate: rate };
}

module.exports = { run };

if (require.main === module) {
  run().then((r) => process.exit(r.failed > 0 ? 1 : 0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
