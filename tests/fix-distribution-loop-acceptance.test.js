#!/usr/bin/env node
/**
 * Test Suite: Distribution Loop Acceptance Check Fix
 * Task ID: cb240bbb-e7d3-4e96-bac9-c3f14cebd665
 * Use Case: fix-distribution-loop
 *
 * Verifies that:
 *   1. The no-dup-tasks-1day acceptance check command produces clean output (no dotenv noise)
 *   2. The two most recent gtm-landing-page tasks are > 1 day apart (cooldown working)
 *   3. The acceptance check stored in use_cases table uses quiet:true in dotenv.config
 */

'use strict'

require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env', quiet: true })
const { execSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const { Pool } = require('pg')

const sb = createClient(
  'http://localhost:8787',
  process.env.LEADFLOW_API_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

let pass = 0
let fail = 0

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(() => {
        console.log(`✅ PASS: ${name}`)
        pass++
      }).catch(err => {
        console.error(`❌ FAIL: ${name} — ${err.message}`)
        fail++
      })
    }
    console.log(`✅ PASS: ${name}`)
    pass++
  } catch (err) {
    console.error(`❌ FAIL: ${name} — ${err.message}`)
    fail++
  }
}

async function runTests() {
  console.log('=== Distribution Loop Acceptance Check Fix Tests ===\n')

  // Test 1: acceptance check command produces clean output (just "0" or "1")
  await test('no-dup-tasks-1day command produces clean single-character output', async () => {
    const cmd = `node -e "require(\\"dotenv\\").config({path:\\"/Users/clawdbot/projects/leadflow/.env\\",quiet:true}); const {createClient}=require(\\"@supabase/supabase-js\\"); const sb=createClient(\\"http://localhost:8787\\",process.env.LEADFLOW_API_KEY,{auth:{autoRefreshToken:false,persistSession:false}}); sb.from(\\"tasks\\").select(\\"id,created_at\\").eq(\\"project_id\\",\\"leadflow\\").eq(\\"use_case_id\\",\\"gtm-landing-page\\").eq(\\"agent_id\\",\\"product\\").order(\\"created_at\\",{ascending:false}).limit(2).then(r=>{const t=r.data||[];if(t.length<2){process.stdout.write(\\"0\\");return;}const d=(new Date(t[0].created_at)-new Date(t[1].created_at))/86400000;process.stdout.write(d<1?\\"1\\":\\"0\\");}).catch(()=>process.stdout.write(\\"0\\"))"`
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 }).trim()
    if (result !== '0' && result !== '1') {
      throw new Error(`Expected "0" or "1", got: ${JSON.stringify(result)}`)
    }
  })

  // Test 2: the check returns "0" (pass) — tasks are more than 1 day apart
  await test('no-dup-tasks-1day returns "0" (tasks are > 1 day apart)', async () => {
    const { data: tasks } = await sb
      .from('tasks')
      .select('id,created_at')
      .eq('project_id', 'leadflow')
      .eq('use_case_id', 'gtm-landing-page')
      .eq('agent_id', 'product')
      .order('created_at', { ascending: false })
      .limit(2)

    if (!tasks || tasks.length < 2) {
      // If fewer than 2 tasks, check returns "0" automatically — that's fine
      return
    }

    const daysDiff = (new Date(tasks[0].created_at) - new Date(tasks[1].created_at)) / 86400000
    if (daysDiff < 1) {
      throw new Error(`Tasks are only ${daysDiff.toFixed(2)} days apart — cooldown not working`)
    }
  })

  // Test 3: acceptance check in DB uses quiet:true
  await test('acceptance check command in DB uses dotenv quiet:true', async () => {
    const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL })
    try {
      const { rows } = await pool.query(
        "SELECT acceptance_checks FROM use_cases WHERE id = 'fix-distribution-loop'"
      )
      const checks = rows[0]?.acceptance_checks
      if (!checks || !Array.isArray(checks)) throw new Error('No acceptance checks found')
      const check = checks.find(c => c.id === 'no-dup-tasks-1day')
      if (!check) throw new Error('no-dup-tasks-1day check not found')
      if (!check.command.includes('quiet:true')) {
        throw new Error('acceptance check command does not include quiet:true')
      }
    } finally {
      await pool.end()
    }
  })

  // Test 4: full acceptance check end-to-end (simulates orchestrator behavior)
  await test('full acceptance check end-to-end matches expected "0"', async () => {
    const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL })
    try {
      const { rows } = await pool.query(
        "SELECT acceptance_checks FROM use_cases WHERE id = 'fix-distribution-loop'"
      )
      const checks = rows[0]?.acceptance_checks
      if (!checks || !Array.isArray(checks)) throw new Error('No acceptance checks found')

      for (const check of checks) {
        const result = execSync(check.command, {
          cwd: '/Users/clawdbot/projects/leadflow',
          encoding: 'utf-8',
          timeout: 30000
        }).trim()
        if (result !== check.expected) {
          throw new Error(`Check "${check.id}" failed: expected "${check.expected}", got "${result}"`)
        }
      }
    } finally {
      await pool.end()
    }
  })

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
  process.exit(fail > 0 ? 1 : 0)
}

runTests().catch(err => {
  console.error('Test suite error:', err.message)
  process.exit(1)
})
