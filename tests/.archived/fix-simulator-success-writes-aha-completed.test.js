const assert = require('assert')
const fs = require('fs')
const path = require('path')

const simulatorRoutePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/onboarding/simulator/route.ts'
)

const onboardingCompletePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/onboarding/complete/route.ts'
)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (error) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${error.message}`)
    failed++
  }
}

console.log('\n=== Regression Test: simulator success writes aha_completed ===\n')

const simulatorContent = fs.readFileSync(simulatorRoutePath, 'utf8')
const completeContent = fs.readFileSync(onboardingCompletePath, 'utf8')

test('simulator status success block updates real_estate_agents', () => {
  assert.ok(
    simulatorContent.includes(".from('real_estate_agents')") &&
      simulatorContent.includes('aha_completed: true'),
    'simulator success must update real_estate_agents.aha_completed=true'
  )
})

test('simulator status success block persists response time telemetry', () => {
  assert.ok(
    simulatorContent.includes('aha_response_time_ms: derived.response_time_ms'),
    'simulator success must persist aha_response_time_ms'
  )
})

test('onboarding completion route does not downgrade aha_completed from stale false payload', () => {
  assert.ok(
    completeContent.includes('if (completionPayload.ahaCompleted === true)'),
    'onboarding completion should only persist aha_completed when payload is true'
  )
})

console.log('\n============================================================')
console.log('📊 TEST REPORT — simulator success aha persistence')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log('============================================================')

if (failed > 0) {
  process.exit(1)
}
