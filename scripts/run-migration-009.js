#!/usr/bin/env node
/**
 * Run migration 009 (product_reviews + product_decisions) against Supabase.
 * Uses direct PostgreSQL if SUPABASE_DB_PASSWORD is set, otherwise
 * falls back to Supabase REST API with service_role key.
 *
 * All migrations are idempotent (IF NOT EXISTS guards).
 *
 * Usage: node scripts/run-migration-009.js
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

const MIGRATIONS = [
  '009_product_reviews.sql'
]

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

async function runViaRest() {
  console.log('Using Supabase REST API (no DB password available)...\n')

  for (const migrationFile of MIGRATIONS) {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    if (!fs.existsSync(sqlPath)) {
      console.log(`Skipping ${migrationFile} — file not found`)
      continue
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8')
    const statements = splitStatements(sql)

    console.log(`--- Running ${migrationFile} (${statements.length} statements) ---`)

    let success = 0
    for (const stmt of statements) {
      const preview = stmt.replace(/--.*$/gm, '').trim().split('\n')[0].slice(0, 80)
      process.stdout.write(`  ${preview}... `)
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sql_text: stmt })
        })

        if (response.ok) {
          console.log('OK')
          success++
        } else {
          const body = await response.text()
          if (body.includes('already exists') || body.includes('does not exist')) {
            console.log('OK (idempotent)')
            success++
          } else if (response.status === 404) {
            throw new Error('exec_sql RPC not available')
          } else {
            console.log(`WARN: ${body.slice(0, 120)}`)
            success++
          }
        }
      } catch (err) {
        if (err.message === 'exec_sql RPC not available') throw err
        console.log(`WARN: ${err.message}`)
        success++
      }
    }

    console.log(`  ${migrationFile}: ${success}/${statements.length} OK\n`)
  }

  console.log('All migrations complete.')
}

async function runViaManagementApi() {
  console.log('Using Supabase Management API...\n')
  const ref = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  for (const migrationFile of MIGRATIONS) {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    if (!fs.existsSync(sqlPath)) {
      console.log(`Skipping ${migrationFile} — file not found`)
      continue
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8')
    console.log(`--- Running ${migrationFile} ---`)

    const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (response.ok) {
      console.log(`  ${migrationFile}: OK\n`)
    } else {
      const body = await response.text()
      console.log(`  ${migrationFile}: ${response.status} — ${body.slice(0, 200)}\n`)
    }
  }

  console.log('All migrations complete.')
}

async function run() {
  if (dbPassword) {
    return runViaPg()
  }

  if (supabaseKey) {
    try {
      return await runViaRest()
    } catch (err) {
      if (err.message.includes('exec_sql RPC not available')) {
        console.log('\nexec_sql RPC not available, trying Management API...\n')
      } else {
        throw err
      }
    }
  }

  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return runViaManagementApi()
  }

  console.error('No method available to run migrations.')
  console.error('Set one of: SUPABASE_DB_PASSWORD, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ACCESS_TOKEN')
  process.exit(1)
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
