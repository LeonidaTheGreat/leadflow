import { createClient } from '../lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

const dbUrl = (process.env.NEXT_PUBLIC_API_URL)!
const dbKey = (process.env.API_SECRET_KEY)!

const supabase = createClient(dbUrl, dbKey)

async function applyMigration() {
  console.log('🔧 Applying migration 003_lead_sequences.sql...')
  
  const migrationPath = join(__dirname, '../supabase/migrations/003_lead_sequences.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  try {
    // Execute migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!')
    console.log('📊 Created table: lead_sequences')
    console.log('📊 Created indexes for performance')
    console.log('📊 Created views: active_sequences_due, sequence_analytics')
    console.log('📊 Created triggers: pause on response, auto-complete after 3 messages')

  } catch (err: any) {
    console.error('❌ Error applying migration:', err.message)
    process.exit(1)
  }
}

applyMigration()
