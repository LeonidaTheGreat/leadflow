#!/usr/bin/env node
/**
 * Integration test: mission_metrics reflect $0 MRR reality
 * Task ID: 0dbf5b0c-c430-4d69-b9ef-aa48615c11c0
 *
 * Verifies:
 *   1. 'Weekly New Customers' metric exists (target=3, unit='customers/week', current_value=0)
 *   2. 'Trial to Paid Conversion' current_value=0 (reflects no paying customers)
 *
 * Seed: scripts/db/mission-metrics-weekly-customers-seed.sql
 */

'use strict'

const assert = require('assert')
const path = require('path')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

async function main() {
  const client = new Client({ connectionString: PG_URL })
  await client.connect()

  try {
    const { rows } = await client.query(
      `SELECT name, current_value, target, unit, status
         FROM mission_metrics
        WHERE project_id = 'leadflow'
          AND name IN ('Weekly New Customers', 'Trial to Paid Conversion')`
    )

    const byName = Object.fromEntries(rows.map(r => [r.name, r]))

    test('Weekly New Customers metric exists', () => {
      assert.ok(byName['Weekly New Customers'], 'Row not found')
    })

    test('Weekly New Customers target = 3', () => {
      assert.strictEqual(Number(byName['Weekly New Customers'].target), 3)
    })

    test('Weekly New Customers unit = customers/week', () => {
      assert.strictEqual(byName['Weekly New Customers'].unit, 'customers/week')
    })

    test('Weekly New Customers current_value = 0', () => {
      assert.strictEqual(Number(byName['Weekly New Customers'].current_value), 0)
    })

    test('Weekly New Customers status = active', () => {
      assert.strictEqual(byName['Weekly New Customers'].status, 'active')
    })

    test('Trial to Paid Conversion exists', () => {
      assert.ok(byName['Trial to Paid Conversion'], 'Row not found')
    })

    test('Trial to Paid Conversion current_value = 0 (reflects $0 MRR)', () => {
      assert.strictEqual(Number(byName['Trial to Paid Conversion'].current_value), 0)
    })
  } finally {
    await client.end()
  }

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test error:', err.message)
  process.exit(1)
})
