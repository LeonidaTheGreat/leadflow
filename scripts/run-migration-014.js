#!/usr/bin/env node
/**
 * Run migration 014: Fix NPS foreign keys to reference real_estate_agents
 * fix-no-cron-job-or-api-endpoint-to-trigger-automated-n
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { Client } = require('pg')

const dbPassword = process.env.SUPABASE_DB_PASSWORD
const supabaseUrl = process.env.SUPABASE_URL

if (!dbPassword || !supabaseUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or SUPABASE_URL in .env')
  process.exit(1)
}

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL')
  process.exit(1)
}

const connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`

const TABLES = [
  'agent_nps_responses',
  'agent_survey_schedule',
  'product_feedback',
  'nps_survey_tokens',
  'nps_prompt_dismissals'
]

async function runMigration() {
  const client = new Client({ connectionString })

  try {
    await client.connect()
    console.log('✅ Connected to Supabase PostgreSQL')
    console.log('🔧 Fixing NPS table foreign keys...\n')

    for (const table of TABLES) {
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}'
        )
      `)
      
      if (!tableCheck.rows[0].exists) {
        console.log(`⚠️  Table ${table} does not exist, skipping`)
        continue
      }

      // Check if foreign key exists
      const fkCheck = await client.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = '${table}'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'agent_id'
      `)

      // Drop existing foreign key if it exists
      if (fkCheck.rows.length > 0) {
        const fkName = fkCheck.rows[0].constraint_name
        console.log(`  Dropping existing FK ${fkName} on ${table}...`)
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${fkName}`)
      }

      // Add new foreign key constraint referencing real_estate_agents
      console.log(`  Adding FK ${table}.agent_id -> real_estate_agents.id...`)
      const onDelete = table === 'product_feedback' ? 'SET NULL' : 'CASCADE'
      await client.query(`
        ALTER TABLE ${table}
        ADD CONSTRAINT ${table}_agent_id_fkey
        FOREIGN KEY (agent_id) REFERENCES real_estate_agents(id) ON DELETE ${onDelete}
      `)
      console.log(`  ✅ Fixed ${table}`)
    }

    console.log('\n✅ Migration 014 completed successfully')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
