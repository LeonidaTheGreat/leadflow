#!/usr/bin/env node

const assert = require('assert')
const path = require('path')
const { execFileSync } = require('child_process')
const { Pool } = require('pg')

async function run() {
  const repoRoot = path.resolve(__dirname, '../..')

  const scriptOutput = execFileSync('node', ['scripts/db/create-dashboard-views.js'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

  assert(
    scriptOutput.includes('Created/updated views: dashboard_stats, lead_summary'),
    `Expected success output from create-dashboard-views.js, got: ${scriptOutput}`
  )

  const connectionString = process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  assert(connectionString, 'Missing LOCAL_PG_URL or DATABASE_URL for DB verification')

  const pool = new Pool({ connectionString, max: 1 })

  try {
    const viewsResult = await pool.query(
      `SELECT table_name
       FROM information_schema.views
       WHERE table_schema = 'public'
         AND table_name IN ('dashboard_stats', 'lead_summary')
       ORDER BY table_name`
    )

    assert.deepStrictEqual(
      viewsResult.rows.map((r) => r.table_name),
      ['dashboard_stats', 'lead_summary'],
      'Expected both dashboard views to exist in public schema'
    )

    const statsResult = await pool.query(
      'SELECT total_leads, qualification_rate, avg_response_time_minutes FROM dashboard_stats LIMIT 1'
    )
    assert.strictEqual(statsResult.rows.length, 1, 'dashboard_stats should return exactly one row')

    const summaryResult = await pool.query('SELECT id, response_count FROM lead_summary LIMIT 1')
    assert(Array.isArray(summaryResult.rows), 'lead_summary query should return rows array')

    console.log('PASS uc-dashboard-views.test.js')
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('FAIL uc-dashboard-views.test.js')
  console.error(error)
  process.exit(1)
})
