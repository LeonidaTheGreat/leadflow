'use strict'

/**
 * E2E verification: schema-alignment pre-cleanup prevents phantom MRR
 *
 * Verifies the fix: stripe-subscription-schema-alignment.test.js now runs
 * cleanup() before inserting test rows, so a previously interrupted test
 * cannot leave stale sub_test_* rows that inflate MRR metrics.
 */

const { Client } = require('pg')
const { execSync } = require('child_process')
const path = require('path')

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
const SCHEMA_TEST = path.join(__dirname, 'integration/stripe-subscription-schema-alignment.test.js')
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const STALE_SUB_ID = 'sub_test_qc_stale_row'

describe('Phantom MRR fix: pre-cleanup in schema-alignment test', () => {
  let client

  beforeAll(async () => {
    client = new Client({ connectionString: PG_URL })
    await client.connect()
    // Ensure clean slate before this test suite
    await client.query(`DELETE FROM subscriptions WHERE stripe_subscription_id = $1`, [STALE_SUB_ID])
  })

  afterAll(async () => {
    await client.query(`DELETE FROM subscriptions WHERE stripe_subscription_id = $1`, [STALE_SUB_ID])
    await client.end()
  })

  test('pre-cleanup removes stale test rows before schema-alignment test runs', async () => {
    // Inject a stale row as if a prior interrupted run leaked it
    await client.query(
      `INSERT INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, status, tier, price_id, interval)
       VALUES ($1, 'cus_test_qc_stale', $2, 'active', 'pro', 'price_test_stale', 'month')
       ON CONFLICT DO NOTHING`,
      [TEST_USER_ID, STALE_SUB_ID]
    )

    const { rows: before } = await client.query(
      `SELECT COUNT(*) as n FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'`
    )
    expect(parseInt(before[0].n)).toBeGreaterThan(0)

    // Run the schema-alignment test — pre-cleanup should handle the stale row
    execSync(`node ${SCHEMA_TEST}`, { stdio: 'pipe' })

    const { rows: after } = await client.query(
      `SELECT COUNT(*) as n FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'`
    )
    expect(parseInt(after[0].n)).toBe(0)
  })

  test('no sub_test_* rows remain after schema-alignment test completes normally', async () => {
    execSync(`node ${SCHEMA_TEST}`, { stdio: 'pipe' })

    const { rows } = await client.query(
      `SELECT stripe_subscription_id FROM subscriptions WHERE stripe_subscription_id LIKE 'sub_test_%'`
    )
    expect(rows).toHaveLength(0)
  })
})
