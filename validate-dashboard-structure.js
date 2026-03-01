#!/usr/bin/env node
/**
 * Validate dashboard.html structure for project_metadata header
 */

const fs = require('fs')
const path = require('path')

const dashboardPath = path.join(__dirname, 'dashboard.html')
const html = fs.readFileSync(dashboardPath, 'utf-8')

console.log('🔍 Validating dashboard.html structure\n')

const tests = []

// Test 1: Check for project-name element
console.log('Test 1: project-name element exists')
if (html.includes('id="project-name"')) {
  console.log('  ✅ PASSED: #project-name element found')
  tests.push({ name: 'project-name element', passed: true })
} else {
  console.error('  ❌ FAILED: #project-name element not found')
  tests.push({ name: 'project-name element', passed: false })
}

// Test 2: Check for project-subtitle element
console.log('\nTest 2: project-subtitle element exists')
if (html.includes('id="project-subtitle"')) {
  console.log('  ✅ PASSED: #project-subtitle element found')
  tests.push({ name: 'project-subtitle element', passed: true })
} else {
  console.error('  ❌ FAILED: #project-subtitle element not found')
  tests.push({ name: 'project-subtitle element', passed: false })
}

// Test 3: Check for project-status element
console.log('\nTest 3: project-status element exists')
if (html.includes('id="project-status"')) {
  console.log('  ✅ PASSED: #project-status element found')
  tests.push({ name: 'project-status element', passed: true })
} else {
  console.error('  ❌ FAILED: #project-status element not found')
  tests.push({ name: 'project-status element', passed: false })
}

// Test 4: Check for loadProjectMetadata function
console.log('\nTest 4: loadProjectMetadata function exists')
if (html.includes('async function loadProjectMetadata()')) {
  console.log('  ✅ PASSED: loadProjectMetadata function found')
  tests.push({ name: 'loadProjectMetadata function', passed: true })
} else {
  console.error('  ❌ FAILED: loadProjectMetadata function not found')
  tests.push({ name: 'loadProjectMetadata function', passed: false })
}

// Test 5: Check function updates project-name
console.log('\nTest 5: loadProjectMetadata updates project-name')
if (html.includes("document.getElementById('project-name').textContent")) {
  console.log('  ✅ PASSED: project-name update code found')
  tests.push({ name: 'project-name update', passed: true })
} else {
  console.error('  ❌ FAILED: project-name update code not found')
  tests.push({ name: 'project-name update', passed: false })
}

// Test 6: Check function updates project-subtitle
console.log('\nTest 6: loadProjectMetadata updates project-subtitle')
if (html.includes("document.getElementById('project-subtitle').textContent")) {
  console.log('  ✅ PASSED: project-subtitle update code found')
  tests.push({ name: 'project-subtitle update', passed: true })
} else {
  console.error('  ❌ FAILED: project-subtitle update code not found')
  tests.push({ name: 'project-subtitle update', passed: false })
}

// Test 7: Check function queries project_metadata table
console.log('\nTest 7: Queries project_metadata table')
if (html.includes(".from('project_metadata')")) {
  console.log('  ✅ PASSED: project_metadata query found')
  tests.push({ name: 'project_metadata query', passed: true })
} else {
  console.error('  ❌ FAILED: project_metadata query not found')
  tests.push({ name: 'project_metadata query', passed: false })
}

// Test 8: Check for auto-refresh (60 seconds)
console.log('\nTest 8: Auto-refresh configured')
if (html.includes('setInterval(loadAllData, 60000)')) {
  console.log('  ✅ PASSED: 60-second auto-refresh found')
  tests.push({ name: 'Auto-refresh 60s', passed: true })
} else {
  console.error('  ❌ FAILED: Auto-refresh not configured')
  tests.push({ name: 'Auto-refresh 60s', passed: false })
}

// Test 9: Check for kpi-cards element (fixed bug)
console.log('\nTest 9: kpi-cards element is on grid4 div (not h2)')
const kpiCardsMatch = html.match(/<div[^>]*id="kpi-cards"[^>]*class="grid4"/)
if (kpiCardsMatch) {
  console.log('  ✅ PASSED: kpi-cards ID is on grid4 div')
  tests.push({ name: 'kpi-cards on grid4', passed: true })
} else {
  console.error('  ❌ FAILED: kpi-cards ID not on grid4 div')
  tests.push({ name: 'kpi-cards on grid4', passed: false })
}

// Test 10: Check for day calculation
console.log('\nTest 10: Day calculation in loadProjectMetadata')
if (html.includes('const dayNum = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)))')) {
  console.log('  ✅ PASSED: Day calculation logic found')
  tests.push({ name: 'Day calculation', passed: true })
} else {
  console.error('  ❌ FAILED: Day calculation not found')
  tests.push({ name: 'Day calculation', passed: false })
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 VALIDATION SUMMARY')
console.log('='.repeat(50))

const passed = tests.filter(t => t.passed).length
const failed = tests.filter(t => !t.passed).length

tests.forEach(t => {
  const icon = t.passed ? '✅' : '❌'
  console.log(`${icon} ${t.name}`)
})

console.log('\n' + '-'.repeat(50))
console.log(`Total: ${passed} passed, ${failed} failed of ${tests.length} checks`)

if (failed === 0) {
  console.log('\n🎉 Dashboard HTML structure is valid!')
  process.exit(0)
} else {
  console.log(`\n⚠️ ${failed} check(s) failed.`)
  process.exit(1)
}
