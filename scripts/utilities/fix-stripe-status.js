#!/usr/bin/env node
/**
 * Fix Stripe work status to match dashboard filter
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function fixStatus() {
  console.log('🔧 Fixing Stripe work status...\n')
  
  // Update status from 'done' to 'COMPLETE'
  const { error } = await supabase
    .from('completed_work')
    .update({ status: 'COMPLETE' })
    .eq('project_id', 'bo2026')
    .ilike('work_name', 'Stripe Billing%')
    .eq('status', 'done')
  
  if (error) {
    console.log('❌ Error:', error.message)
  } else {
    console.log('✅ Updated Stripe work status to COMPLETE')
  }
  
  // Also delete the superseded one since it's not relevant
  await supabase
    .from('completed_work')
    .delete()
    .eq('project_id', 'bo2026')
    .eq('work_name', 'Stripe Billing - Original Task Superseded')
  
  console.log('🔄 Regenerating dashboard...')
  const { execSync } = require('child_process')
  try {
    execSync('node generate-dashboard-from-supabase.js', { stdio: 'inherit' })
    console.log('\n✅ Dashboard updated')
  } catch (e) {
    console.log('⚠️ Error:', e.message)
  }
}

fixStatus().catch(console.error)
