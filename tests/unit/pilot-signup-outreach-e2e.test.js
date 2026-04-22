'use strict';

/**
 * SPEC
 * What:
 * - Change only tests/unit/pilot-signup-outreach-e2e.test.js.
 * - Replace the fragile upward-relative require() strings with a single repo-root helper
 *   and explicit .js module targets for:
 *   - lib/services/PilotSignupOutreachService.js
 *   - scripts/tasks/pilot-signup-outreach.js
 *   - scripts/db/migrate-pilot-signup-follow-up.js
 * Verify:
 * - Run `node tests/unit/pilot-signup-outreach-e2e.test.js` from the repo root.
 * - Expect all import checks to pass and the script to exit successfully.
 * - Confirm `require.resolve()` succeeds for the three explicit module paths.
 * Boundaries:
 * - Do not change the service implementation, runner script, migration SQL, or unrelated tests.
 * - Do not modify generated/protected docs/config files.
 */

/**
 * E2E smoke test for PilotSignupOutreachService (QC: PR #1272)
 * Verifies: import chain, service contract, email content, migration SQL structure.
 * No live DB or email calls — safe to run in CI.
 */

const assert = require('assert');
const path = require('path');

const repoRequire = relativePath => require(path.join(__dirname, '..', '..', relativePath));

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

async function run() {
  console.log('\n=== e2e: pilot-signup-outreach (PR #1272) ===\n');

  // ── Import chain ─────────────────────────────────────────────────────────
  let PilotSignupOutreachService;
  await check('PilotSignupOutreachService imports without error', async () => {
    PilotSignupOutreachService = repoRequire('lib/services/PilotSignupOutreachService.js');
    assert.ok(PilotSignupOutreachService);
  });

  await check('runner script imports without error', async () => {
    const runner = repoRequire('scripts/tasks/pilot-signup-outreach.js');
    assert.ok(typeof runner.main === 'function');
  });

  await check('migration script imports without error', async () => {
    const migration = repoRequire('scripts/db/migrate-pilot-signup-follow-up.js');
    assert.ok(typeof migration.run === 'function');
    assert.ok(typeof migration.MIGRATION_SQL === 'string');
  });

  // ── Migration SQL correctness ─────────────────────────────────────────────
  await check('migration adds follow_up_sent column', async () => {
    const { MIGRATION_SQL } = repoRequire('scripts/db/migrate-pilot-signup-follow-up.js');
    assert.ok(MIGRATION_SQL.includes('follow_up_sent'));
    assert.ok(MIGRATION_SQL.includes('pilot_signups'));
  });

  await check('migration makes customer_id nullable in email_events', async () => {
    const { MIGRATION_SQL } = repoRequire('scripts/db/migrate-pilot-signup-follow-up.js');
    assert.ok(MIGRATION_SQL.includes('customer_id DROP NOT NULL'));
  });

  await check('migration adds source_id column to email_events', async () => {
    const { MIGRATION_SQL } = repoRequire('scripts/db/migrate-pilot-signup-follow-up.js');
    assert.ok(MIGRATION_SQL.includes('source_id'));
    assert.ok(MIGRATION_SQL.includes('UUID'));
  });

  await check('migration adds pilot_signup_outreach to email_type constraint', async () => {
    const { MIGRATION_SQL } = repoRequire('scripts/db/migrate-pilot-signup-follow-up.js');
    assert.ok(MIGRATION_SQL.includes('pilot_signup_outreach'));
  });

  // ── Service contract: runSequence output shape ────────────────────────────
  await check('runSequence returns { timestamp, steps: {1,2,3} } with empty pools', async () => {
    const service = new PilotSignupOutreachService({
      pool: { query: async () => ({ rows: [] }) },
      emailService: { fromEmail: 't@t.com', send: async () => ({ success: true, id: 'mock' }) },
    });
    const result = await service.runSequence();
    assert.ok(result.timestamp);
    assert.ok(result.steps[1]);
    assert.ok(result.steps[2]);
    assert.ok(result.steps[3]);
    for (const step of [1, 2, 3]) {
      assert.strictEqual(typeof result.steps[step].eligible, 'number');
      assert.strictEqual(typeof result.steps[step].sent, 'number');
      assert.strictEqual(typeof result.steps[step].failed, 'number');
      assert.ok(Array.isArray(result.steps[step].errors));
    }
  });

  // ── Idempotency: email_events dedup query uses correct fields ─────────────
  await check('welcome step query includes source_id dedup against email_events', async () => {
    const queries = [];
    const pool = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [] }; } };
    const service = new PilotSignupOutreachService({ pool });
    await service.getSignupsForStep(PilotSignupOutreachService.STEP_WELCOME);
    const { sql, params } = queries[0];
    assert.ok(sql.includes('email_events'), 'Must check email_events');
    assert.ok(sql.includes('source_id'), 'Must use source_id for dedup');
    assert.strictEqual(params[0], 'pilot_signup_outreach', 'Must bind correct email_type');
  });

  // ── Day 7 offer integrity ─────────────────────────────────────────────────
  await check('day 7 email contains 50% discount copy (consistent with marketing intent)', async () => {
    const svc = new PilotSignupOutreachService({});
    const { html } = svc._buildEmail(PilotSignupOutreachService.STEP_DAY7_FINAL, 'Alex');
    assert.ok(html.includes('50%'));
    assert.ok(html.includes('Hi Alex'));
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
