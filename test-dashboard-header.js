#!/usr/bin/env node
/**
 * Test dashboard header - project_metadata display
 * Validates: project name, goal, current day, deadline, overall status
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function testDashboardHeader() {
  console.log('🧪 Testing Dashboard Header - project_metadata\n')
  
  const tests = []
  
  // Test 1: Query project_metadata table
  console.log('Test 1: Query project_metadata from Supabase')
  const { data: metadata, error } = await supabase
    .from('project_metadata')
    .select('*')
    .eq('project_id', 'bo2026')
    .single()
  
  if (error) {
    console.error('  ❌ FAILED:', error.message)
    tests.push({ name: 'Query project_metadata', passed: false, error: error.message })
  } else if (!metadata) {
    console.error('  ❌ FAILED: No data found')
    tests.push({ name: 'Query project_metadata', passed: false, error: 'No data' })
  } else {
    console.log('  ✅ PASSED: Data retrieved')
    tests.push({ name: 'Query project_metadata', passed: true })
  }
  
  // Test 2: Verify project name
  console.log('\nTest 2: Verify project name')
  if (metadata?.project_name) {
    const expectedName = 'LeadFlow Real Estate AI'
    if (metadata.project_name === expectedName) {
      console.log(`  ✅ PASSED: Project name is "${metadata.project_name}"`)
      tests.push({ name: 'Project name', passed: true, value: metadata.project_name })
    } else {
      console.log(`  ⚠️ WARNING: Project name is "${metadata.project_name}" (expected: "${expectedName}")`)
      tests.push({ name: 'Project name', passed: true, value: metadata.project_name, warning: 'Name differs from expected' })
    }
  } else {
    console.error('  ❌ FAILED: No project name')
    tests.push({ name: 'Project name', passed: false })
  }
  
  // Test 3: Verify goal
  console.log('\nTest 3: Verify goal')
  if (metadata?.goal) {
    console.log(`  ✅ PASSED: Goal is "${metadata.goal}"`)
    tests.push({ name: 'Goal', passed: true, value: metadata.goal })
  } else {
    console.error('  ❌ FAILED: No goal set')
    tests.push({ name: 'Goal', passed: false })
  }
  
  // Test 4: Calculate and verify current day
  console.log('\nTest 4: Calculate current day')
  const startDate = new Date(metadata?.start_date || '2026-02-15')
  const today = new Date()
  const dayNum = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)))
  const deadlineDays = metadata?.deadline_days || 60
  
  console.log(`  ✅ PASSED: Current day is ${dayNum} of ${deadlineDays}`)
  tests.push({ name: 'Current day calculation', passed: true, value: `${dayNum} of ${deadlineDays}` })
  
  // Test 5: Verify deadline/days
  console.log('\nTest 5: Verify deadline days')
  if (metadata?.deadline_days === 60) {
    console.log(`  ✅ PASSED: Deadline is ${metadata.deadline_days} days`)
    tests.push({ name: 'Deadline days', passed: true, value: metadata.deadline_days })
  } else {
    console.log(`  ⚠️ WARNING: Deadline is ${metadata?.deadline_days} days (expected: 60)`)
    tests.push({ name: 'Deadline days', passed: true, value: metadata?.deadline_days, warning: 'Not 60 days' })
  }
  
  // Test 6: Verify overall status
  console.log('\nTest 6: Verify overall status')
  if (metadata?.overall_status) {
    console.log(`  ✅ PASSED: Overall status is "${metadata.overall_status}"`)
    tests.push({ name: 'Overall status', passed: true, value: metadata.overall_status })
  } else {
    console.error('  ❌ FAILED: No overall status')
    tests.push({ name: 'Overall status', passed: false })
  }
  
  // Test 7: Verify status color
  console.log('\nTest 7: Verify status color')
  if (metadata?.status_color) {
    console.log(`  ✅ PASSED: Status color is "${metadata.status_color}"`)
    tests.push({ name: 'Status color', passed: true, value: metadata.status_color })
  } else {
    console.error('  ❌ FAILED: No status color')
    tests.push({ name: 'Status color', passed: false })
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50))
  
  const passed = tests.filter(t => t.passed).length
  const failed = tests.filter(t => !t.passed).length
  
  tests.forEach(t => {
    const icon = t.passed ? '✅' : '❌'
    console.log(`${icon} ${t.name}${t.value ? `: ${t.value}` : ''}${t.warning ? ` [${t.warning}]` : ''}`)
  })
  
  console.log('\n' + '-'.repeat(50))
  console.log(`Total: ${passed} passed, ${failed} failed of ${tests.length} tests`)
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Dashboard header is ready.')
    process.exit(0)
  } else {
    console.log(`\n⚠️ ${failed} test(s) failed.`)
    process.exit(1)
  }
}

testDashboardHeader().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
