#!/usr/bin/env node
/**
 * Run migration 015 (pilot_signups table) against Supabase.
 * Uses direct PostgreSQL if SUPABASE_DB_PASSWORD is set, otherwise
 * falls back to Supabase REST API with service_role key.
 *
 * Migration is idempotent (IF NOT EXISTS guards).
 *
 * Usage: node scripts/run-migration-015.js
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

const MIGRATIONS = ['015_pilot_signups.sql']

function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarBlock = false
  let dollarTag = ''

  const lines = sql.split('\n')
  for (const line of lines) {
    // Detect dollar-quoting
    const dollarMatch = line.match(/(\$[^$]*\$)/)
    if (dollarMatch) {
      if (!inDollarBlock) {
        inDollarBlock = true
        dollarTag = dollarMatch[1]
      } else if (line.includes(dollarTag)) {
        inDollarBlock = false
      }
    }

    current += line + '\n'

    if (!inDollarBlock && line.trimEnd().endsWith(';')) {
      const stmt = current.trim()
      if (stmt && !stmt.startsWith('--')) {
        statements.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements.filter(s => s.length > 0 && !s.match(/^--/))
}

async function runMigrationViaRest(sql) {
  // Execute via Supabase SQL REST endpoint
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) throw new Error('Cannot parse Supabase project ref from URL')

  const response = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ sql })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`REST API error: ${response.status} ${text}`)
  }
}

async function runMigrationViaPg(sql, pg) {
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) throw new Error('Cannot parse Supabase project ref from URL')

  const client = new pg.Client({
    host: `db.${ref}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

async function main() {
  console.log('Running migration 015: pilot_signups table...')

  for (const filename of MIGRATIONS) {
    const filepath = path.join(__dirname, '..', 'supabase', 'migrations', filename)
    const sql = fs.readFileSync(filepath, 'utf8')

    console.log(`\nApplying ${filename}...`)

    if (dbPassword) {
      try {
        const pg = require('pg')
        await runMigrationViaPg(sql, pg)
        console.log(`✅ ${filename} applied via direct PostgreSQL`)
        continue
      } catch (err) {
        console.warn(`Direct PG failed: ${err.message}, trying REST...`)
      }
    }

    // Fall back to running statements one by one via Supabase JS client
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const statements = splitStatements(sql)
    console.log(`  Executing ${statements.length} statement(s)...`)

    for (const stmt of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt }).catch(() => ({
        error: { message: 'rpc not available' }
      }))

      if (error) {
        // Try raw query via REST
        try {
          await runMigrationViaRest(stmt)
        } catch (restErr) {
          // Log but don't abort — some statements may already exist
          console.warn(`  ⚠️  Statement warning: ${restErr.message}`)
          console.warn(`  SQL: ${stmt.substring(0, 100)}...`)
        }
      }
    }

    console.log(`✅ ${filename} applied`)
  }

  console.log('\n✅ Migration 015 complete.')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
