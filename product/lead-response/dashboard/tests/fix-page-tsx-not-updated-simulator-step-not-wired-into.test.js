/**
 * E2E Test: fix-page-tsx-not-updated-simulator-step-not-wired-into
 * Verifies: simulator step is wired into the onboarding wizard page.tsx (6 steps)
 */
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD = path.join(__dirname, '../app/onboarding')

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

// ── 1. simulator.tsx exists ──────────────────────────────────────────────────
test('simulator.tsx step component exists', () => {
  const simulatorPath = path.join(DASHBOARD, 'steps/simulator.tsx')
  assert.ok(fs.existsSync(simulatorPath), 'steps/simulator.tsx not found')
})

// ── 2. simulator.tsx exports default OnboardingSimulator ────────────────────
test('simulator.tsx has default export', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'steps/simulator.tsx'), 'utf8')
  assert.ok(src.includes('export default function OnboardingSimulator'), 'Missing default export for OnboardingSimulator')
})

// ── 3. page.tsx imports OnboardingSimulator ──────────────────────────────────
test('page.tsx imports OnboardingSimulator', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  assert.ok(src.includes("import OnboardingSimulator from './steps/simulator'"), 'Missing import for OnboardingSimulator')
})

// ── 4. page.tsx has 6-step type including simulator ─────────────────────────
test('OnboardingStep type includes simulator', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  assert.ok(
    src.includes("type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'"),
    'OnboardingStep type missing simulator'
  )
})

// ── 5. steps array has 6 steps with simulator between sms and confirmation ──
test('steps array contains 6 steps with simulator in correct position', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  const match = src.match(/const steps.*=.*\[([^\]]+)\]/)
  assert.ok(match, 'Could not find steps array')
  const stepsStr = match[1]
  const steps = stepsStr.match(/'[^']+'/g).map(s => s.replace(/'/g, ''))
  assert.deepStrictEqual(steps, ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation'],
    `Expected 6 steps with simulator, got: [${steps.join(', ')}]`)
})

// ── 6. page.tsx renders OnboardingSimulator when currentStep === 'simulator' ─
test('page.tsx renders simulator step in JSX', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  assert.ok(src.includes("currentStep === 'simulator'"), 'Missing conditional render for simulator step')
  assert.ok(src.includes('<OnboardingSimulator'), 'Missing <OnboardingSimulator> in JSX')
})

// ── 7. agentData has aha moment fields ──────────────────────────────────────
test('agentData initializes ahaCompleted, ahaResponseTimeMs, ahaSkipped fields', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  assert.ok(src.includes('ahaCompleted: false'), 'Missing ahaCompleted in agentData')
  assert.ok(src.includes('ahaResponseTimeMs'), 'Missing ahaResponseTimeMs in agentData')
  assert.ok(src.includes('ahaSkipped: false'), 'Missing ahaSkipped in agentData')
})

// ── 8. completeOnboarding() includes aha_moment_completed in payload ─────────
test('completeOnboarding sends aha_moment_completed in POST body', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'page.tsx'), 'utf8')
  assert.ok(src.includes('aha_moment_completed'), 'Missing aha_moment_completed in onboard payload (FR-8 not met)')
})

// ── 9. confirmation.tsx shows Aha Moment status ───────────────────────────────
test('confirmation.tsx shows Aha Moment status section', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'steps/confirmation.tsx'), 'utf8')
  assert.ok(src.includes('ahaCompleted'), 'confirmation.tsx does not reference ahaCompleted')
  assert.ok(src.includes('ahaSkipped'), 'confirmation.tsx does not reference ahaSkipped')
  assert.ok(src.includes('ahaResponseTimeMs'), 'confirmation.tsx does not reference ahaResponseTimeMs')
})

// ── 10. simulator API route exists ───────────────────────────────────────────
test('simulator API route exists at /api/onboarding/simulator/route.ts', () => {
  const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts')
  assert.ok(fs.existsSync(routePath), 'API route not found')
})

// ── 11. simulator API handles start/status/skip actions ─────────────────────
test('simulator API route handles start, status, skip actions', () => {
  const src = fs.readFileSync(path.join(__dirname, '../app/api/onboarding/simulator/route.ts'), 'utf8')
  assert.ok(src.includes("'start'"), 'API missing start action handler')
  assert.ok(src.includes("'status'"), 'API missing status action handler')
  assert.ok(src.includes("'skip'"), 'API missing skip action handler')
})

// ── 12. simulator.tsx polls for status while running ────────────────────────
test('simulator.tsx has polling logic for status updates', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'steps/simulator.tsx'), 'utf8')
  assert.ok(src.includes('setInterval'), 'simulator.tsx missing setInterval polling')
  assert.ok(src.includes("action: 'status'"), 'simulator.tsx missing status check call')
})

// ── 13. skip button calls API and advances onboarding ───────────────────────
test('simulator.tsx skip button sets ahaSkipped=true and calls onNext', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'steps/simulator.tsx'), 'utf8')
  assert.ok(src.includes("action: 'skip'"), 'simulator.tsx missing skip API call')
  assert.ok(src.includes('ahaSkipped: true'), 'simulator.tsx missing ahaSkipped: true on skip')
  assert.ok(src.includes('onNext()'), 'simulator.tsx missing onNext() call after skip')
})

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n============================================================')
console.log('📊 E2E TEST REPORT — simulator step wired into wizard')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
console.log('============================================================')

if (failed > 0) {
  process.exit(1)
}
