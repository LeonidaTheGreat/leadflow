#!/usr/bin/env node
'use strict'
/*
TASK SPEC (f65e7bdd-ce07-42b6-898c-b346d86dfcb3)
What:
- Change `scripts/run-pilot-conversion-migration.js`:
  - Replace broken env/connection logic in `runMigration()` with valid PostgreSQL connection handling.
  - Keep migration statement splitting and execution behavior, but make startup validation deterministic.
Verify:
- `node --check scripts/run-pilot-conversion-migration.js` exits 0.
- `node scripts/run-pilot-conversion-migration.js` without DB env exits non-zero with explicit missing-config error.
- `rg -n "supabaseUrl|apiUrl" scripts/run-pilot-conversion-migration.js` shows no stale undefined-variable usage.
Boundaries:
- Do not touch routes, services, schema SQL files, or other migration scripts.
- Do not modify deployment config, cron config, or dashboard code.
*/
/**
 * Run pilot conversion email sequence schema migration
 * Uses direct PostgreSQL via LOCAL_PG_URL or PG* environment variables.
 *
 * Usage: node scripts/run-pilot-conversion-migration.js
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
} catch (error) {
  if (error && error.code !== 'MODULE_NOT_FOUND') {
    throw error
  }
}

const MIGRATION_FILE = path.join(__dirname, '..', 'sql', 'pilot-conversion-email-schema.sql')

/**
 * Split SQL into executable statements, respecting DO $$ ... $$ blocks
 */
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarBlock = false

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('--') && !inDollarBlock) {
      current += line + '\n'
      continue
    }

    const dollarMatches = line.match(/\$\$/g)
    if (dollarMatches) {
      if (dollarMatches.length % 2 === 1) {
        inDollarBlock = !inDollarBlock
      }
    }

    current += line + '\n'

    if (trimmed.endsWith(';') && !inDollarBlock) {
      const stmt = current.trim()
      const withoutComments = stmt.replace(/--.*$/gm, '').trim()
      if (withoutComments.length > 0 && withoutComments !== ';') {
        statements.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim().replace(/--.*$/gm, '').trim().length > 0) {
    statements.push(current.trim())
  }

  return statements
}

async function runMigration() {
  const connectionString = process.env.LOCAL_PG_URL || process.env.DATABASE_URL
  const hasDiscretePgConfig = Boolean(
    process.env.PGHOST || process.env.PGPORT || process.env.PGUSER || process.env.PGDATABASE
  )
  if (!connectionString && !hasDiscretePgConfig) {
    throw new Error('Missing database config: set LOCAL_PG_URL, DATABASE_URL, or PGHOST/PGPORT/PGUSER/PGDATABASE')
  }

  const clientConfig = connectionString ? { connectionString } : {}
  console.log('Connecting to database via PostgreSQL...')
  const client = new Client(clientConfig)
  await client.connect()
  console.log('Connected.\n')

  try {
    if (!fs.existsSync(MIGRATION_FILE)) {
      console.error(`Migration file not found: ${MIGRATION_FILE}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8')
    const statements = splitStatements(sql)

    console.log(`--- Running pilot-conversion-email-schema.sql (${statements.length} statements) ---`)
    await client.query('BEGIN')

    let success = 0
    for (const stmt of statements) {
      const preview = stmt.replace(/--.*$/gm, '').trim().split('\n')[0].slice(0, 80)
      process.stdout.write(`  ${preview}... `)
      try {
        await client.query(stmt)
        console.log('OK')
        success++
      } catch (err) {
        if (err.message.includes('already exists') || 
            err.message.includes('does not exist') ||
            err.message.includes('duplicate key value')) {
          console.log('OK (idempotent)')
          success++
        } else {
          console.log(`ERROR: ${err.message}`)
          await client.query('ROLLBACK')
          throw new Error(`Migration failed: ${err.message}`)
        }
      }
    }

    await client.query('COMMIT')
    console.log(`\n  pilot-conversion-email-schema.sql: ${success}/${statements.length} OK`)
    console.log('\n✅ Migration complete!')

  } finally {
    await client.end()
  }
}

// Run migration
runMigration().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
