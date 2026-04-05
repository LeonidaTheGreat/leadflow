/**
 * Integration test: trial-signup route writes UTM fields to agent record
 * Task ID: 8d786883-8352-41ad-8062-120628233b14
 * QC Agent verification: UTM fields persisted in real_estate_agents table
 *
 * Tests:
 * 1. Route file destructures UTM from request body
 * 2. Route file includes UTM fields in the agents INSERT statement
 * 3. DB columns (utm_source, utm_medium, utm_campaign) exist with correct type
 * 4. Migration SQL files exist in the repo
 * 5. DB INSERT with UTM values round-trips correctly
 * 6. DB INSERT without UTM stores NULL values
 */

'use strict'

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const { Client } = require('pg')

require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const PG_URL = process.env.LOCAL_PG_URL
if (!PG_URL) throw new Error('LOCAL_PG_URL not set')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL: ${name}`)
    console.error(`       ${err.message}`)
    failed++
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL: ${name}`)
    console.error(`       ${err.message}`)
    failed++
  }
}

async function run() {
  console.log('\nIntegration: trial-signup UTM persistence\n')

  // --- Static checks: route file ---
  const ROUTE = path.join(
    __dirname,
    '../../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
  )
  const routeContent = fs.readFileSync(ROUTE, 'utf8')

  // Find the agents INSERT block (first .insert({ before .select)
  const insertMatch = routeContent.match(/\.insert\(\{([\s\S]*?)\}\)\s*\n\s*\.select/)
  const insertBlock = insertMatch ? insertMatch[1] : ''

  test('Route: utm_source destructured from request.json()', () => {
    assert.ok(
      /utm_source/.test(routeContent.match(/const\s*\{[^}]+\}\s*=\s*await\s+request\.json\(\)/)?.[0] || ''),
      'utm_source must be destructured from request body'
    )
  })

  test('Route: utm_medium destructured from request.json()', () => {
    assert.ok(
      /utm_medium/.test(routeContent.match(/const\s*\{[^}]+\}\s*=\s*await\s+request\.json\(\)/)?.[0] || ''),
      'utm_medium must be destructured from request body'
    )
  })

  test('Route: utm_campaign destructured from request.json()', () => {
    assert.ok(
      /utm_campaign/.test(routeContent.match(/const\s*\{[^}]+\}\s*=\s*await\s+request\.json\(\)/)?.[0] || ''),
      'utm_campaign must be destructured from request body'
    )
  })

  test('Route INSERT: utm_source in agents INSERT block (not just analytics)', () => {
    assert.ok(insertBlock.length > 0, 'Could not find agents INSERT block')
    assert.ok(insertBlock.includes('utm_source'), 'utm_source missing from agents INSERT')
  })

  test('Route INSERT: utm_medium in agents INSERT block', () => {
    assert.ok(insertBlock.includes('utm_medium'), 'utm_medium missing from agents INSERT')
  })

  test('Route INSERT: utm_campaign in agents INSERT block', () => {
    assert.ok(insertBlock.includes('utm_campaign'), 'utm_campaign missing from agents INSERT')
  })

  test('Route INSERT: utm_source uses null-safe fallback', () => {
    assert.ok(
      /utm_source:\s*utm_source\s*\|\|\s*null/.test(insertBlock),
      'utm_source in INSERT must use `utm_source || null`'
    )
  })

  // --- Migration files exist ---
  test('Migration: migrations/003_add_utm_columns_to_agents.sql exists', () => {
    const f = path.join(__dirname, '../../migrations/003_add_utm_columns_to_agents.sql')
    assert.ok(fs.existsSync(f), 'Migration file not found')
    const content = fs.readFileSync(f, 'utf8')
    assert.ok(content.includes('utm_source'), 'Migration must add utm_source column')
    assert.ok(content.includes('utm_medium'), 'Migration must add utm_medium column')
    assert.ok(content.includes('utm_campaign'), 'Migration must add utm_campaign column')
  })

  test('Migration: supabase/migrations/021_add_utm_columns_to_agents.sql exists', () => {
    const f = path.join(__dirname, '../../supabase/migrations/021_add_utm_columns_to_agents.sql')
    assert.ok(fs.existsSync(f), 'Supabase migration file not found')
  })

  // --- DB column checks ---
  const client = new Client({ connectionString: PG_URL })
  await client.connect()

  try {
    await asyncTest('DB: utm_source column exists with type text, nullable', async () => {
      const r = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'real_estate_agents' AND column_name = 'utm_source'`
      )
      assert.strictEqual(r.rows.length, 1, 'utm_source column not found in real_estate_agents')
      assert.strictEqual(r.rows[0].data_type, 'text', 'utm_source must be type text')
      assert.strictEqual(r.rows[0].is_nullable, 'YES', 'utm_source must be nullable')
    })

    await asyncTest('DB: utm_medium column exists with type text, nullable', async () => {
      const r = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'real_estate_agents' AND column_name = 'utm_medium'`
      )
      assert.strictEqual(r.rows.length, 1, 'utm_medium column not found')
      assert.strictEqual(r.rows[0].data_type, 'text')
      assert.strictEqual(r.rows[0].is_nullable, 'YES')
    })

    await asyncTest('DB: utm_campaign column exists with type text, nullable', async () => {
      const r = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'real_estate_agents' AND column_name = 'utm_campaign'`
      )
      assert.strictEqual(r.rows.length, 1, 'utm_campaign column not found')
      assert.strictEqual(r.rows[0].data_type, 'text')
      assert.strictEqual(r.rows[0].is_nullable, 'YES')
    })

    // --- DB round-trip: insert agent with UTM, verify retrieval, clean up ---
    await asyncTest('DB: INSERT agent with UTM fields and retrieve correctly', async () => {
      const testEmail = `qc-utm-test-${Date.now()}@leadflow-qc.invalid`
      const insertR = await client.query(
        `INSERT INTO real_estate_agents
           (email, password_hash, first_name, last_name, plan_tier, trial_ends_at,
            utm_source, utm_medium, utm_campaign, created_at, updated_at)
         VALUES
           ($1, 'testhash', 'QC', 'Test', 'trial', NOW() + INTERVAL '14 days',
            'google', 'cpc', 'trial-q2', NOW(), NOW())
         RETURNING id, utm_source, utm_medium, utm_campaign`,
        [testEmail]
      )
      const row = insertR.rows[0]
      assert.strictEqual(row.utm_source, 'google', 'utm_source not stored correctly')
      assert.strictEqual(row.utm_medium, 'cpc', 'utm_medium not stored correctly')
      assert.strictEqual(row.utm_campaign, 'trial-q2', 'utm_campaign not stored correctly')

      // Verify by re-reading
      const selectR = await client.query(
        `SELECT utm_source, utm_medium, utm_campaign FROM real_estate_agents WHERE id = $1`,
        [row.id]
      )
      assert.strictEqual(selectR.rows[0].utm_source, 'google')
      assert.strictEqual(selectR.rows[0].utm_medium, 'cpc')
      assert.strictEqual(selectR.rows[0].utm_campaign, 'trial-q2')

      // Clean up test row
      await client.query('DELETE FROM real_estate_agents WHERE id = $1', [row.id])
    })

    await asyncTest('DB: INSERT agent without UTM stores NULL values', async () => {
      const testEmail = `qc-utm-null-${Date.now()}@leadflow-qc.invalid`
      const insertR = await client.query(
        `INSERT INTO real_estate_agents
           (email, password_hash, first_name, last_name, plan_tier, trial_ends_at, created_at, updated_at)
         VALUES ($1, 'testhash', 'QC', 'Test', 'trial', NOW() + INTERVAL '14 days', NOW(), NOW())
         RETURNING id, utm_source, utm_medium, utm_campaign`,
        [testEmail]
      )
      const row = insertR.rows[0]
      assert.strictEqual(row.utm_source, null, 'utm_source must be NULL when not provided')
      assert.strictEqual(row.utm_medium, null, 'utm_medium must be NULL when not provided')
      assert.strictEqual(row.utm_campaign, null, 'utm_campaign must be NULL when not provided')
      await client.query('DELETE FROM real_estate_agents WHERE id = $1', [row.id])
    })

    // --- Index check ---
    await asyncTest('DB: utm_source index exists for query optimization', async () => {
      const r = await client.query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'real_estate_agents'
           AND indexname = 'idx_real_estate_agents_utm_source'`
      )
      assert.strictEqual(r.rows.length, 1, 'utm_source index missing')
    })

  } finally {
    await client.end()
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
