const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetZombies() {
  const zombieIds = [
    'af8a351f-7d7a-41d4-af85-29d465482233', // Cal.com Webhook Handler
    '6af95c4c-5f04-4721-921f-ab2d8e2b398f', // Stripe Portal Config
    '8f355bfc-089e-4aaf-a035-e062fc73cdf2'  // Stripe Subscriptions
  ]
  
  for (const id of zombieIds) {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'ready',
        metadata: { 
          reset_at: new Date().toISOString(),
          reset_reason: 'zombie_no_active_agent',
          previous_status: 'in_progress'
        }
      })
      .eq('id', id)
    
    if (error) {
      console.error(`Failed to reset ${id}:`, error)
    } else {
      console.log(`Reset zombie task: ${id}`)
    }
  }
}

resetZombies()
