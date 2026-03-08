#!/usr/bin/env node
/**
 * Run migration 008: Lead Satisfaction Feedback Collection
 * Creates lead_satisfaction_events table and adds satisfaction_ping_enabled to agents
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const SQL_FILE = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'supabase', 'migrations', '008_lead_satisfaction_feedback.sql')
const sql = fs.readFileSync(SQL_FILE, 'utf-8')

// Split into individual statements
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
    if (dollarMatches && dollarMatches.length % 2 === 1) {
      inDollarBlock = !inDollarBlock
    }
    current += line + '\n'
    if (!inDollarBlock && trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt && stmt !== ';') statements.push(stmt)
      current = ''
    }
  }
  if (current.trim()) statements.push(current.trim())
  return statements
}

async function runStatement(stmt) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: stmt })
  })

  if (!response.ok) {
    // Try direct query endpoint
    const qResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: stmt })
    })
    return qResponse
  }
  return response
}

async function runViaPg(statements) {
  const { Client } = require('pg')
  const dbPassword = process.env.SUPABASE_DB_PASSWORD
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!projectRef || !dbPassword) throw new Error('Missing DB credentials for direct PG connection')

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false }
  })

  await client.connect()
  console.log('✅ Connected via direct PostgreSQL')

  for (const stmt of statements) {
    if (!stmt.trim() || stmt.trim().startsWith('--')) continue
    try {
      await client.query(stmt)
      const preview = stmt.trim().substring(0, 60).replace(/\n/g, ' ')
      console.log(`  ✓ ${preview}...`)
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`)
      console.error(`  Statement: ${stmt.substring(0, 100)}`)
      await client.end()
      throw err
    }
  }

  await client.end()
}

async function main() {
  console.log('🗃️  Running migration 008: Lead Satisfaction Feedback...')
  const statements = splitStatements(sql).filter(s => s.trim() && !s.trim().startsWith('--'))
  console.log(`📋 ${statements.length} statements to execute`)

  try {
    await runViaPg(statements)
    console.log('\n✅ Migration 008 complete!')
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message)
    process.exit(1)
  }
}

main()
