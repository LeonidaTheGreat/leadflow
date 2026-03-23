#!/usr/bin/env node
/**
 * Run migration 012 against Supabase.
 * Creates the pilot_signups table with unique constraint on email.
 *
 * Uses direct PostgreSQL if SUPABASE_DB_PASSWORD is set, otherwise
 * falls back to Supabase REST API with service_role key.
 *
 * Usage: node scripts/run-migration-012.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL in .env')
  process.exit(1)
}

const MIGRATION_FILE = '012_pilot_signups.sql'

/**
 * Split SQL into executable statements, respecting DO $$ ... $$ blocks.
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

async function runViaPg() {
  const { Client } = require('pg')
  const ref = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]
  if (!ref) throw new Error('Could not extract project ref from SUPABASE_URL')

  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`
  console.log(`Connecting to database via PostgreSQL (project: ${ref})...`)

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected.\n')

  try {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', MIGRATION_FILE)
    if (!fs.existsSync(sqlPath)) {
      console.error(`Migration file not found: ${sqlPath}`)
      process.exit(1)
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8')
    const statements = splitStatements(sql)

    console.log(`--- Running ${MIGRATION_FILE} (${statements.length} statements) ---`)
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
          throw new Error(`Migration ${MIGRATION_FILE} failed: ${err.message}`)
        }
      }
    }

    await client.query('COMMIT')
    console.log(`  ${MIGRATION_FILE}: ${success}/${statements.length} OK\n`)
    console.log('Migration 012 complete. pilot_signups table is ready.')
  } finally {
    await client.end()
  }
}

async function run() {
  if (dbPassword) {
    return runViaPg()
  }

  console.error('No SUPABASE_DB_PASSWORD available. Cannot run DDL migration.')
  console.error('Set SUPABASE_DB_PASSWORD in .env for direct PostgreSQL access.')
  process.exit(1)
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
