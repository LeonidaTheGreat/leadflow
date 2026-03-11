#!/usr/bin/env node
/**
 * Run migration 008: NPS Feedback Tables
 * Creates NPS survey tables with real_estate_agents foreign keys
 * fix-no-cron-job-or-api-endpoint-to-trigger-automated-n
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const dbPassword = process.env.SUPABASE_DB_PASSWORD
const supabaseUrl = process.env.SUPABASE_URL

if (!dbPassword || !supabaseUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or SUPABASE_URL in .env')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

// Split SQL into statements respecting $$ blocks
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

async function runMigration() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('✅ Connected to Supabase PostgreSQL')

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_nps_feedback_tables.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    const statements = splitStatements(sql).filter(s => s.trim() && !s.trim().startsWith('--'))

    console.log(`📋 ${statements.length} statements to execute`)

    for (const stmt of statements) {
      if (!stmt.trim()) continue
      try {
        await client.query(stmt)
        const preview = stmt.trim().substring(0, 60).replace(/\n/g, ' ')
        console.log(`  ✓ ${preview}...`)
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists')) {
          console.log(`  ⚠️  Skipping (already exists): ${err.message.substring(0, 60)}`)
        } else {
          console.error(`  ✗ Error: ${err.message}`)
          throw err
        }
      }
    }

    console.log('\n✅ Migration 008 (NPS tables) completed successfully')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
