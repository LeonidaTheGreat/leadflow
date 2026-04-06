const assert = require('assert')
const fs = require('fs')
const path = require('path')

const routePath = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/setup/complete/route.ts'
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

console.log('\n=== Regression Test: setup completion persists aha_completed ===\n')

const content = fs.readFileSync(routePath, 'utf8')

test('setup completion route reads simulatorCompleted from request body', () => {
  assert.ok(
    content.includes('const { fubConnected, smsConnected, simulatorCompleted } = await request.json()'),
    'setup completion route must read simulatorCompleted from the request body'
  )
})

test('setup completion route maps simulatorCompleted to aha_completed', () => {
  assert.ok(
    content.includes("if (typeof simulatorCompleted === 'boolean')") &&
      content.includes('updateData.aha_completed = simulatorCompleted'),
    'setup completion route must persist simulatorCompleted into real_estate_agents.aha_completed'
  )
})

test('setup completion route still marks onboarding as complete', () => {
  assert.ok(
    content.includes('onboarding_completed: true') &&
      content.includes('onboarding_completed_at: new Date().toISOString()'),
    'setup completion route must continue setting onboarding completion fields'
  )
})

console.log('\n============================================================')
console.log('📊 TEST REPORT — setup completion aha persistence')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log('============================================================')

if (failed > 0) {
  process.exit(1)
}
