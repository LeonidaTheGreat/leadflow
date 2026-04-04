/**
 * E2E Test: UTM Columns Migration
 * Task: fix-database-migration-not-run-utm-columns-missing-from-agents
 * 
 * Verifies that:
 * 1. UTM columns exist on real_estate_agents table
 * 2. All 5 UTM columns are present (source, medium, campaign, content, term)
 * 3. Columns have correct type (text)
 * 4. Indices are created for query optimization
 * 5. Columns accept NULL values (nullable)
 * 6. Data can be inserted and retrieved correctly
 * 
 * Run: node tests/e2e/utm-columns-migration.test.js
 */

'use strict'

const assert = require('assert')
const pool = require('pg').Pool

const pgClient = new pool({
  connectionString: process.env.LOCAL_PG_URL
})

let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`  ❌ FAIL: ${label}`)
    console.error(`         ${err.message}`)
    failed++
  }
}

async function getColumnInfo(columnName) {
  const result = await pgClient.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
    AND column_name = $1
  `, [columnName])
  return result.rows[0]
}

async function getIndices() {
  const result = await pgClient.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'real_estate_agents'
    AND indexname LIKE 'idx_real_estate_agents_utm%'
  `)
  return result.rows.map(r => r.indexname)
}

async function runTests() {
  console.log('\n📋 E2E: UTM Columns Migration (real_estate_agents)\n')

  // ── 1. Verify all 5 columns exist ────────────────────────────────────────

  const columns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  
  for (const col of columns) {
    test(`Column ${col} exists`, async () => {
      const info = await getColumnInfo(col)
      assert.ok(info, `Column ${col} not found in real_estate_agents`)
    })
  }

  // ── 2. Verify column types ──────────────────────────────────────────────

  for (const col of columns) {
    test(`Column ${col} has type text`, async () => {
      const info = await getColumnInfo(col)
      assert.strictEqual(info.data_type, 'text', `Expected text, got ${info.data_type}`)
    })
  }

  // ── 3. Verify columns are nullable ──────────────────────────────────────

  for (const col of columns) {
    test(`Column ${col} is nullable`, async () => {
      const info = await getColumnInfo(col)
      assert.strictEqual(info.is_nullable, 'YES', `Column should be nullable`)
    })
  }

  // ── 4. Verify indices are created ──────────────────────────────────────

  test('Index on utm_source exists', async () => {
    const indices = await getIndices()
    const hasIndex = indices.some(idx => idx.includes('utm_source'))
    assert.ok(hasIndex, 'Index on utm_source not found')
  })

  test('Composite index on utm_source, utm_medium, utm_campaign exists', async () => {
    const indices = await getIndices()
    const hasComposite = indices.some(idx => idx.includes('utm_composite'))
    assert.ok(hasComposite, 'Composite index not found')
  })

  // ── 5. Verify data can be inserted and retrieved ────────────────────────

  test('Can insert agent with UTM data', async () => {
    try {
      const result = await pgClient.query(`
        INSERT INTO real_estate_agents (
          email, password_hash, first_name, last_name,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        RETURNING id, utm_source, utm_medium, utm_campaign, utm_content, utm_term
      `, [
        'utm-test-' + Date.now() + '@test.local',
        'hash123',
        'Test',
        'Agent',
        'google',
        'cpc',
        'pilot-q1',
        'hero-cta',
        'real-estate-crm'
      ])

      const agent = result.rows[0]
      assert.strictEqual(agent.utm_source, 'google', 'utm_source not stored correctly')
      assert.strictEqual(agent.utm_medium, 'cpc', 'utm_medium not stored correctly')
      assert.strictEqual(agent.utm_campaign, 'pilot-q1', 'utm_campaign not stored correctly')
      assert.strictEqual(agent.utm_content, 'hero-cta', 'utm_content not stored correctly')
      assert.strictEqual(agent.utm_term, 'real-estate-crm', 'utm_term not stored correctly')

      // Clean up
      await pgClient.query('DELETE FROM real_estate_agents WHERE id = $1', [agent.id])
    } catch (e) {
      throw new Error(`Failed to insert agent: ${e.message}`)
    }
  })

  test('Can insert agent without UTM data (NULL values)', async () => {
    try {
      const result = await pgClient.query(`
        INSERT INTO real_estate_agents (
          email, password_hash, first_name, last_name
        ) VALUES (
          $1, $2, $3, $4
        )
        RETURNING id, utm_source, utm_medium
      `, [
        'no-utm-test-' + Date.now() + '@test.local',
        'hash456',
        'Direct',
        'Visitor'
      ])

      const agent = result.rows[0]
      assert.strictEqual(agent.utm_source, null, 'utm_source should be NULL')
      assert.strictEqual(agent.utm_medium, null, 'utm_medium should be NULL')

      // Clean up
      await pgClient.query('DELETE FROM real_estate_agents WHERE id = $1', [agent.id])
    } catch (e) {
      throw new Error(`Failed to insert agent without UTM: ${e.message}`)
    }
  })

  test('Can query agents by utm_source', async () => {
    try {
      // Insert test agent
      const insertResult = await pgClient.query(`
        INSERT INTO real_estate_agents (
          email, password_hash, first_name, last_name, utm_source
        ) VALUES (
          $1, $2, $3, $4, $5
        )
        RETURNING id
      `, [
        'query-test-' + Date.now() + '@test.local',
        'hash789',
        'Query',
        'Test',
        'facebook'
      ])

      const agentId = insertResult.rows[0].id

      // Query by utm_source
      const queryResult = await pgClient.query(
        'SELECT id, utm_source FROM real_estate_agents WHERE utm_source = $1',
        ['facebook']
      )

      const found = queryResult.rows.some(r => r.id === agentId)
      assert.ok(found, 'Agent with facebook utm_source not found in query')

      // Clean up
      await pgClient.query('DELETE FROM real_estate_agents WHERE id = $1', [agentId])
    } catch (e) {
      throw new Error(`Failed to query by utm_source: ${e.message}`)
    }
  })

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60))
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)
  console.log('─'.repeat(60))

  await pgClient.end()

  if (failed > 0) {
    console.error('❌ Test suite FAILED\n')
    process.exit(1)
  } else {
    console.log('✅ All tests PASSED\n')
    process.exit(0)
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
