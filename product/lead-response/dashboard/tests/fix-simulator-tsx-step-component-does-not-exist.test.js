/**
 * E2E Test: fix-simulator-tsx-step-component-does-not-exist
 * Task ID: 9e47031f-5799-4d6c-96f8-630b4312cdbc
 *
 * Verifies:
 * 1. onboarding/steps/simulator.tsx exists and is a valid React component
 * 2. page.tsx wires simulator as step 6 (6-step onboarding flow)
 * 3. API start action no longer requires sessionId
 * 4. confirmation.tsx shows Aha Moment Simulator status
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const APP_DIR = path.resolve(__dirname, '../app')
const ONBOARDING_DIR = path.join(APP_DIR, 'onboarding')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${err.message}`)
    failed++
  }
}

console.log('\n=== E2E: simulator.tsx step component exists ===\n')

// ── 1. simulator.tsx exists ──────────────────────────────────────────────────
test('onboarding/steps/simulator.tsx exists', () => {
  const p = path.join(ONBOARDING_DIR, 'steps/simulator.tsx')
  assert.ok(fs.existsSync(p), `File not found: ${p}`)
})

// ── 2. Default export ────────────────────────────────────────────────────────
test('simulator.tsx has a default export (React component)', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'steps/simulator.tsx'), 'utf8')
  assert.ok(content.includes('export default'), 'No default export')
})

// ── 3. Required props ────────────────────────────────────────────────────────
test('simulator.tsx accepts onNext, onBack, agentData, setAgentData props', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'steps/simulator.tsx'), 'utf8')
  assert.ok(content.includes('onNext'), 'Missing onNext prop')
  assert.ok(content.includes('onBack'), 'Missing onBack prop')
  assert.ok(content.includes('agentData'), 'Missing agentData prop')
  assert.ok(content.includes('setAgentData'), 'Missing setAgentData prop')
})

// ── 4. page.tsx imports OnboardingSimulator ──────────────────────────────────
test('onboarding/page.tsx imports OnboardingSimulator from ./steps/simulator', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'page.tsx'), 'utf8')
  assert.ok(
    content.includes("import OnboardingSimulator from './steps/simulator'"),
    'OnboardingSimulator import missing'
  )
})

// ── 5. page.tsx has 6-step flow including simulator ─────────────────────────
test("onboarding/page.tsx step array includes 'simulator' as 6th step", () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'page.tsx'), 'utf8')
  assert.ok(content.includes("'simulator'"), "step type 'simulator' missing")
  // Verify 6 steps total
  const stepsMatch = content.match(/'welcome'.*'agent-info'.*'calendar'.*'sms'.*'confirmation'.*'simulator'/)
  assert.ok(stepsMatch, 'Step order is wrong or steps missing')
})

// ── 6. page.tsx renders OnboardingSimulator ──────────────────────────────────
test('onboarding/page.tsx renders <OnboardingSimulator> in JSX', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'page.tsx'), 'utf8')
  assert.ok(content.includes('<OnboardingSimulator'), 'OnboardingSimulator not rendered in JSX')
  assert.ok(content.includes("currentStep === 'simulator'"), "No conditional render for simulator step")
})

// ── 7. confirmation.tsx shows simulator status ───────────────────────────────
test('confirmation.tsx shows Aha Moment Simulator status row', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'steps/confirmation.tsx'), 'utf8')
  assert.ok(
    content.includes('Aha Moment Simulator') || content.includes('simulatorCompleted'),
    'Simulator status not shown in confirmation'
  )
  assert.ok(content.includes('simulatorCompleted'), 'simulatorCompleted field not referenced')
  assert.ok(content.includes('simulatorSkipped'), 'simulatorSkipped field not referenced')
})

// ── 8. API: sessionId not required for 'start' ───────────────────────────────
test("API route: start action does NOT require sessionId", () => {
  const content = fs.readFileSync(
    path.join(APP_DIR, 'api/onboarding/simulator/route.ts'),
    'utf8'
  )
  // Old broken validation required sessionId unconditionally
  assert.ok(!content.includes("if (!action || !agentId || !sessionId)"), 'Old broken validation still present')
  // New validation: only action + agentId required at top level
  assert.ok(content.includes("if (!action || !agentId)"), 'New validation missing')
  // sessionId only required for status/skip
  assert.ok(
    content.includes("action === 'status' || action === 'skip'"),
    'Conditional sessionId check for status/skip missing'
  )
})

// ── 9. simulator.tsx calls /api/onboarding/simulator ────────────────────────
test('simulator.tsx makes requests to /api/onboarding/simulator', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'steps/simulator.tsx'), 'utf8')
  assert.ok(content.includes('/api/onboarding/simulator'), 'No API call in simulator component')
})

// ── 10. No hardcoded secrets ─────────────────────────────────────────────────
test('simulator.tsx has no hardcoded secrets', () => {
  const content = fs.readFileSync(path.join(ONBOARDING_DIR, 'steps/simulator.tsx'), 'utf8')
  const patterns = [/sk_live_\w+/, /sk_test_\w+/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/]
  for (const p of patterns) {
    assert.ok(!p.test(content), `Potential secret matches pattern ${p}`)
  }
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('\n============================================================')
console.log('📊 E2E TEST REPORT — simulator.tsx step component')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
console.log('============================================================')

if (failed > 0) {
  console.log('\n❌ VERDICT: REJECTED')
  process.exit(1)
} else {
  console.log('\n✅ VERDICT: APPROVED')
}
