'use strict'

/**
 * One-time cleanup: delete agent_survey_schedule rows where agent_id
 * has no matching real_estate_agents row (orphans).
 *
 * Usage: node scripts/db/nps-orphan-schedule-cleanup.js [--dry-run]
 */

const { Client } = require('pg')

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const pgUrl = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
  const client = new Client({ connectionString: pgUrl })
  await client.connect()

  try {
    const { rows: orphans } = await client.query(`
      SELECT s.agent_id
      FROM agent_survey_schedule s
      LEFT JOIN real_estate_agents r ON s.agent_id = r.id
      WHERE r.id IS NULL
    `)

    console.log(`Found ${orphans.length} orphaned agent_survey_schedule rows`)

    if (orphans.length === 0) {
      console.log('Nothing to clean up.')
      return
    }

    for (const row of orphans) {
      console.log(`  orphan agent_id: ${row.agent_id}`)
    }

    if (DRY_RUN) {
      console.log('[DRY RUN] No rows deleted.')
      return
    }

    const ids = orphans.map(r => r.agent_id)
    const { rowCount } = await client.query(
      `DELETE FROM agent_survey_schedule WHERE agent_id = ANY($1)`,
      [ids]
    )
    console.log(`Deleted ${rowCount} orphaned rows.`)
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('Cleanup failed:', err.message)
  process.exit(1)
})
