#!/usr/bin/env node
/**
 * Run migration 008: Lead Satisfaction Feedback Collection
 * Creates lead_satisfaction_events table and adds satisfaction_ping_enabled to agents
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')


const SQL_FILE = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'supabase', 'migrations', '008_lead_satisfaction_feedback.sql')
const sql = fs.readFileSync(SQL_FILE, 'utf-8')

// Split SQL into individual statements
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

async function runViaPg(statements) {
  const { Client } = require('pg')
  const connectionString = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

  const client = new Client({ connectionString })

  await client.connect()
  console.log('✅ Connected via local PostgreSQL')

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
  console.log('Running migration 008: Lead Satisfaction Feedback...')
  const statements = splitStatements(sql).filter(s => s.trim() && !s.trim().startsWith('--'))
  console.log(`${statements.length} statements to execute`)

  try {
    await runViaPg(statements)
    console.log('\nMigration 008 complete!')
  } catch (err) {
    console.error('\nMigration failed:', err.message)
    process.exit(1)
  }
}

main()
