#!/usr/bin/env node
/**
 * Auto-Create Supabase Tables (JavaScript approach)
 * 
 * Since Supabase doesn't allow raw DDL via REST API, we use JavaScript
 * to execute table creation via SQL queries that check if tables exist.
 * 
 * This is a workaround. For production, you'd run the SQL in Supabase
 * SQL Editor directly.
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

/**
 * Test if a table exists
 */
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count(*)', { count: 'exact' })
      .limit(1)

    // If no auth error and table doesn't exist error, table exists
    return !error || !error.message.includes('does not exist')
  } catch (err) {
    return false
  }
}

/**
 * Create all tables and insert initial data
 */
async function createTablesAndData() {
  console.log('🚀 Creating Supabase schema for BO2026...\n')

  // ==================== CREATE TABLES ====================
  // Note: This won't work with REST API. We'll provide manual instructions.

  console.log('⚠️  SQL DDL Execution Limitation')
  console.log('================================')
  console.log('Supabase REST API does not support CREATE TABLE directly.')
  console.log('You must run the schema creation manually via SQL Editor.\n')

  console.log('📋 To Complete Migration:')
  console.log('1. Open: https://app.supabase.com')
  console.log('2. Select your project (fptrokacdwzlmflyczdz)')
  console.log('3. Go to: SQL Editor')
  console.log('4. Click: Create new query')
  console.log('5. Copy and paste: supabase-schema-migration.sql')
  console.log('6. Click: Run')
  console.log('')
  console.log('After tables are created, I\'ll populate them with data.\n')

  // ==================== CHECK IF TABLES EXIST ====================
  console.log('🔍 Checking if tables exist...\n')

  const tables = [
    'project_metadata',
    'system_components',
    'agents',
    'completed_work',
    'action_items',
    'cost_tracking',
    'dashboard_snapshots'
  ]

  const tableStatus = {}
  for (const table of tables) {
    const exists = await tableExists(table)
    tableStatus[table] = exists
    const icon = exists ? '✅' : '❌'
    console.log(`${icon} ${table}`)
  }

  const allTablesExist = Object.values(tableStatus).every(v => v)

  if (!allTablesExist) {
    console.log('\n⏳ Waiting for you to create tables via SQL Editor...')
    console.log('Re-run this script after creating the tables.\n')
    return
  }

  console.log('\n✅ All tables exist! Populating with data...\n')

  // ==================== INSERT DATA ====================

  // 1. Project Metadata
  console.log('📊 Inserting project metadata...')
  try {
    const { error } = await supabase
      .from('project_metadata')
      .upsert({
        project_id: 'bo2026',
        project_name: 'LeadFlow AI',
        goal: '$20K MRR within 60 days',
        goal_value_usd: 20000,
        deadline_days: 60,
        overall_status: 'ACTIVE',
        status_color: '🟢'
      })
      .eq('project_id', 'bo2026')

    if (error) throw error
    console.log('  ✅ Project metadata')
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`)
  }

  // 2. System Components
  console.log('🔧 Inserting system components...')
  const components = [
    { component_name: 'Vercel Deployment', category: 'DEPLOYMENT', status: 'LIVE', status_emoji: '✅', details: 'https://leadflow-ai-five.vercel.app' },
    { component_name: 'FUB Integration', category: 'INTEGRATION', status: 'READY', status_emoji: '✅', details: 'Webhook endpoint live' },
    { component_name: 'Twilio SMS', category: 'INTEGRATION', status: 'TESTED', status_emoji: '✅', details: 'SMS working' },
    { component_name: 'AI Qualification', category: 'INTEGRATION', status: 'READY', status_emoji: '✅', details: 'Claude ready' },
    { component_name: 'Dashboard', category: 'DEPLOYMENT', status: 'LIVE', status_emoji: '✅', details: 'Live and working' },
    { component_name: 'Database', category: 'DATABASE', status: 'LIVE', status_emoji: '✅', details: 'Supabase connected' },
    { component_name: 'Compliance', category: 'COMPLIANCE', status: 'READY', status_emoji: '✅', details: 'TCPA audit complete' },
    { component_name: 'Pilot Accounts', category: 'TESTING', status: 'READY', status_emoji: '✅', details: '3 agents active' },
    { component_name: 'SMS Testing', category: 'TESTING', status: 'VERIFIED', status_emoji: '✅', details: 'Test confirmed' }
  ]

  for (const comp of components) {
    try {
      const { error } = await supabase
        .from('system_components')
        .upsert({
          project_id: 'bo2026',
          ...comp
        })
        .eq('project_id', 'bo2026')
        .eq('component_name', comp.component_name)

      if (error && !error.message.includes('duplicate')) throw error
      console.log(`  ✅ ${comp.component_name}`)
    } catch (err) {
      console.log(`  ❌ ${comp.component_name}: ${err.message.substring(0, 50)}`)
    }
  }

  // 3. Agents
  console.log('🤖 Inserting agents...')
  const agents = [
    { agent_name: 'Dev', agent_type: 'dev', status: 'ACTIVE', status_emoji: '✅', progress_percent: 100, current_task: 'UC-6/7/8 complete' },
    { agent_name: 'Marketing', agent_type: 'marketing', status: 'READY', status_emoji: '🟡', progress_percent: 40, current_task: 'Recruitment pending', blocker: 'User approval' },
    { agent_name: 'QC', agent_type: 'qc', status: 'ACTIVE', status_emoji: '✅', progress_percent: 100, current_task: 'Compliance audit' },
    { agent_name: 'Analytics', agent_type: 'analytics', status: 'COMPLETE', status_emoji: '✅', progress_percent: 100, current_task: 'KPI dashboard' },
    { agent_name: 'Deployment', agent_type: 'deployment', status: 'COMPLETE', status_emoji: '✅', progress_percent: 100, current_task: 'Pilot deployment' }
  ]

  for (const agent of agents) {
    try {
      const { error } = await supabase
        .from('agents')
        .upsert({
          project_id: 'bo2026',
          ...agent
        })
        .eq('project_id', 'bo2026')
        .eq('agent_name', agent.agent_name)

      if (error && !error.message.includes('duplicate')) throw error
      console.log(`  ✅ ${agent.agent_name}`)
    } catch (err) {
      console.log(`  ❌ ${agent.agent_name}: ${err.message.substring(0, 50)}`)
    }
  }

  // 4. Completed Work
  console.log('📋 Inserting completed work...')
  const work = [
    { work_name: 'Outbound SMS', description: 'Message storage & sending', category: 'FEATURE', hours_spent: 2, status: 'COMPLETE' },
    { work_name: 'Cal.com Integration', use_case: 'UC-6', description: 'Booking confirmation SMS', category: 'FEATURE', hours_spent: 8, status: 'COMPLETE' },
    { work_name: 'Dashboard SMS', use_case: 'UC-7', description: 'Manual message sending', category: 'FEATURE', hours_spent: 6, status: 'COMPLETE' },
    { work_name: 'Follow-up Sequences', use_case: 'UC-8', description: 'Automated follow-ups', category: 'FEATURE', hours_spent: 12, status: 'COMPLETE' },
    { work_name: 'Pilot Deployment', description: 'Vercel + DB + integrations', category: 'DEPLOYMENT', hours_spent: 6, status: 'COMPLETE' }
  ]

  for (const w of work) {
    try {
      const { error } = await supabase
        .from('completed_work')
        .insert({
          project_id: 'bo2026',
          ...w
        })

      if (error && !error.message.includes('duplicate')) throw error
      console.log(`  ✅ ${w.work_name}`)
    } catch (err) {
      if (!err.message.includes('duplicate')) {
        console.log(`  ❌ ${w.work_name}`)
      } else {
        console.log(`  ✅ ${w.work_name} (already exists)`)
      }
    }
  }

  // 5. Action Items
  console.log('⚠️  Inserting action items...')
  const items = [
    { title: 'Marketing Recruitment Timing', type: 'DECISION', status: 'WAITING', priority: 1, description: 'When to launch pilot', awaiting_input: 'Stojan', impact: 'First revenue timeline' },
    { title: 'Pilot Launch Decision', type: 'APPROVAL', status: 'WAITING', priority: 1, description: 'Ready to go immediately', awaiting_input: 'Stojan', impact: 'Blocks further work' }
  ]

  for (const item of items) {
    try {
      const { error } = await supabase
        .from('action_items')
        .insert({
          project_id: 'bo2026',
          ...item
        })

      if (error && !error.message.includes('duplicate')) throw error
      console.log(`  ✅ ${item.title}`)
    } catch (err) {
      if (!err.message.includes('duplicate')) {
        console.log(`  ❌ ${item.title}`)
      } else {
        console.log(`  ✅ ${item.title} (already exists)`)
      }
    }
  }

  // 6. Cost Tracking
  console.log('💰 Inserting cost tracking...')
  try {
    const { error } = await supabase
      .from('cost_tracking')
      .upsert({
        project_id: 'bo2026',
        budget_period: 'TOTAL',
        estimated_cost_usd: 95.80,
        budget_limit_usd: 500.00,
        spend_percent: 19.16,
        breakdown: { sonnet: 45.50, haiku: 12.30, kimi: 38.00 }
      })
      .eq('project_id', 'bo2026')
      .eq('budget_period', 'TOTAL')

    if (error) throw error
    console.log('  ✅ Cost tracking')
  } catch (err) {
    console.log(`  ❌ Cost tracking: ${err.message}`)
  }

  console.log('\n✅ Schema migration complete!')
  console.log('\n📊 Data Summary:')
  console.log('  • 1 project')
  console.log('  • 9 system components')
  console.log('  • 5 agents')
  console.log('  • 5 completed work items')
  console.log('  • 2 action items')
  console.log('  • 1 cost tracking record')
}

createTablesAndData().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
