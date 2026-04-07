#!/usr/bin/env node
/**
 * Run migration 004_project_hierarchy.sql against Supabase via direct PostgreSQL connection
 * Usage: node scripts/run-migration-004.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const connectionString = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw'

const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '004_project_hierarchy.sql')
const sql = fs.readFileSync(sqlFile, 'utf-8')

async function run() {
  console.log(`Connecting to local database...`)

  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('Connected.\n')

    console.log('Running migration 004_project_hierarchy.sql...\n')
    await client.query('BEGIN')

    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const withoutComments = s.replace(/--.*$/gm, '').trim()
        return withoutComments.length > 0
      })

    let success = 0
    for (const stmt of statements) {
      const preview = stmt.replace(/--.*$/gm, '').trim().split('\n')[0].slice(0, 70)
      process.stdout.write(`  ${preview}... `)
      try {
        await client.query(stmt)
        console.log('OK')
        success++
      } catch (err) {
        console.log(`ERROR: ${err.message}`)
        if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
          await client.query('ROLLBACK')
          throw err
        }
        success++
      }
    }

    await client.query('COMMIT')
    console.log(`\nMigration complete: ${success}/${statements.length} statements executed successfully.`)

  } catch (err) {
    console.error('\nMigration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
