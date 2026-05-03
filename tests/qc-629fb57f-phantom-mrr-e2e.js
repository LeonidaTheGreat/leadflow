'use strict'
/**
 * QC E2E: verify fix for phantom MRR test data pollution.
 * Runs schema-alignment integration test then verifies DB is clean post-run.
 */
const { execSync } = require('child_process')
const { Client } = require('pg')
const assert = require('assert')

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

async function run() {
  // 1. Run the schema-alignment integration test — must pass and clean up after itself
  try {
    execSync('node tests/integration/stripe-subscription-schema-alignment.test.js', {
      cwd: '/Users/clawdbot/projects/leadflow',
      stdio: 'pipe'
    })
    console.log('PASS: schema-alignment test completed without error')
  } catch (err) {
    console.error('FAIL: schema-alignment test threw:', err.stderr?.toString())
    process.exit(1)
  }

  // 2. Verify DB is clean: no orphaned test rows remain after the test
  const client = new Client({ connectionString: PG_URL })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT stripe_subscription_id FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'`
    )
    assert.strictEqual(rows.length, 0,
      `Expected 0 test subscriptions after test run, found: ${JSON.stringify(rows)}`)
    console.log('PASS: DB clean — no sub_test_* subscriptions remain after integration test run')

    const { rows: sentinelRows } = await client.query(
      `SELECT user_id FROM subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000001'`
    )
    assert.strictEqual(sentinelRows.length, 0,
      'Sentinel test user still has subscriptions after cleanup')
    console.log('PASS: sentinel test user has no leftover subscriptions')
  } finally {
    await client.end()
  }

  console.log('\nPASS qc-phantom-mrr-e2e: all checks passed')
}

run().catch(err => { console.error(err); process.exit(1) })
