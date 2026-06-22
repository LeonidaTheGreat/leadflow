'use strict';

const assert = require('assert');
const PilotPhonelessReactivationService = require('../../lib/services/PilotPhonelessReactivationService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

function makePool(rowsOrSequence) {
  let callIdx = 0;
  const queries = [];
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      const result = Array.isArray(rowsOrSequence)
        ? rowsOrSequence[callIdx++]
        : rowsOrSequence;
      if (result && result.throws) throw new Error(result.throws);
      return { rows: (result && result.rows) || [] };
    },
  };
}

function makeEmailService(sendResult) {
  const sends = [];
  return {
    sends,
    fromEmail: 'stojan@landyourleads.com',
    send: async (params) => {
      sends.push(params);
      return sendResult || { success: true, resend_id: 'mock_resend_123' };
    },
  };
}

const SAMPLE_SIGNUP = {
  id: 'uuid-123',
  email: 'agent@example.com',
  name: 'Jane Smith',
  first_name: 'Jane',
  created_at: '2026-01-01T00:00:00Z',
  status: 'nurture',
};

async function run() {
  console.log('\n=== unit: PilotPhonelessReactivationService ===\n');

  // ── Constructor ───────────────────────────────────────────────────────────

  await check('constructor: default URLs', async () => {
    const svc = new PilotPhonelessReactivationService({});
    assert.ok(svc.bookingUrl.includes('cal.com'));
    assert.ok(svc.signupUrl.includes('signup'));
  });

  await check('constructor: accepts custom URLs', async () => {
    const svc = new PilotPhonelessReactivationService({
      bookingUrl: 'https://cal.test/book',
      signupUrl: 'https://app.test/signup',
    });
    assert.strictEqual(svc.bookingUrl, 'https://cal.test/book');
    assert.strictEqual(svc.signupUrl, 'https://app.test/signup');
  });

  // ── countEligible ─────────────────────────────────────────────────────────

  await check('countEligible: returns count from DB', async () => {
    const pool = makePool({ rows: [{ count: 21 }] });
    const svc = new PilotPhonelessReactivationService({ pool });
    const count = await svc.countEligible();
    assert.strictEqual(count, 21);
    assert.ok(pool.queries[0].sql.includes('phone IS NULL'));
    assert.strictEqual(pool.queries[0].params[0], PilotPhonelessReactivationService.EMAIL_TYPE);
  });

  await check('countEligible: throws without pool', async () => {
    const svc = new PilotPhonelessReactivationService({});
    await assert.rejects(() => svc.countEligible(), /DB pool not configured/);
  });

  // ── getEligible ───────────────────────────────────────────────────────────

  await check('getEligible: queries with correct params', async () => {
    const pool = makePool({ rows: [SAMPLE_SIGNUP] });
    const svc = new PilotPhonelessReactivationService({ pool });
    const rows = await svc.getEligible(50);
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(pool.queries[0].params[1], 50);
  });

  await check('getEligible: clamps limit to MAX_LIMIT', async () => {
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool });
    await svc.getEligible(9999);
    assert.strictEqual(pool.queries[0].params[1], PilotPhonelessReactivationService.MAX_LIMIT);
  });

  // ── sendReactivationEmail ─────────────────────────────────────────────────

  await check('sendReactivationEmail: calls emailService.send with correct params', async () => {
    const emailSvc = makeEmailService({ success: true, resend_id: 'resend_abc' });
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    const result = await svc.sendReactivationEmail(SAMPLE_SIGNUP);

    assert.strictEqual(result.success, true);
    assert.strictEqual(emailSvc.sends.length, 1);
    const call = emailSvc.sends[0];
    assert.strictEqual(call.to, SAMPLE_SIGNUP.email);
    assert.ok(call.subject.includes('Jane'));
    assert.ok(call.html.includes('Jane'));
    assert.ok(call.html.includes('cal.com'));
    assert.ok(call.html.includes('signup'));
    assert.ok(call.tags.some(t => t.value === 'pilot-phoneless-reactivation'));
  });

  await check('sendReactivationEmail: logs success to pilot_email_log', async () => {
    const emailSvc = makeEmailService({ success: true, resend_id: 'resend_abc' });
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    await svc.sendReactivationEmail(SAMPLE_SIGNUP);

    const logQuery = pool.queries.find(q => q.sql.includes('INSERT INTO pilot_email_log'));
    assert.ok(logQuery, 'Should have inserted into pilot_email_log');
    assert.strictEqual(logQuery.params[0], SAMPLE_SIGNUP.id);
    assert.strictEqual(logQuery.params[1], PilotPhonelessReactivationService.EMAIL_TYPE);
    assert.strictEqual(logQuery.params[4], 'sent');
    assert.strictEqual(logQuery.params[5], 'resend_abc');
  });

  await check('sendReactivationEmail: logs failure to pilot_email_log', async () => {
    const emailSvc = makeEmailService({ success: false, error: 'RESEND_ERROR' });
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    const result = await svc.sendReactivationEmail(SAMPLE_SIGNUP);

    assert.strictEqual(result.success, false);
    const logQuery = pool.queries.find(q => q.sql.includes('INSERT INTO pilot_email_log'));
    assert.ok(logQuery);
    assert.strictEqual(logQuery.params[4], 'failed');
    assert.strictEqual(logQuery.params[6], 'RESEND_ERROR');
  });

  await check('sendReactivationEmail: falls back to name when first_name absent', async () => {
    const emailSvc = makeEmailService({ success: true });
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });
    const signup = { ...SAMPLE_SIGNUP, first_name: null, name: 'Bob Jones' };
    await svc.sendReactivationEmail(signup);
    assert.ok(emailSvc.sends[0].subject.includes('Bob'));
  });

  await check('sendReactivationEmail: uses "there" when name is absent', async () => {
    const emailSvc = makeEmailService({ success: true });
    const pool = makePool({ rows: [] });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });
    const signup = { ...SAMPLE_SIGNUP, first_name: null, name: null };
    await svc.sendReactivationEmail(signup);
    assert.ok(emailSvc.sends[0].subject.includes('there'));
  });

  // ── runCampaign (dryRun) ──────────────────────────────────────────────────

  await check('runCampaign dryRun: returns eligible count and signup list without sending', async () => {
    const pool = makePool([
      { rows: [{ count: 21 }] },
      { rows: [SAMPLE_SIGNUP] },
    ]);
    const emailSvc = makeEmailService({ success: true });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    const result = await svc.runCampaign({ dryRun: true, limit: 50 });

    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.eligible, 21);
    assert.strictEqual(result.signups.length, 1);
    assert.strictEqual(emailSvc.sends.length, 0);
  });

  // ── runCampaign (live) ────────────────────────────────────────────────────

  await check('runCampaign live: sends emails and counts results', async () => {
    const signups = [
      { ...SAMPLE_SIGNUP, id: 'uuid-1', email: 'a@example.com' },
      { ...SAMPLE_SIGNUP, id: 'uuid-2', email: 'b@example.com' },
    ];
    const pool = makePool([
      { rows: [{ count: 2 }] },
      { rows: signups },
      { rows: [] },
      { rows: [] },
    ]);
    const emailSvc = makeEmailService({ success: true, resend_id: 'rid' });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    const result = await svc.runCampaign({ dryRun: false, limit: 10 });

    assert.strictEqual(result.sent, 2);
    assert.strictEqual(result.failed, 0);
    assert.strictEqual(emailSvc.sends.length, 2);
  });

  await check('runCampaign live: tracks failed sends', async () => {
    const pool = makePool([
      { rows: [{ count: 1 }] },
      { rows: [SAMPLE_SIGNUP] },
      { rows: [] },
    ]);
    const emailSvc = makeEmailService({ success: false, error: 'API_DOWN' });
    const svc = new PilotPhonelessReactivationService({ pool, emailService: emailSvc });

    const result = await svc.runCampaign({ dryRun: false });

    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.failed, 1);
    assert.strictEqual(result.failedList[0].error, 'API_DOWN');
  });

  await check('runCampaign: throws without pool', async () => {
    const svc = new PilotPhonelessReactivationService({});
    await assert.rejects(() => svc.runCampaign({ dryRun: true }), /DB pool not configured/);
  });

  // ── HTML email content ────────────────────────────────────────────────────

  await check('email HTML: contains booking URL and signup URL', async () => {
    const svc = new PilotPhonelessReactivationService({
      bookingUrl: 'https://cal.custom/book',
      signupUrl: 'https://app.custom/signup',
    });
    const { html } = svc._buildEmail('Sam');
    assert.ok(html.includes('https://cal.custom/book'));
    assert.ok(html.includes('https://app.custom/signup'));
  });

  await check('email HTML: mentions no phone to explain outreach method', async () => {
    const svc = new PilotPhonelessReactivationService({});
    const { html } = svc._buildEmail('Alex');
    assert.ok(html.includes('text') || html.includes('phone'), 'Should mention SMS/phone absence');
  });

  await check('EMAIL_TYPE constant is correct', () => {
    assert.strictEqual(PilotPhonelessReactivationService.EMAIL_TYPE, 'pilot_phoneless_reactivation');
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
