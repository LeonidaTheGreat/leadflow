#!/usr/bin/env node
/**
 * Add Stripe Billing work to completed_work table
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
    dependencies: []
  },
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Core Module',
    use_case: 'UC-Billing',
    description: 'Built complete Stripe integration: lib/billing.js (284 lines), webhook handler, REST API routes. Supports customers, subscriptions, payment methods, webhooks.',
    category: 'Integration',
    hours_spent: 2.0,
    status: 'done',
    dependencies: ['Stripe Billing - Project Setup']
  },
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Tests',
    use_case: 'UC-Billing',
    description: 'Added comprehensive tests: 7 unit tests for billing module, 9 integration tests for API endpoints. All tests pass.',
    category: 'Testing',
    hours_spent: 1.0,
    status: 'done',
    dependencies: ['Stripe Billing - Core Module']
  },
  {
    project_id: 'bo2026',
    work_name: 'Stripe Billing - Original Task Superseded',
    use_case: 'UC-Billing',
    description: 'Original "Stripe Billing Integration" task failed 2x with Opus. Decomposed into 3 subtasks which all succeeded. Decomposition pattern validated.',
    category: 'Decomposition',
    hours_spent: 0,
    status: 'superseded',
    dependencies: []
  }
]

async function addCompletedWork() {
  console.log('📝 Adding Stripe work to completed_work table...\n')
  
  for (const work of stripeWork) {
    const { data, error } = await supabase
      .from('completed_work')
      .upsert({
        ...work,
        completed_date: new Date().toISOString()
      }, {
        onConflict: 'project_id,work_name'
      })
    
    if (error) {
      console.log(`❌ ${work.work_name}: ${error.message}`)
    } else {
      console.log(`✅ ${work.work_name}`)
    }
  }
  
  // Also update the Stripe Billing Integration action item to resolved
  const { error: updateError } = await supabase
    .from('action_items')
    .update({
      status: 'resolved',
      resolved_date: new Date().toISOString(),
      metadata: { 
        resolution: 'Decomposed into 3 subtasks, all completed successfully',
        original_estimate: '$8.00',
        actual_cost: '$4.80',
        decomposition_worked: true
      }
    })
    .eq('project_id', 'bo2026')
    .eq('title', 'Stripe Billing Integration')
    .eq('type', 'TASK')
  
  if (updateError) {
    console.log(`\n⚠️ Could not update action item: ${updateError.message}`)
  } else {
    console.log(`\n✅ Updated Stripe Billing action item to resolved`)
  }
  
  console.log('\n🔄 Regenerating dashboard...')
  const { execSync } = require('child_process')
  try {
    execSync('node generate-dashboard-from-supabase.js', { stdio: 'inherit' })
  } catch (e) {
    console.log('⚠️ Dashboard generation failed:', e.message)
  }
}

addCompletedWork().catch(console.error)
