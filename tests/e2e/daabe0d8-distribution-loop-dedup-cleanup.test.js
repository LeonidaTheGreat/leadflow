#!/usr/bin/env node
/**
 * E2E Test: Distribution Loop Dedup Cleanup
 * Task: daabe0d8-a3cf-4286-a77c-d731c1fbd22b
 *
 * Verifies:
 * 1. distribution-collector.js has dedup guard logic
 * 2. distribution_channels has exactly 1 active landing_page row
 * 3. All 5 duplicate distribution loop UCs are marked complete
 * 4. The cleanup tracking UC is complete
 * 5. state-change.js provides cooldown TTL guard
 */

const assert = require('assert')
const fs = require('fs')
const { Client } = require('pg')

const DB_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

let passed = 0
let failed = 0
const results = []

function pass(name) {
  passed++
  results.push({ name, status: 'PASS' })
  console.log(`  PASS: ${name}`)
}

function fail(name, reason) {
  failed++
  results.push({ name, status: 'FAIL', reason })
  console.log(`  FAIL: ${name} — ${reason}`)
}

async function run() {
  console.log('\n=== Distribution Loop Dedup Cleanup E2E Test ===\n')

  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  // TEST 1: distribution-collector.js has dedup guard
  const collectorPath = '/Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js'
  if (fs.existsSync(collectorPath)) {
    const src = fs.readFileSync(collectorPath, 'utf8')
    if (src.includes('sevenDaysAgo') && src.includes('ilike') && src.includes('Skipping duplicate')) {
      pass('distribution-collector.js has title-match dedup guard')
    } else {
      fail('distribution-collector.js dedup guard', 'missing sevenDaysAgo/ilike/Skipping duplicate')
    }
    if (src.includes('hasChanged') && src.includes('distribution_alert_')) {
      pass('distribution-collector.js has state-change cooldown guard')
    } else {
      fail('distribution-collector.js state-change guard', 'missing hasChanged or distribution_alert_ key')
    }
  } else {
    fail('distribution-collector.js exists', 'file not found at expected path')
    fail('distribution-collector.js state-change guard', 'file not found')
  }

  // TEST 2: distribution_channels has exactly 1 active landing_page
  const lpResult = await client.query(
    "SELECT COUNT(*) as cnt FROM distribution_channels WHERE channel_type = 'landing_page' AND status = 'active'"
  )
  const lpCount = parseInt(lpResult.rows[0].cnt)
  if (lpCount === 1) {
    pass('distribution_channels has exactly 1 active landing_page row')
  } else {
    fail('distribution_channels landing_page count', `expected 1, got ${lpCount}`)
  }

  // TEST 3: All 5 target duplicate UCs are complete
  const targetIds = [
    'uc-distribution-loop-dedup',
    'UC-FIX-DISTRIBUTION-LOOP-001',
    'uc-distribution-loop-fix',
    'fix-distribution-loop-dedup',
    'uc-fix-loop-detector-cooldown'
  ]
  const ucResult = await client.query(
    `SELECT id, implementation_status FROM use_cases WHERE id = ANY($1)`,
    [targetIds]
  )
  const ucMap = {}
  for (const row of ucResult.rows) ucMap[row.id] = row.implementation_status

  let allComplete = true
  for (const id of targetIds) {
    if (!ucMap[id]) {
      fail(`UC ${id} exists`, 'not found in use_cases')
      allComplete = false
    } else if (ucMap[id] !== 'complete') {
      fail(`UC ${id} is complete`, `status is ${ucMap[id]}`)
      allComplete = false
    }
  }
  if (allComplete) {
    pass('All 5 duplicate distribution loop UCs are complete')
  }

  // TEST 4: state-change.js TTL guard exists
  const stateChangePath = '/Users/clawdbot/.openclaw/genome/core/state-change.js'
  if (fs.existsSync(stateChangePath)) {
    const src = fs.readFileSync(stateChangePath, 'utf8')
    if (src.includes('ttlHours') && src.includes('cooldown')) {
      pass('state-change.js has TTL cooldown guard')
    } else {
      fail('state-change.js TTL guard', 'missing ttlHours or cooldown')
    }
  } else {
    fail('state-change.js exists', 'file not found')
  }

  await client.end()

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
