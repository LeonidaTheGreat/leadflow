/**
 * E2E Test: analytics_events table missing fix
 * 
 * This test verifies that:
 * 1. trial-signup route uses 'events' table (not non-existent 'analytics_events')
 * 2. pilot-signup route uses 'events' table (not non-existent 'analytics_events')
 * 3. Both routes use 'event_data' column (not 'properties')
 * 4. Funnel tracking events are properly logged
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
}

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

function fail(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`)
}

// Read route files
const trialSignupPath = path.join(__dirname, '../app/api/auth/trial-signup/route.ts')
const pilotSignupPath = path.join(__dirname, '../app/api/auth/pilot-signup/route.ts')

const trialSignupContent = fs.readFileSync(trialSignupPath, 'utf8')
const pilotSignupContent = fs.readFileSync(pilotSignupPath, 'utf8')

let passed = 0
let failed = 0

console.log('\n🧪 Testing analytics_events table fix...\n')

// Test 1: trial-signup uses 'events' table
console.log('Test 1: trial-signup route uses events table (not analytics_events)')
try {
  assert(!trialSignupContent.includes("from('analytics_events')"), 'Should NOT query analytics_events table')
  assert(trialSignupContent.includes("from('events')"), 'Should query events table')
  pass('trial-signup uses events table')
  passed++
} catch (err) {
  fail(`trial-signup table check failed: ${err.message}`)
  failed++
}

// Test 2: trial-signup uses 'event_data' column
console.log('Test 2: trial-signup route uses event_data column (not properties)')
try {
  assert(!trialSignupContent.includes('properties:'), 'Should NOT use properties column')
  assert(trialSignupContent.includes('event_data:'), 'Should use event_data column')
  pass('trial-signup uses event_data column')
  passed++
} catch (err) {
  fail(`trial-signup column check failed: ${err.message}`)
  failed++
}

// Test 3: pilot-signup uses 'events' table
console.log('Test 3: pilot-signup route uses events table (not analytics_events)')
try {
  assert(!pilotSignupContent.includes("from('analytics_events')"), 'Should NOT query analytics_events table')
  assert(pilotSignupContent.includes("from('events')"), 'Should query events table')
  pass('pilot-signup uses events table')
  passed++
} catch (err) {
  fail(`pilot-signup table check failed: ${err.message}`)
  failed++
}

// Test 4: pilot-signup uses 'event_data' column
console.log('Test 4: pilot-signup route uses event_data column (not properties)')
try {
  assert(!pilotSignupContent.includes('properties:'), 'Should NOT use properties column')
  assert(pilotSignupContent.includes('event_data:'), 'Should use event_data column')
  pass('pilot-signup uses event_data column')
  passed++
} catch (err) {
  fail(`pilot-signup column check failed: ${err.message}`)
  failed++
}

// Test 5: trial-signup logs trial_started event
console.log('Test 5: trial-signup logs trial_started event')
try {
  assert(trialSignupContent.includes("event_type: 'trial_started'"), 'Should log trial_started event')
  pass('trial-signup logs trial_started event')
  passed++
} catch (err) {
  fail(`trial_started event check failed: ${err.message}`)
  failed++
}

// Test 6: pilot-signup logs pilot_started event
console.log('Test 6: pilot-signup logs pilot_started event')
try {
  assert(pilotSignupContent.includes("event_type: 'pilot_started'"), 'Should log pilot_started event')
  pass('pilot-signup logs pilot_started event')
  passed++
} catch (err) {
  fail(`pilot_started event check failed: ${err.message}`)
  failed++
}

// Test 7: Events are logged non-blocking (don't fail signup)
console.log('Test 7: Event logging is non-blocking (does not fail signup on error)')
try {
  assert(trialSignupContent.includes('.catch('), 'trial-signup should have error handling')
  assert(pilotSignupContent.includes('.catch('), 'pilot-signup should have error handling')
  assert(trialSignupContent.includes('void Promise.resolve'), 'trial-signup should use void Promise.resolve for non-blocking')
  assert(pilotSignupContent.includes('void Promise.resolve'), 'pilot-signup should use void Promise.resolve for non-blocking')
  pass('Event logging is non-blocking with error handling')
  passed++
} catch (err) {
  fail(`Non-blocking check failed: ${err.message}`)
  failed++
}

// Test 8: UTM parameters are included in event data
console.log('Test 8: UTM parameters are included in event data')
try {
  assert(trialSignupContent.includes('utm_source:') && trialSignupContent.includes('utm_medium:'), 
    'trial-signup should include UTM params in event data')
  assert(pilotSignupContent.includes('utm_source:') && pilotSignupContent.includes('utm_medium:'), 
    'pilot-signup should include UTM params in event data')
  pass('UTM parameters included in event data')
  passed++
} catch (err) {
  fail(`UTM params check failed: ${err.message}`)
  failed++
}

// Summary
console.log('\n' + '='.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('='.repeat(60))
console.log(`Total: ${passed + failed}`)
console.log(`${colors.green}Passed: ${passed}${colors.reset}`)
console.log(`${colors.red}Failed: ${failed}${colors.reset}`)

if (failed > 0) {
  console.log('\n❌ TESTS FAILED')
  process.exit(1)
} else {
  console.log('\n✅ ALL TESTS PASSED')
  process.exit(0)
}
