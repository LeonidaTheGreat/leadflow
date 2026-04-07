#!/usr/bin/env node
/**
 * Run migration 015 (Session Analytics — Pilot Usage Tracking) via direct PostgreSQL.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')


function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarBlock = false

  const lines = sql.split('\n')
  for (const line of lines) {
    if (line.trim().startsWith('--')) {
      current += line + '\n'
      continue
    }
    if (line.includes('$$')) {
      inDollarBlock = !inDollarBlock
    }
    current += line + '\n'
    if (!inDollarBlock && line.trim().endsWith(';')) {
      const stmt = current.replace(/--[^\n]*/g, '').trim()
      if (stmt && stmt !== ';') statements.push(stmt)
      current = ''
    }
  }
  if (current.trim()) {
    const stmt = current.replace(/--[^\n]*/g, '').trim()
    if (stmt && stmt !== ';') statements.push(stmt)
  }
  return statements
}

async function run() {
  const connectionString = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

  const client = new Client({ connectionString })
  await client.connect()
  console.log('Connected to database.\n')

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '015_session_analytics.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  const statements = splitStatements(sql)

  console.log(`--- Running 015_session_analytics.sql (${statements.length} statements) ---`)
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
      if (
        err.message.includes('already exists') ||
        err.message.includes('does not exist') ||
        err.message.includes('duplicate')
      ) {
        console.log('OK (idempotent)')
        success++
      } else {
        console.log(`ERROR: ${err.message}`)
        await client.query('ROLLBACK')
        await client.end()
        process.exit(1)
      }
    }
  }

  await client.query('COMMIT')
  console.log(`\n✅ Migration complete: ${success}/${statements.length} statements OK`)
  await client.end()
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
