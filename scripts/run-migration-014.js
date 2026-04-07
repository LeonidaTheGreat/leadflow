#!/usr/bin/env node
/**
 * Run migration 014 (pilot_invites table) against Supabase.
 * Uses direct PostgreSQL if LOCAL_PG_PASSWORD is set, otherwise
 * falls back to Supabase REST API with service_role key.
 *
 * Migration is idempotent (IF NOT EXISTS guards).
 *
 * Usage: node scripts/run-migration-014.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')


const MIGRATIONS = ['014_pilot_invites.sql']

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

async function runViaPg() {
  const { Client } = require('pg')
  const connectionString = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'
  console.log('Connecting to local database...')

  const client = new Client({ connectionString })
  await client.connect()
  console.log('Connected.\n')

  try {
    for (const migrationFile of MIGRATIONS) {
      await runMigrationPg(client, migrationFile)
    }
    console.log('All migrations complete.')
  } finally {
    await client.end()
  }
}

async function runMigrationPg(client, migrationFile) {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
  if (!fs.existsSync(sqlPath)) {
    console.log(`Skipping ${migrationFile} — file not found`)
    return
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const statements = splitStatements(sql)

  console.log(`--- Running ${migrationFile} (${statements.length} statements) ---`)
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
      if (err.message.includes('already exists') || err.message.includes('does not exist')) {
        console.log('OK (idempotent)')
        success++
      } else {
        console.log(`ERROR: ${err.message}`)
        await client.query('ROLLBACK')
        throw new Error(`Migration ${migrationFile} failed: ${err.message}`)
      }
    }
  }

  await client.query('COMMIT')
  console.log(`  ${migrationFile}: ${success}/${statements.length} OK\n`)
}

// Note: Supabase REST API and Management API code paths removed — project uses local PostgreSQL.

async function run() {
  return runViaPg()
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
