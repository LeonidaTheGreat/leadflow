'use strict';

/**
 * Regression guard: phantom MRR from test subscription data.
 *
 * Verifies that:
 * 1. No test-pattern subscription rows exist in the DB (they pollute MRR metrics).
 * 2. The revenue_metrics table has no rows where active_subscribers=0 but mrr_cents>0
 *    (a sure sign test data was counted as real revenue).
 * 3. The revenue-collector skips subscriptions with test-pattern IDs (code guard).
 * 4. The integration test cleans up its own data (idempotency guard).
 */

const assert = require('assert');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`  PASS: ${name}`);
        passed++;
      }).catch(err => {
        console.log(`  FAIL: ${name}`);
        console.log(`        ${err.message}`);
        failed++;
      });
    }
    console.log(`  PASS: ${name}`);
    passed++;
    return Promise.resolve();
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    failed++;
    return Promise.resolve();
  }
}

console.log('\n=== phantom MRR test data regression guard ===\n');

async function run() {
  const client = new Client({ connectionString: PG_URL });
  await client.connect();

  try {
    // 1. No test subscriptions in DB
    await test('No sub_test* rows in subscriptions table', async () => {
      const { rows } = await client.query(
        `SELECT count(*) FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test%'`
      );
      assert.strictEqual(parseInt(rows[0].count, 10), 0,
        'Found test subscriptions that pollute MRR — run scripts/db/cleanup-test-data.js --apply');
    });

    await test('No cus_test* customer rows in subscriptions table', async () => {
      const { rows } = await client.query(
        `SELECT count(*) FROM subscriptions WHERE stripe_customer_id LIKE 'cus_test%'`
      );
      assert.strictEqual(parseInt(rows[0].count, 10), 0,
        'Found test customer rows in subscriptions — run scripts/db/cleanup-test-data.js --apply');
    });

    // 2. No phantom MRR from zero-subscriber rows
    await test('No revenue_metrics rows with mrr_cents>0 and active_subscribers=0', async () => {
      const { rows } = await client.query(
        `SELECT count(*) FROM revenue_metrics WHERE active_subscribers = 0 AND mrr_cents > 0`
      );
      assert.strictEqual(parseInt(rows[0].count, 10), 0,
        'Found revenue_metrics rows with phantom MRR (mrr_cents>0 but active_subscribers=0)');
    });

    // 3. revenue-collector.js skips test-pattern subscription IDs
    await test('revenue-collector.js filters sub_test* subscription IDs', () => {
      const collectorPath = path.resolve(require('os').homedir(), '.openclaw/genome/scripts/revenue-collector.js');
      assert.ok(fs.existsSync(collectorPath), `revenue-collector.js not found at ${collectorPath}`);
      const content = fs.readFileSync(collectorPath, 'utf8');
      assert.ok(
        content.includes('sub_test') && content.includes('continue'),
        'revenue-collector.js must skip subscriptions with sub_test* IDs'
      );
    });

    await test('revenue-collector.js filters cus_test* customer IDs', () => {
      const collectorPath = path.resolve(require('os').homedir(), '.openclaw/genome/scripts/revenue-collector.js');
      const content = fs.readFileSync(collectorPath, 'utf8');
      assert.ok(
        content.includes('cus_test') && content.includes('continue'),
        'revenue-collector.js must skip subscriptions with cus_test* customer IDs'
      );
    });

    await test('revenue-collector.js skips non-livemode subscriptions', () => {
      const collectorPath = path.resolve(require('os').homedir(), '.openclaw/genome/scripts/revenue-collector.js');
      const content = fs.readFileSync(collectorPath, 'utf8');
      assert.ok(
        content.includes('livemode') && content.includes('continue'),
        'revenue-collector.js must skip subscriptions with livemode=false'
      );
    });

    // 4. Integration test has pre-cleanup (idempotency guard)
    await test('stripe-subscription-schema-alignment.test.js has pre-cleanup block', () => {
      const testPath = path.resolve(__dirname, 'integration/stripe-subscription-schema-alignment.test.js');
      assert.ok(fs.existsSync(testPath), `test file not found at ${testPath}`);
      const content = fs.readFileSync(testPath, 'utf8');
      // Pre-cleanup must appear BEFORE the try block that inserts data
      const preCleanupIdx = content.indexOf('Pre-cleanup');
      const tryIdx = content.indexOf('// --- Test 1:');
      assert.ok(preCleanupIdx !== -1, 'integration test must have a Pre-cleanup comment');
      assert.ok(preCleanupIdx < tryIdx, 'Pre-cleanup must appear before Test 1 insert');
    });

  } finally {
    await client.end();
  }

  console.log(`\n${passed + failed === 0 ? 'No tests ran' : `${passed} passed, ${failed} failed`}`);
  if (failed > 0) {
    console.error('\nFAIL phantom-mrr-test-data: some checks failed');
    process.exit(1);
  } else {
    console.log('\nPASS phantom-mrr-test-data: all checks passed');
  }
}

run().catch(err => {
  console.error('FAIL phantom-mrr-test-data');
  console.error(err.message);
  process.exit(1);
});
