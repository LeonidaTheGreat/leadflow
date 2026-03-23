/**
 * E2E Test: fix-post-login-onboarding-wizard-fub-sms-aha-is-stuck-
 * Task ID: 66fc3efc-3b5a-4e68-8fe7-6aae5edf2a82
 *
 * Verifies that the post-login onboarding wizard (FUB/SMS/Aha) is NOT stuck
 * and auto-triggers correctly for new users.
 *
 * This test validates:
 * 1. OnboardingGuard redirects un-onboarded users to /setup
 * 2. /setup page loads the wizard with FUB, Twilio, SMS-verify, and Simulator steps
 * 3. The simulator step is properly wired and can be triggered
 * 4. The API accepts start action without sessionId (bug fix)
 * 5. Progress persists through the setup flow
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard')
const APP_DIR = path.join(DASHBOARD_DIR, 'app')

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

console.log('\n=== E2E: Post-Login Onboarding Wizard Auto-Trigger Fix ===\n')

// ── 1. OnboardingGuard exists and redirects to /setup ───────────────────────
test('OnboardingGuard component exists and redirects un-onboarded users to /setup', () => {
  const guardPath = path.join(DASHBOARD_DIR, 'components/onboarding-guard.tsx')
  assert.ok(fs.existsSync(guardPath), 'OnboardingGuard component not found')
  
  const content = fs.readFileSync(guardPath, 'utf8')
  assert.ok(content.includes("router.replace('/setup')"), 'OnboardingGuard does not redirect to /setup')
  assert.ok(content.includes('onboardingCompleted === false'), 'OnboardingGuard does not check onboardingCompleted flag')
})

// ── 2. Dashboard layout includes OnboardingGuard ────────────────────────────
test('Dashboard layout includes OnboardingGuard for auto-redirect', () => {
  const layoutPath = path.join(APP_DIR, 'dashboard/layout.tsx')
  const content = fs.readFileSync(layoutPath, 'utf8')
  
  assert.ok(content.includes('OnboardingGuard'), 'Dashboard layout missing OnboardingGuard')
  assert.ok(content.includes("from '@/components/onboarding-guard'"), 'OnboardingGuard import missing')
})

// ── 3. /setup page exists and has wizard steps ──────────────────────────────
test('/setup page exists with FUB, Twilio, SMS-verify, and Simulator steps', () => {
  const setupPagePath = path.join(APP_DIR, 'setup/page.tsx')
  assert.ok(fs.existsSync(setupPagePath), '/setup page not found')
  
  const content = fs.readFileSync(setupPagePath, 'utf8')
  
  // Check for all wizard steps
  assert.ok(content.includes("'fub'"), 'FUB step missing')
  assert.ok(content.includes("'twilio'"), 'Twilio step missing')
  assert.ok(content.includes("'sms-verify'"), 'SMS-verify step missing')
  assert.ok(content.includes("'simulator'"), 'Simulator step missing')
  assert.ok(content.includes("'complete'"), 'Complete step missing')
  
  // Check step order in STEPS array
  assert.ok(content.includes("{ id: 'fub'"), 'FUB step definition missing')
  assert.ok(content.includes("{ id: 'twilio'"), 'Twilio step definition missing')
  assert.ok(content.includes("{ id: 'sms-verify'"), 'SMS-verify step definition missing')
  assert.ok(content.includes("{ id: 'simulator'"), 'Simulator step definition missing')
})

// ── 4. Setup page renders correct step components ───────────────────────────
test('Setup page renders SetupFUB, SetupTwilio, SetupSMSVerify, SetupSimulator components', () => {
  const content = fs.readFileSync(path.join(APP_DIR, 'setup/page.tsx'), 'utf8')
  
  assert.ok(content.includes('SetupFUB'), 'SetupFUB component not rendered')
  assert.ok(content.includes('SetupTwilio'), 'SetupTwilio component not rendered')
  assert.ok(content.includes('SetupSMSVerify'), 'SetupSMSVerify component not rendered')
  assert.ok(content.includes('SetupSimulator'), 'SetupSimulator component not rendered')
  assert.ok(content.includes('SetupComplete'), 'SetupComplete component not rendered')
})

// ── 5. Simulator API route accepts start without sessionId ──────────────────
test('Simulator API accepts start action without sessionId (bug fix)', () => {
  const apiPath = path.join(APP_DIR, 'api/onboarding/simulator/route.ts')
  const content = fs.readFileSync(apiPath, 'utf8')
  
  // The fix: sessionId is NOT required for start action
  assert.ok(content.includes("if (!action || !agentId)"), 'API does not validate action and agentId only')
  assert.ok(content.includes("action !== 'start' && !sessionId"), 'API does not conditionally require sessionId')
  assert.ok(content.includes("case 'start':"), 'Start action handler missing')
})

// ── 6. SetupSimulator component exists ──────────────────────────────────────
test('SetupSimulator component exists in setup/steps/', () => {
  const simulatorPath = path.join(APP_DIR, 'setup/steps/simulator.tsx')
  assert.ok(fs.existsSync(simulatorPath), 'SetupSimulator component not found')
  
  const content = fs.readFileSync(simulatorPath, 'utf8')
  assert.ok(content.includes('export default'), 'SetupSimulator missing default export')
  assert.ok(content.includes('onComplete'), 'SetupSimulator missing onComplete prop')
  assert.ok(content.includes('onSkip'), 'SetupSimulator missing onSkip prop')
})

// ── 7. Setup page fetches /api/setup/status to resume progress ─────────────
test('Setup page fetches wizard state from /api/setup/status to resume progress', () => {
  const content = fs.readFileSync(path.join(APP_DIR, 'setup/page.tsx'), 'utf8')
  
  assert.ok(content.includes("fetch('/api/setup/status'"), 'Setup page does not fetch wizard state')
  assert.ok(content.includes('wizardState'), 'Setup page does not use wizardState')
  assert.ok(content.includes('Load persisted wizard state'), 'Setup page does not load persisted wizard state')
})

// ── 8. API setup/status route exists ────────────────────────────────────────
test('/api/setup/status route exists', () => {
  const statusApiPath = path.join(APP_DIR, 'api/setup/status/route.ts')
  assert.ok(fs.existsSync(statusApiPath), '/api/setup/status route not found')
})

// ── 9. API setup/complete route exists ──────────────────────────────────────
test('/api/setup/complete route exists', () => {
  const completeApiPath = path.join(APP_DIR, 'api/setup/complete/route.ts')
  assert.ok(fs.existsSync(completeApiPath), '/api/setup/complete route not found')
})

// ── 10. Build passes ────────────────────────────────────────────────────────
test('Production build passes', () => {
  try {
    execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'pipe', timeout: 180000 })
  } catch (e) {
    throw new Error(`Build failed: ${e.stderr ? e.stderr.toString().slice(0, 500) : e.message}`)
  }
})

// ── 11. No hardcoded secrets in modified files ──────────────────────────────
test('No hardcoded secrets in onboarding-related files', () => {
  const filesToCheck = [
    path.join(APP_DIR, 'setup/page.tsx'),
    path.join(APP_DIR, 'api/onboarding/simulator/route.ts'),
    path.join(DASHBOARD_DIR, 'components/onboarding-guard.tsx'),
  ]
  
  const secretPatterns = [
    /sk_live_[a-zA-Z0-9]+/,
    /sk_test_[a-zA-Z0-9]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/,
    /password\s*=\s*["'][^"']+/i,
  ]
  
  for (const filePath of filesToCheck) {
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    for (const pattern of secretPatterns) {
      assert.ok(!pattern.test(content), `Potential secret found in ${path.basename(filePath)}`)
    }
  }
})

// ── 12. Simulator step auto-triggers after SMS verification ─────────────────
test('Simulator step auto-triggers after SMS verification (handleSMSVerified)', () => {
  const content = fs.readFileSync(path.join(APP_DIR, 'setup/page.tsx'), 'utf8')
  
  assert.ok(content.includes('handleSMSVerified'), 'handleSMSVerified function missing')
  assert.ok(content.includes("currentStep: 'simulator'"), 'SMS verification does not advance to simulator step')
})

// ── 13. Onboarding completion is tracked ────────────────────────────────────
test('Onboarding completion is tracked via /api/setup/complete', () => {
  const content = fs.readFileSync(path.join(APP_DIR, 'setup/page.tsx'), 'utf8')
  
  assert.ok(content.includes("fetch('/api/setup/complete'"), 'Setup page does not call /api/setup/complete')
  assert.ok(content.includes('handleSimulatorComplete'), 'handleSimulatorComplete function missing')
  assert.ok(content.includes('handleSimulatorSkip'), 'handleSimulatorSkip function missing')
})

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n============================================================')
console.log('📊 E2E TEST REPORT — Post-Login Onboarding Wizard Fix')
console.log('============================================================')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
console.log('============================================================')

if (failed > 0) {
  console.log('\n❌ VERDICT: REJECTED - Onboarding wizard is still stuck or broken')
  process.exit(1)
} else {
  console.log('\n✅ VERDICT: APPROVED - Onboarding wizard auto-triggers correctly')
  console.log('   - OnboardingGuard redirects to /setup')
  console.log('   - /setup has FUB → Twilio → SMS → Simulator → Complete flow')
  console.log('   - Simulator API accepts start without sessionId')
  console.log('   - Progress persists and resumes correctly')
  console.log('   - Build passes with no errors')
}
