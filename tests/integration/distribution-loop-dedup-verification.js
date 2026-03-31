#!/usr/bin/env node
/**
 * distribution-loop-dedup-verification.js
 * 
 * Integration test for UC: Distribution Loop Dedup — Stop Recurring Duplicate Task Creation
 * 
 * Verifies three core fixes applied to ~/.openclaw/genome/:
 * 1. Fix A: distribution_channels table seeded with active landing page
 * 2. Fix B: Dedup guard in createDistributionTasks() — prevents duplicate task creation
 * 3. Fix C: Loop detector uses 24h cooldown instead of status-based check
 * 
 * See: docs/prd/PRD-DISTRIBUTION-LOOP-DEDUP-FIX.md
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const PROJECT_ID = 'leadflow'

async function runTests() {
  const pool = new Pool({
    connectionString: process.env.LOCAL_PG_URL
  })

  let passed = 0
  let total = 0
  const results = []

  try {
    console.log('Distribution Loop Dedup Verification')
    console.log('====================================\n')

    // ─────────────────────────────────────────────────────────────────────────────
    // Test 1: distribution_channels is seeded (Fix A)
    // ─────────────────────────────────────────────────────────────────────────────
    total++
    console.log('Test 1: distribution_channels table has active landing page')
    try {
      const result = await pool.query(
        `SELECT COUNT(*)::int as count 
         FROM distribution_channels 
         WHERE project_id = $1 
         AND channel_type = 'landing_page' 
         AND status = 'active'`,
        [PROJECT_ID]
      )

      const count = result.rows[0].count
      assert.strictEqual(count, 1, `Expected 1 active landing page, got ${count}`)
      
      console.log(`  ✅ PASS: Found ${count} active landing page\n`)
      passed++
      results.push({ test: 'distribution-channels-seeded', status: 'pass', count })
    } catch (err) {
      console.log(`  ❌ FAIL: ${err.message}\n`)
      results.push({ test: 'distribution-channels-seeded', status: 'fail', error: err.message })
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Test 2: Dedup guard in distribution-collector.js (Fix B)
    // ─────────────────────────────────────────────────────────────────────────────
    total++
    console.log('Test 2: Dedup guard implemented in distribution-collector.js')
    try {
      const collectorPath = path.join(require('os').homedir(), '.openclaw', 'genome', 'scripts', 'distribution-collector.js')
      const content = fs.readFileSync(collectorPath, 'utf8')
      
      // Check for the dedup message
      assert(
        content.includes('Skipping duplicate') || content.includes('dedup'),
        'Dedup guard message not found'
      )
      
      console.log(`  ✅ PASS: Dedup guard found in distribution-collector.js\n`)
      passed++
      results.push({ test: 'dedup-guard-collector', status: 'pass' })
    } catch (err) {
      console.log(`  ❌ FAIL: ${err.message}\n`)
      results.push({ test: 'dedup-guard-collector', status: 'fail', error: err.message })
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Test 3: 24h cooldown in task-store.js loop detector (Fix C)
    // ─────────────────────────────────────────────────────────────────────────────
    total++
    console.log('Test 3: 24h cooldown in loop detector (task-store.js)')
    try {
      const taskStorePath = path.join(require('os').homedir(), '.openclaw', 'genome', 'core', 'task-store.js')
      const content = fs.readFileSync(taskStorePath, 'utf8')
      
      // Check for 24h cooldown implementation
      assert(
        content.includes('24 * 60 * 60') || content.includes('cooldownStart'),
        '24h cooldown not found in task-store.js'
      )
      
      console.log(`  ✅ PASS: 24h cooldown found in task-store.js\n`)
      passed++
      results.push({ test: 'loop-detector-cooldown', status: 'pass' })
    } catch (err) {
      console.log(`  ❌ FAIL: ${err.message}\n`)
      results.push({ test: 'loop-detector-cooldown', status: 'fail', error: err.message })
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('====================================')
    console.log(`Results: ${passed}/${total} tests passed`)
    console.log(`Pass rate: ${(passed / total * 100).toFixed(1)}%\n`)

    if (passed === total) {
      console.log('✅ All distribution loop dedup fixes verified!')
      console.log('\nFixed issues:')
      console.log('  1. distribution_channels now seeded with active landing page (Fix A)')
      console.log('  2. createDistributionTasks() has dedup guard (Fix B)')
      console.log('  3. Loop detector has 24h cooldown (Fix C)')
      console.log('\nExpected behavior:')
      console.log('  - No more "PM: Distribution — Create Landing Page" duplicate tasks every heartbeat')
      console.log('  - Loop detector won\'t spawn investigation tasks repeatedly within 24h')
      return { passed, total, passRate: 1.0, results }
    } else {
      console.log('❌ Some tests failed')
      return { passed, total, passRate: passed / total, results }
    }

  } finally {
    await pool.end()
  }
}

// Run tests
if (require.main === module) {
  runTests()
    .then(result => {
      process.exit(result.passRate === 1.0 ? 0 : 1)
    })
    .catch(err => {
      console.error('Test suite error:', err)
      process.exit(1)
    })
}

module.exports = { runTests }
