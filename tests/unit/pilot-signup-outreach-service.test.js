'use strict';

const assert = require('assert');
const PilotSignupOutreachService = require('../../lib/services/PilotSignupOutreachService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL: ${name}: ${error.message}`);
    failed++;
  }
}

function makePool(queue) {
  const calls = [];
  return {
    calls,
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      const next = queue.shift() || { rows: [] };
      if (next.error) throw new Error(next.error);
      return { rows: next.rows || [] };
    },
  };
}

function makeEmailService(result = { success: true, id: 're_1' }) {
  const sends = [];
  return {
    sends,
    fromEmail: 'test@leadflow.ai',
    send: async (payload) => {
      sends.push(payload);
      return result;
    },
  };
}

async function run() {
  console.log('\n=== unit: PilotSignupOutreachService staged flow ===\n');

  await check('getPendingSignups queries follow_up_stage < 3', async () => {
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool });
    await svc.getPendingSignups();
    assert(pool.calls[0].sql.includes('COALESCE(follow_up_stage, 0) < $1'));
    assert.strictEqual(pool.calls[0].params[0], 3);
  });

  await check('stage 0 becomes step 1 after 24h', async () => {
    const svc = new PilotSignupOutreachService({});
    const now = new Date('2026-05-14T12:00:00.000Z');
    const step = svc.getNextEligibleStep({ follow_up_stage: 0, created_at: '2026-05-13T11:00:00.000Z' }, now);
    assert.strictEqual(step, 1);
  });

  await check('stage 1 becomes step 2 only after 3 days since last follow-up', async () => {
    const svc = new PilotSignupOutreachService({});
    const now = new Date('2026-05-14T12:00:00.000Z');
    const due = svc.getNextEligibleStep({ follow_up_stage: 1, last_follow_up_at: '2026-05-11T11:00:00.000Z' }, now);
    const notDue = svc.getNextEligibleStep({ follow_up_stage: 1, last_follow_up_at: '2026-05-12T13:00:00.000Z' }, now);
    assert.strictEqual(due, 2);
    assert.strictEqual(notDue, null);
  });

  await check('stage 2 becomes step 3 only after 4 days since last follow-up', async () => {
    const svc = new PilotSignupOutreachService({});
    const now = new Date('2026-05-14T12:00:00.000Z');
    const due = svc.getNextEligibleStep({ follow_up_stage: 2, last_follow_up_at: '2026-05-10T11:00:00.000Z' }, now);
    const notDue = svc.getNextEligibleStep({ follow_up_stage: 2, last_follow_up_at: '2026-05-11T13:00:00.000Z' }, now);
    assert.strictEqual(due, 3);
    assert.strictEqual(notDue, null);
  });

  await check('runSequence marks converted signup as completed stage 3', async () => {
    const pool = makePool([
      { rows: [{ id: 's1', email: 'a@test.com', name: 'A', created_at: '2026-05-01T00:00:00.000Z', follow_up_stage: 0, last_follow_up_at: null }] },
      { rows: [{ '?column?': 1 }] },
      { rows: [] },
    ]);
    const svc = new PilotSignupOutreachService({ pool, emailService: makeEmailService() });
    const result = await svc.runSequence(new Date('2026-05-14T12:00:00.000Z'));
    assert.strictEqual(result.converted, 1);
    assert.strictEqual(result.sent, 0);
    assert(pool.calls[2].sql.includes('follow_up_stage = $1'));
    assert.strictEqual(pool.calls[2].params[0], 3);
  });

  await check('runSequence sends due step and advances stage', async () => {
    const pool = makePool([
      { rows: [{ id: 's1', email: 'b@test.com', name: 'Bee Agent', created_at: '2026-05-01T00:00:00.000Z', follow_up_stage: 2, last_follow_up_at: '2026-05-09T00:00:00.000Z' }] },
      { rows: [] },
      { rows: [] },
      { rows: [] },
    ]);
    const email = makeEmailService({ success: true, id: 're_ok' });
    const svc = new PilotSignupOutreachService({ pool, emailService: email });
    const result = await svc.runSequence(new Date('2026-05-14T12:00:00.000Z'));

    assert.strictEqual(result.sent, 1);
    assert.strictEqual(email.sends.length, 1);
    assert.strictEqual(email.sends[0].subject, 'Last chance — pilot spots filling up');
    assert(pool.calls[2].sql.includes('INSERT INTO pilot_email_log'));
    assert(pool.calls[3].sql.includes('last_follow_up_at'));
    assert.strictEqual(pool.calls[3].params[0], 3);
  });

  await check('runSequence does not advance stage when send fails', async () => {
    const pool = makePool([
      { rows: [{ id: 's1', email: 'c@test.com', name: 'C', created_at: '2026-05-01T00:00:00.000Z', follow_up_stage: 1, last_follow_up_at: '2026-05-09T00:00:00.000Z' }] },
      { rows: [] },
      { rows: [] },
    ]);
    const email = makeEmailService({ success: false, error: 'provider_down' });
    const svc = new PilotSignupOutreachService({ pool, emailService: email });
    const result = await svc.runSequence(new Date('2026-05-14T12:00:00.000Z'));

    assert.strictEqual(result.errors, 1);
    assert.strictEqual(pool.calls.length, 3);
    assert(pool.calls[2].sql.includes('INSERT INTO pilot_email_log'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
