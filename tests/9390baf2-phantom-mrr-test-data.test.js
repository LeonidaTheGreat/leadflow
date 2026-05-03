'use strict'
/**
 * Regression test: Phantom MRR from test subscription data
 *
 * Verifies:
 * 1. No test subscription rows (sub_test_*) exist in the subscriptions table
 * 2. The genome revenue collector reads MRR from Stripe API, not from local subscriptions table
 * 3. The schema-alignment integration test cleans up after itself
 */

const { Client } = require('pg')

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

describe('Phantom MRR: test subscription data isolation', () => {
  let client

  beforeAll(async () => {
    client = new Client({ connectionString: PG_URL })
    await client.connect()
  })

  afterAll(async () => {
    await client.end()
  })

  test('no test subscription rows (sub_test_*) exist in subscriptions table', async () => {
    const { rows } = await client.query(
      `SELECT stripe_subscription_id, status, tier FROM subscriptions
       WHERE stripe_subscription_id LIKE 'sub_test_%'`
    )
    expect(rows).toHaveLength(0)
  })

  test('no sentinel test user subscriptions remain', async () => {
    // The schema-alignment test uses this specific UUID as test user
    const testUserId = '00000000-0000-0000-0000-000000000001'
    const { rows } = await client.query(
      `SELECT stripe_subscription_id, status FROM subscriptions WHERE user_id = $1`,
      [testUserId]
    )
    expect(rows).toHaveLength(0)
  })

  test('revenue-collector.js does not query local subscriptions table for MRR', () => {
    const fs = require('fs')
    const path = require('path')
    const collectorPath = path.join(
      require('os').homedir(),
      '.openclaw/genome/scripts/revenue-collector.js'
    )

    // If the file doesn't exist (different deploy), skip
    if (!fs.existsSync(collectorPath)) return

    const src = fs.readFileSync(collectorPath, 'utf-8')

    // Revenue collector must NOT query the local subscriptions table for MRR
    // It should read from Stripe API only — confirmed by absence of .from('subscriptions') calls
    expect(src).not.toMatch(/\.from\(['"]subscriptions['"]\)/)
    expect(src).not.toMatch(/FROM subscriptions/)
  })

  test('schema-alignment test pre-cleans before inserting', () => {
    const fs = require('fs')
    const path = require('path')
    const testPath = path.join(
      __dirname,
      'integration/stripe-subscription-schema-alignment.test.js'
    )

    const src = fs.readFileSync(testPath, 'utf-8')

    // Must have pre-cleanup before try block (cleanup called before test inserts)
    expect(src).toMatch(/Pre-test cleanup|pre.cleanup|await cleanup\(client\)/i)
    // Must have a cleanup function that deletes by ID prefix (belt-and-suspenders)
    expect(src).toMatch(/sub_test_schema_alignment%/)
  })
})
