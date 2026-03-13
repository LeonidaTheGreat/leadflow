const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkTables() {
  console.log('Checking existing tables...\n')

  const tables = [
    'project_metadata',
    'system_components', 
    'agents',
    'completed_work',
    'action_items',
    'cost_tracking',
    'dashboard_snapshots'
  ]

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error && error.message.includes('does not exist')) {
        console.log(`❌ ${table} - does not exist`)
      } else if (error) {
        console.log(`⚠️  ${table} - exists but error: ${error.message}`)
      } else {
        console.log(`✅ ${table} - exists and accessible`)
      }
    } catch (err) {
      console.log(`❌ ${table} - error: ${err.message}`)
    }
  }
}

checkTables()
