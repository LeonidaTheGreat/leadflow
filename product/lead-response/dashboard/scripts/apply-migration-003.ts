import { createClient } from '@/lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
