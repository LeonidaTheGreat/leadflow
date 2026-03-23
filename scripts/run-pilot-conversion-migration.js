#!/usr/bin/env node
/**
 * Run pilot conversion email sequence schema migration
 * Uses direct PostgreSQL if SUPABASE_DB_PASSWORD is set
 *
 * Usage: node scripts/run-pilot-conversion-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL
const dbPassword = process.env.SUPABASE_DB_PASSWORD

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL in .env')
  process.exit(1)
}

const MIGRATION_FILE = 'pilot-conversion-email-schema.sql'

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
  const { Client } = require('pg')
  const ref = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]
  if (!ref) throw new Error('Could not extract project ref from SUPABASE_URL')

  const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`
  console.log(`Connecting to database via PostgreSQL (project: ${ref})...`)

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected.\n')

  try {
    const sqlPath = path.join(__dirname, '..', 'sql', MIGRATION_FILE)
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
    console.log(`\n  ${MIGRATION_FILE}: ${success}/${statements.length} OK`)
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
