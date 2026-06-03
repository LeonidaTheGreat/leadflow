#!/usr/bin/env node
/**
 * verify-distribution-loop-fix.js
 *
 * Verification script for the distribution loop fix (PRD-DISTRIBUTION-LOOP-FIX).
 * 
 * Changes made to ~/projects/genome/scripts/distribution-collector.js:
 * - REQ-1: UC Completion Gate (already implemented)
 * - REQ-2: Increased cooldown from 30 min to 48 hours
 * - REQ-3: Removed 'status=active' filter for landing page check
 * - REQ-4: Added detailed logging for skipped issues
 *
 * This script verifies that the distribution-collector.js has been updated correctly.
 */

const fs = require('fs')
const path = require('path')

const distributionCollectorPath = path.join(
  require('os').homedir(),
  '.openclaw',
  'genome',
  'scripts',
  'distribution-collector.js'
)

console.log('Distribution Loop Fix Verification')
console.log('==================================\n')

try {
  const content = fs.readFileSync(distributionCollectorPath, 'utf8')

  let passed = 0
  let total = 0

  // Check 1: 48-hour cooldown
  total++
  if (content.includes('48 * 60 * 60 * 1000') || content.includes('fortyEightHoursAgo')) {
    console.log('✅ REQ-2 PASS: 48-hour cooldown check implemented')
    passed++
  } else {
    console.log('❌ REQ-2 FAIL: 48-hour cooldown not found')
  }

  // Check 2: Loosened channel check (no .eq('status', 'active') on landing page)
  total++
  const landingPageSection = content.substring(
    content.indexOf('Check if a landing page exists'),
    content.indexOf('Check recent traffic')
  )
  if (!landingPageSection.includes(".eq('status', 'active')") &&
      landingPageSection.includes("channel_type', 'landing_page'")) {
    console.log('✅ REQ-3 PASS: Landing page channel check loosened (any status)')
    passed++
  } else {
    console.log('❌ REQ-3 FAIL: Landing page check still filters by active status')
  }

  // Check 3: UC completion logging
  total++
  if (content.includes("[Distribution] Skipping") && content.includes('is complete')) {
    console.log('✅ REQ-4 PASS: UC completion gate logging implemented')
    passed++
  } else {
    console.log('❌ REQ-4 FAIL: UC completion logging not found')
  }

  // Check 4: Cooldown logging
  total++
  if (content.includes('within 48h')) {
    console.log('✅ REQ-4 PASS: Cooldown skip logging implemented')
    passed++
  } else {
    console.log('❌ REQ-4 FAIL: Cooldown logging not found')
  }

  // Check 5: Proper query structure for cooldown
  total++
  if (content.includes("eq('use_case_id', template.use_case_id)") &&
      content.includes("gte('created_at', fortyEightHoursAgo)")) {
    console.log('✅ REQ-2 PASS: Cooldown query uses use_case_id and 48h threshold')
    passed++
  } else {
    console.log('❌ REQ-2 FAIL: Cooldown query structure incorrect')
  }

  console.log(`\nTotal: ${passed}/${total} requirements verified`)
  
  if (passed === total) {
    console.log('\n✅ All requirements implemented correctly!')
    process.exit(0)
  } else {
    console.log('\n❌ Some requirements are missing or incorrect')
    process.exit(1)
  }

} catch (err) {
  console.error('Error reading distribution-collector.js:', err.message)
  console.log('\nPath checked:', distributionCollectorPath)
  process.exit(1)
}
