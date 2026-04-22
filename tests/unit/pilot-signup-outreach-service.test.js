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

function makePool(queryResults) {
  const queries = [];
  let callIdx = 0;
  return {
    queries,
    query: async (sql, params) => {
      queries.push({ sql, params });
      const result = Array.isArray(queryResults) ? queryResults[callIdx] : queryResults;
      callIdx++;
      if (result && result.throws) throw new Error(result.throws);
      return { rows: (result && result.rows) || [] };
    },
  };
}

function makeMockEmailService(sendResult) {
  const sends = [];
  return {
    sends,
    fromEmail: 'test@leadflow.ai',
    send: async (params) => {
      sends.push(params);
      return sendResult || { success: true, mock: true, id: `mock_${Date.now()}` };
    },
  };
}

async function run() {
  console.log('\n=== unit: PilotSignupOutreachService ===\n');

  // ── Constructor ──────────────────────────────────────────────────────────

  await check('constructor sets default URLs', async () => {
    const svc = new PilotSignupOutreachService({});
    assert.ok(svc.bookingUrl.includes('cal.com'));
    assert.ok(svc.signupUrl.includes('signup'));
  });

  await check('constructor accepts custom URLs', async () => {
    const svc = new PilotSignupOutreachService({
      bookingUrl: 'https://cal.test/book',
      signupUrl: 'https://app.test/signup',
    });
    assert.strictEqual(svc.bookingUrl, 'https://cal.test/book');
    assert.strictEqual(svc.signupUrl, 'https://app.test/signup');
  });

  // ── getSignupsForStep ────────────────────────────────────────────────────

  await check('getSignupsForStep throws without pool', async () => {
    const svc = new PilotSignupOutreachService({});
    try {
      await svc.getSignupsForStep(1);
      assert.fail('Should throw');
    } catch (err) {
      assert.ok(err.message.includes('not configured'));
    }
  });

  await check('getSignupsForStep(1) queries for follow_up_sent IS NOT TRUE', async () => {
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool });
    await svc.getSignupsForStep(PilotSignupOutreachService.STEP_WELCOME);
    assert.ok(pool.queries[0].sql.includes('follow_up_sent IS NOT TRUE'));
  });

  await check('getSignupsForStep(2) queries for 3-day age and no real_estate_agents match', async () => {
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool });
    await svc.getSignupsForStep(PilotSignupOutreachService.STEP_DAY3_REMINDER);
    const sql = pool.queries[0].sql;
    assert.ok(sql.includes('3 days'), 'Must filter by 3-day age');
    assert.ok(sql.includes('real_estate_agents'), 'Must exclude converted signups');
  });

  await check('getSignupsForStep(3) queries for 7-day age', async () => {
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool });
    await svc.getSignupsForStep(PilotSignupOutreachService.STEP_DAY7_FINAL);
    assert.ok(pool.queries[0].sql.includes('7 days'));
  });

  await check('getSignupsForStep checks email_events for idempotency', async () => {
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool });
    await svc.getSignupsForStep(PilotSignupOutreachService.STEP_WELCOME);
    const sql = pool.queries[0].sql;
    assert.ok(sql.includes('email_events'), 'Must check email_events for dedup');
    assert.ok(sql.includes('source_id'), 'Must filter by source_id');
  });

  await check('getSignupsForStep returns rows from pool', async () => {
    const signups = [
      { id: 's1', name: 'Alice Agent', email: 'alice@test.com', created_at: '2026-01-01' },
    ];
    const pool = makePool([{ rows: signups }]);
    const svc = new PilotSignupOutreachService({ pool });
    const result = await svc.getSignupsForStep(PilotSignupOutreachService.STEP_WELCOME);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].email, 'alice@test.com');
  });

  // ── sendStepEmail ────────────────────────────────────────────────────────

  await check('sendStepEmail sends correct welcome subject', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Bob Builder', email: 'bob@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.strictEqual(emailService.sends[0].subject, 'Your LeadFlow pilot is ready — let us show you how');
  });

  await check('sendStepEmail sends correct day 3 subject', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Carol', email: 'carol@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_DAY3_REMINDER);
    assert.strictEqual(emailService.sends[0].subject, 'Quick question about your LeadFlow pilot');
  });

  await check('sendStepEmail sends correct day 7 subject', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Dave', email: 'dave@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_DAY7_FINAL);
    assert.strictEqual(emailService.sends[0].subject, 'Last chance — pilot spots filling up');
  });

  await check('sendStepEmail personalizes with first name from full name', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Alice Johnson', email: 'alice@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.ok(emailService.sends[0].html.includes('Hi Alice'));
  });

  await check('sendStepEmail falls back to "there" when name is null', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: null, email: 'anon@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.ok(emailService.sends[0].html.includes('Hi there'));
  });

  await check('sendStepEmail includes booking URL in welcome email', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({
      pool,
      emailService,
      bookingUrl: 'https://cal.test/stojan/15min',
    });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.ok(emailService.sends[0].html.includes('https://cal.test/stojan/15min'));
  });

  await check('sendStepEmail includes signup URL in welcome email', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({
      pool,
      emailService,
      signupUrl: 'https://app.test/signup',
    });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.ok(emailService.sends[0].html.includes('https://app.test/signup'));
  });

  await check('sendStepEmail uses pilot-signup-outreach tag', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.deepStrictEqual(emailService.sends[0].tags, [{ name: 'campaign', value: 'pilot-signup-outreach' }]);
  });

  await check('sendStepEmail uses failIfUnconfigured=false', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);
    assert.strictEqual(emailService.sends[0].failIfUnconfigured, false);
  });

  await check('sendStepEmail logs to email_events on success', async () => {
    const emailService = makeMockEmailService({ success: true, id: 're_test' });
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);

    const logQuery = pool.queries.find(q => q.sql.includes('INSERT INTO email_events'));
    assert.ok(logQuery, 'Must log to email_events');
    assert.strictEqual(logQuery.params[0], 'pilot_signup_outreach');
    assert.strictEqual(logQuery.params[1], 'test@test.com');
    assert.strictEqual(logQuery.params[3], 'sent');
    assert.strictEqual(logQuery.params[6], 's1');
  });

  await check('sendStepEmail logs to email_events on failure', async () => {
    const emailService = makeMockEmailService({ success: false, error: 'API down' });
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_DAY3_REMINDER);

    const logQuery = pool.queries.find(q => q.sql.includes('INSERT INTO email_events'));
    assert.ok(logQuery, 'Must log even on failure');
    assert.strictEqual(logQuery.params[3], 'failed');
    assert.strictEqual(logQuery.params[5], 'API down');
  });

  await check('sendStepEmail sets follow_up_sent=true on welcome success', async () => {
    const emailService = makeMockEmailService({ success: true, id: 're_ok' });
    const pool = makePool([{ rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);

    const updateQuery = pool.queries.find(q => q.sql.includes('follow_up_sent = true'));
    assert.ok(updateQuery, 'Must update follow_up_sent');
    assert.deepStrictEqual(updateQuery.params, ['s1']);
  });

  await check('sendStepEmail does NOT set follow_up_sent on day 3 emails', async () => {
    const emailService = makeMockEmailService({ success: true, id: 're_ok' });
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_DAY3_REMINDER);

    const updateQuery = pool.queries.find(q => q.sql.includes('follow_up_sent'));
    assert.ok(!updateQuery, 'Must not update follow_up_sent for non-welcome steps');
  });

  await check('sendStepEmail does NOT set follow_up_sent on email failure', async () => {
    const emailService = makeMockEmailService({ success: false, error: 'fail' });
    const pool = makePool([{ rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const signup = { id: 's1', name: 'Test', email: 'test@test.com' };
    await svc.sendStepEmail(signup, PilotSignupOutreachService.STEP_WELCOME);

    const updateQuery = pool.queries.find(q => q.sql.includes('follow_up_sent'));
    assert.ok(!updateQuery, 'Must not update follow_up_sent on failure');
  });

  // ── runSequence ──────────────────────────────────────────────────────────

  await check('runSequence processes all 3 steps', async () => {
    const emailService = makeMockEmailService({ success: true, id: 're_seq' });
    const signupsStep1 = [{ id: 's1', name: 'A', email: 'a@t.com', created_at: '2026-01-01' }];
    const signupsStep2 = [{ id: 's2', name: 'B', email: 'b@t.com', created_at: '2026-01-01' }];
    const callResults = [
      { rows: signupsStep1 },  // getSignupsForStep(1)
      { rows: [] },            // _logEmail for s1
      { rows: [] },            // follow_up_sent update for s1
      { rows: signupsStep2 },  // getSignupsForStep(2)
      { rows: [] },            // _logEmail for s2
      { rows: [] },            // getSignupsForStep(3) — no eligible
    ];
    const pool = makePool(callResults);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const results = await svc.runSequence();

    assert.ok(results.steps[1], 'Step 1 must exist');
    assert.ok(results.steps[2], 'Step 2 must exist');
    assert.ok(results.steps[3], 'Step 3 must exist');
    assert.strictEqual(results.steps[1].sent, 1);
    assert.strictEqual(results.steps[2].sent, 1);
    assert.strictEqual(results.steps[3].sent, 0);
  });

  await check('runSequence counts failures correctly', async () => {
    const emailService = makeMockEmailService({ success: false, error: 'fail' });
    const signups = [
      { id: 's1', name: 'A', email: 'a@t.com', created_at: '2026-01-01' },
      { id: 's2', name: 'B', email: 'b@t.com', created_at: '2026-01-01' },
    ];
    const callResults = [
      { rows: signups },  // getSignupsForStep(1)
      { rows: [] },       // _logEmail for s1
      { rows: [] },       // _logEmail for s2
      { rows: [] },       // getSignupsForStep(2)
      { rows: [] },       // getSignupsForStep(3)
    ];
    const pool = makePool(callResults);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const results = await svc.runSequence();

    assert.strictEqual(results.steps[1].eligible, 2);
    assert.strictEqual(results.steps[1].failed, 2);
    assert.strictEqual(results.steps[1].errors.length, 2);
  });

  await check('runSequence includes timestamp', async () => {
    const emailService = makeMockEmailService();
    const pool = makePool([{ rows: [] }, { rows: [] }, { rows: [] }]);
    const svc = new PilotSignupOutreachService({ pool, emailService });
    const results = await svc.runSequence();
    assert.ok(results.timestamp, 'Must include timestamp');
  });

  // ── Email content ────────────────────────────────────────────────────────

  await check('welcome email includes Cal.com booking link', async () => {
    const svc = new PilotSignupOutreachService({ bookingUrl: 'https://cal.test/book' });
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_WELCOME, 'Test');
    assert.ok(html.includes('https://cal.test/book'));
    assert.ok(html.includes('Book a 15-Min Setup Call'));
  });

  await check('welcome email includes pilot features list', async () => {
    const svc = new PilotSignupOutreachService({});
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_WELCOME, 'Test');
    assert.ok(html.includes('under 30 seconds'));
    assert.ok(html.includes('Follow Up Boss'));
    assert.ok(html.includes('Cal.com'));
  });

  await check('day 3 email focuses on pain points', async () => {
    const svc = new PilotSignupOutreachService({});
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_DAY3_REMINDER, 'Test');
    assert.ok(html.includes('391%'));
    assert.ok(html.includes('respond'));
  });

  await check('day 7 email includes 50% off offer', async () => {
    const svc = new PilotSignupOutreachService({});
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_DAY7_FINAL, 'Test');
    assert.ok(html.includes('50% off'));
    assert.ok(html.includes('Claim 50% Off'));
  });

  await check('day 7 email uses urgency red CTA button', async () => {
    const svc = new PilotSignupOutreachService({});
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_DAY7_FINAL, 'Test');
    assert.ok(html.includes('#dc2626'));
  });

  // ── _extractFirstName ────────────────────────────────────────────────────

  await check('_extractFirstName splits full name', async () => {
    const svc = new PilotSignupOutreachService({});
    assert.strictEqual(svc._extractFirstName('Alice Johnson'), 'Alice');
  });

  await check('_extractFirstName returns "there" for null', async () => {
    const svc = new PilotSignupOutreachService({});
    assert.strictEqual(svc._extractFirstName(null), 'there');
  });

  await check('_extractFirstName returns "there" for empty string', async () => {
    const svc = new PilotSignupOutreachService({});
    assert.strictEqual(svc._extractFirstName(''), 'there');
  });

  // ── Static constants ─────────────────────────────────────────────────────

  await check('exports step constants', async () => {
    assert.strictEqual(PilotSignupOutreachService.STEP_WELCOME, 1);
    assert.strictEqual(PilotSignupOutreachService.STEP_DAY3_REMINDER, 2);
    assert.strictEqual(PilotSignupOutreachService.STEP_DAY7_FINAL, 3);
  });

  await check('exports EMAIL_TYPE constant', async () => {
    assert.strictEqual(PilotSignupOutreachService.EMAIL_TYPE, 'pilot_signup_outreach');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
