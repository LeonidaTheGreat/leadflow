const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function markTaskDone() {
  const { error } = await supabase
    .from('tasks')
    .update({ 
      status: 'done',
      metadata: { 
        completed_at: new Date().toISOString(),
        completion_reason: 'subagent_success',
        work_summary: 'Fixed blocked_reason column in schema and dashboard display'
      }
    })
    .eq('id', 'f9ef7e14-1b70-44ae-9b2e-d82eccfd3ee9')
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }
  console.log('Task marked as done')
}

markTaskDone()
