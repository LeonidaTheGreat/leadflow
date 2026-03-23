/**
 * Test: fix-no-evidence-of-wizard-auto-trigger-implementation
 * Task ID: 88bb001a-26f8-4035-a1a0-b9dd8ed619c1
 *
 * Tests that the onboarding wizard appears automatically as an overlay
 * when onboarding_completed=false on the dashboard page.
 *
 * This verifies AC-3 from the PRD: "Setup Wizard overlay appears automatically
 * (onboarding_completed=false)"
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')

let passed = 0
let failed = 0
const failures = []

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
    failures.push(label)
  }
}

function section(name) {
  console.log(`\n📋 ${name}`)
}

// ── 1. Dashboard page checks onboarding_completed ───────────────────────────

section('Dashboard page: onboarding status check')

const dashboardPage = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx'), 'utf8'
)

check('Dashboard is a client component', dashboardPage.includes("'use client'"))
check('Imports OnboardingWizardOverlay', dashboardPage.includes('OnboardingWizardOverlay'))
check('Checks onboardingCompleted status', dashboardPage.includes('onboardingCompleted'))
check('Has showWizard state', dashboardPage.includes('showWizard'))
check('Conditionally renders wizard overlay', dashboardPage.includes('showWizard &&'))
check('Calls /api/setup/status endpoint', dashboardPage.includes('/api/setup/status'))
check('Uses localStorage/sessionStorage for user data', dashboardPage.includes('localStorage') && dashboardPage.includes('sessionStorage'))

// ── 2. OnboardingGuard no longer redirects to /setup ────────────────────────

section('OnboardingGuard: updated behavior')

const onboardingGuard = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'components/onboarding-guard.tsx'), 'utf8'
)

check('OnboardingGuard no longer redirects to /setup', !onboardingGuard.includes("router.replace('/setup')"))
check('Comment explains new behavior', onboardingGuard.includes('OnboardingWizardOverlay') || onboardingGuard.includes('dashboard page'))
check('Still handles auth redirects', onboardingGuard.includes("router.replace('/login')"))
check('No longer checks onboardingCompleted for redirects', !onboardingGuard.includes('onboardingCompleted === false'))

// ── 3. OnboardingWizardOverlay component exists ─────────────────────────────

section('OnboardingWizardOverlay component')

const overlayPath = path.join(DASHBOARD_DIR, 'components/onboarding-wizard-overlay.tsx')
check('OnboardingWizardOverlay component exists', fs.existsSync(overlayPath))

if (fs.existsSync(overlayPath)) {
  const overlayComponent = fs.readFileSync(overlayPath, 'utf8')
  
  check('Component is a client component', overlayComponent.includes("'use client'"))
  check('Renders as a fixed overlay', overlayComponent.includes('fixed inset-0'))
  check('Has high z-index (z-50)', overlayComponent.includes('z-50'))
  check('Has backdrop blur', overlayComponent.includes('backdrop-blur'))
  check('Has dark backdrop', overlayComponent.includes('bg-slate-900/'))
  check('Imports setup steps', overlayComponent.includes('SetupFUB') && overlayComponent.includes('SetupTwilio'))
  check('Handles onComplete callback', overlayComponent.includes('onComplete'))
  check('Handles onDismiss callback', overlayComponent.includes('onDismiss'))
  check('Calls /api/setup/status', overlayComponent.includes('/api/setup/status'))
  check('Calls /api/setup/complete', overlayComponent.includes('/api/setup/complete'))
  check('Has loading state', overlayComponent.includes('loading'))
  check('Has smooth transitions', overlayComponent.includes('transition-opacity') || overlayComponent.includes('duration-300'))
}

// ── 4. Dashboard layout comment updated ─────────────────────────────────────

section('Dashboard layout: updated comments')

const dashboardLayout = fs.readFileSync(
  path.join(DASHBOARD_DIR, 'app/dashboard/layout.tsx'), 'utf8'
)

check('Comment mentions overlay behavior', dashboardLayout.includes('overlay') || dashboardLayout.includes('dashboard page'))
check('Does not mention redirect to /setup', !dashboardLayout.includes("redirects to /setup"))

// ── 5. Integration: Full flow verification ──────────────────────────────────

section('Integration: Full auto-trigger flow')

// Verify the complete flow is implemented:
// 1. User logs in → gets onboardingCompleted flag
// 2. User visits /dashboard → page checks onboardingCompleted
// 3. If false → OnboardingWizardOverlay is rendered
// 4. User completes wizard → onComplete updates state and hides overlay

check('Login API returns onboardingCompleted', (() => {
  const loginRoute = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/login/route.ts'), 'utf8'
  )
  return loginRoute.includes('onboardingCompleted') && loginRoute.includes('onboarding_completed')
})())

check('Dashboard handles wizard completion', dashboardPage.includes('handleWizardComplete'))
check('Dashboard updates cached user on completion', dashboardPage.includes('onboardingCompleted = true'))

// ── Summary ─────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60))
console.log('📊 TEST SUMMARY')
console.log('═'.repeat(60))
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`)

if (failures.length > 0) {
  console.log('\n❌ Failures:')
  failures.forEach(f => console.log(`  • ${f}`))
}

console.log('═'.repeat(60))

if (failed > 0) {
  process.exit(1)
}
