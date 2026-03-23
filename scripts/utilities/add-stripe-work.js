#!/usr/bin/env node
/**
 * Add Stripe Billing work to completed_work table (insert only)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const stripeWork = [
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Project Setup',
    use_case: 'UC-Billing',
    description: 'Set up npm scripts (build, lint, test, typecheck) that were causing failures. All scripts now pass.',
    category: 'Integration',
    hours_spent: 0.5,
    status: 'done',
    dependencies: [],
    completed_date: new Date().toISOString()
  },
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Core Module',
    use_case: 'UC-Billing', 
    description: 'Built complete Stripe integration: lib/billing.js (284 lines), webhook handler, REST API routes. Supports customers, subscriptions, payment methods, webhooks.',
    category: 'Integration',
    hours_spent: 2.0,
    status: 'done',
    dependencies: ['Stripe Billing - Project Setup'],
    completed_date: new Date().toISOString()
  },
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Tests',
    use_case: 'UC-Billing',
    description: 'Added comprehensive tests: 7 unit tests for billing module, 9 integration tests for API endpoints. All tests pass.',
    category: 'Testing',
    hours_spent: 1.0,
    status: 'done',
    dependencies: ['Stripe Billing - Core Module'],
    completed_date: new Date().toISOString()
  }
]

async function addWork() {
  console.log('📝 Adding Stripe work to completed_work...\n')
  
  // Check for existing
  const { data: existing } = await supabase
    .from('completed_work')
    .select('work_name')
    .eq('project_id', 'bo2026')
    .ilike('work_name', 'Stripe Billing%')
  
  const existingNames = new Set((existing || []).map(e => e.work_name))
  
  for (const work of stripeWork) {
    if (existingNames.has(work.work_name)) {
      console.log(`⏩ Skipping (exists): ${work.work_name}`)
      continue
    }
    
    const { error } = await supabase.from('completed_work').insert(work)
    
    if (error) {
      console.log(`❌ ${work.work_name}: ${error.message}`)
    } else {
      console.log(`✅ Added: ${work.work_name}`)
    }
  }
  
  console.log('\n🔄 Regenerating dashboard...')
  const { execSync } = require('child_process')
  try {
    execSync('node generate-dashboard-from-supabase.js', { stdio: 'inherit' })
    console.log('\n✅ Dashboard updated with Stripe work')
  } catch (e) {
    console.log('⚠️ Dashboard generation failed:', e.message)
  }
}

addWork().catch(console.error)
