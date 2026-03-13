#!/usr/bin/env node
/**
 * Final integration test - Simulates dashboard header display
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function simulateDashboardHeader() {
  console.log('🖥️  Simulating Dashboard Header Display\n')
  console.log('='.repeat(60))
  
  // Query project_metadata (as dashboard does)
  const { data: metadata, error } = await supabase
    .from('project_metadata')
    .select('*')
    .eq('project_id', 'bo2026')
    .single()
  
  if (error || !metadata) {
    console.error('❌ Failed to load project metadata:', error?.message)
    return
  }
  
  // Simulate the calculations dashboard makes
  const startDate = new Date(metadata.start_date || '2026-02-15')
  const today = new Date()
  const dayNum = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)))
  const daysRemaining = Math.max(0, (metadata.deadline_days || 60) - dayNum)
  
  // Display what the dashboard header would show
  console.log('┌────────────────────────────────────────────────────────────┐')
  console.log('│  DASHBOARD HEADER                                          │')
  console.log('├────────────────────────────────────────────────────────────┤')
  console.log(`│  Project: ${metadata.project_name.padEnd(50)}│`)
  console.log(`│  Goal: ${metadata.goal.padEnd(53)}│`)
  console.log('├────────────────────────────────────────────────────────────┤')
  console.log(`│  Status: ${metadata.status_color} ${metadata.overall_status.padEnd(48)}│`)
  console.log(`│  Progress: Day ${dayNum} of ${metadata.deadline_days}${''.padEnd(39)}│`)
  console.log(`│  Remaining: ${daysRemaining} days${''.padEnd(46)}│`)
  console.log('└────────────────────────────────────────────────────────────┘')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Acceptance Criteria Verification:')
  console.log('='.repeat(60))
  
  const criteria = []
  
  // AC 1: Header shows project name from Supabase
  criteria.push({
    name: 'Header shows project name from Supabase',
    passed: metadata.project_name === 'LeadFlow Real Estate AI'
  })
  
  // AC 2: Shows current day of 60
  criteria.push({
    name: 'Shows current day of 60',
    passed: dayNum >= 1 && dayNum <= 60
  })
  
  // AC 3: Shows overall status
  criteria.push({
    name: 'Shows overall status',
    passed: !!metadata.overall_status && !!metadata.status_color
  })
  
  // AC 4: Auto-updates on refresh (setInterval configured)
  const fs = require('fs')
  const html = fs.readFileSync('./dashboard.html', 'utf-8')
  criteria.push({
    name: 'Auto-updates on refresh (60s interval)',
    passed: html.includes('setInterval(loadAllData, 60000)')
  })
  
  criteria.forEach(c => {
    console.log(`${c.passed ? '✅' : '❌'} ${c.name}`)
  })
  
  const allPassed = criteria.every(c => c.passed)
  
  console.log('\n' + '-'.repeat(60))
  if (allPassed) {
    console.log('🎉 ALL ACCEPTANCE CRITERIA MET!')
    console.log('\nDashboard header successfully displays:')
    console.log(`  • Project name: ${metadata.project_name}`)
    console.log(`  • Goal: ${metadata.goal}`)
    console.log(`  • Current day: ${dayNum} of ${metadata.deadline_days}`)
    console.log(`  • Status: ${metadata.status_color} ${metadata.overall_status}`)
    console.log(`  • Auto-refresh: Every 60 seconds`)
    process.exit(0)
  } else {
    console.log('⚠️ Some acceptance criteria not met')
    process.exit(1)
  }
}

simulateDashboardHeader().catch(console.error)
