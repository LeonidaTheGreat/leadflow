/**
 * E2E Test: FR-5 — Dashboard auto-launches OnboardingWizardOverlay
 * Task: cb273b36-e08a-48a2-9986-bb2556c3f531
 *
 * Acceptance criteria:
 * - OnboardingWizardLauncher renders OnboardingWizardOverlay (not a banner)
 * - Overlay appears automatically when onboarding_completed=false (no click needed)
 * - Banner implementation (collapsed/expand, redirect to /onboarding) is GONE
 * - Dashboard page.tsx still imports OnboardingWizardLauncher (no rename needed)
 * - sessionStorage dismissal pattern is used (not localStorage collapse)
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')
const LAUNCHER_FILE = path.join(DASHBOARD_DIR, 'components/dashboard/OnboardingWizardLauncher.tsx')
const OVERLAY_FILE = path.join(DASHBOARD_DIR, 'components/onboarding-wizard-overlay.tsx')
const DASHBOARD_PAGE = path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx')

let passed = 0
let failed = 0
const failures = []

function pass(label) {
  console.log(`  PASS: ${label}`)
  passed++
}

function fail(label, detail) {
  console.error(`  FAIL: ${label}${detail ? ' — ' + detail : ''}`)
  failed++
  failures.push(label)
}

function check(label, condition, detail = '') {
  if (condition) pass(label)
  else fail(label, detail)
}

console.log('\n=== FR-5: OnboardingWizardOverlay Auto-Launch QC Test ===\n')

// ── 1. File existence ────────────────────────────────────────────────────────

console.log('1. Required files exist')

check('OnboardingWizardLauncher.tsx exists', fs.existsSync(LAUNCHER_FILE))
check('onboarding-wizard-overlay.tsx exists', fs.existsSync(OVERLAY_FILE))
check('dashboard/page.tsx exists', fs.existsSync(DASHBOARD_PAGE))

// ── 2. OnboardingWizardLauncher: must render OnboardingWizardOverlay ─────────

console.log('\n2. OnboardingWizardLauncher renders OnboardingWizardOverlay (not banner)')

const launcher = fs.readFileSync(LAUNCHER_FILE, 'utf8')

check(
  'imports OnboardingWizardOverlay',
  launcher.includes("import { OnboardingWizardOverlay }") || launcher.includes("import {OnboardingWizardOverlay}"),
  'Must import from @/components/onboarding-wizard-overlay'
)

check(
  'renders <OnboardingWizardOverlay',
  launcher.includes('<OnboardingWizardOverlay'),
  'Must render the overlay component directly'
)

check(
  'passes onComplete handler',
  launcher.includes('onComplete={'),
  'OnboardingWizardOverlay requires onComplete prop'
)

check(
  'passes onDismiss handler',
  launcher.includes('onDismiss={'),
  'OnboardingWizardOverlay should receive onDismiss for user-initiated close'
)

// ── 3. FR-5: Auto-launch — no click required ─────────────────────────────────

console.log('\n3. FR-5: Overlay auto-launches (no click required)')

check(
  'Sets showOverlay=true when onboardingCompleted=false',
  launcher.includes('setShowOverlay(true)') || launcher.includes('setShowOverlay( true )'),
  'Must set state to show overlay automatically from API response'
)

check(
  'Fetches /api/auth/trial-status to check onboardingCompleted',
  launcher.includes('/api/auth/trial-status'),
  'Must poll trial-status to determine if overlay should show'
)

check(
  'Checks !data.onboardingCompleted to trigger overlay',
  launcher.includes('!data.onboardingCompleted') || launcher.includes('onboardingCompleted') && launcher.includes('false'),
  'Must auto-show overlay when onboardingCompleted is false'
)

// ── 4. No banner pattern — must not redirect or collapse ─────────────────────

console.log('\n4. Old banner implementation is gone')

check(
  'No redirect to /onboarding (banner pattern removed)',
  !launcher.includes("window.location.href = '/onboarding'") && !launcher.includes("href='/onboarding'"),
  'Banner used window.location.href to redirect — overlay does not'
)

check(
  'No localStorage collapse pattern (banner pattern removed)',
  !launcher.includes('onboarding-launcher-collapsed') && !launcher.includes('localStorage.setItem'),
  'Banner used localStorage collapse — overlay uses sessionStorage dismiss'
)

check(
  'No Rocket/ChevronRight banner icons imported',
  !launcher.includes("import { Rocket") && !launcher.includes("Rocket,"),
  'Rocket icon was part of the old banner implementation'
)

check(
  'No "Continue Setup" button CTA (banner pattern removed)',
  !launcher.includes('"Continue Setup"') && !launcher.includes("'Continue Setup'"),
  'Banner had a "Continue Setup" CTA button — overlay does not need one'
)

// ── 5. sessionStorage dismissal (session-scoped, not permanent) ──────────────

console.log('\n5. Dismissal uses sessionStorage (session-scoped)')

check(
  'sessionStorage used for dismissed state',
  launcher.includes('sessionStorage'),
  'Must use sessionStorage so overlay re-appears on new session'
)

check(
  'localStorage NOT used for dismissed state',
  !launcher.includes('localStorage.setItem') && !launcher.includes('localStorage.getItem'),
  'localStorage persists across sessions — wrong for dismiss pattern'
)

// ── 6. Dashboard page.tsx still wires OnboardingWizardLauncher ───────────────

console.log('\n6. Dashboard page.tsx integration')

const dashPage = fs.readFileSync(DASHBOARD_PAGE, 'utf8')

check(
  'dashboard/page.tsx imports OnboardingWizardLauncher',
  dashPage.includes("import { OnboardingWizardLauncher }"),
  'Dashboard must import and render the launcher'
)

check(
  'dashboard/page.tsx renders <OnboardingWizardLauncher',
  dashPage.includes('<OnboardingWizardLauncher'),
  'Launcher must be rendered in the dashboard page'
)

check(
  'dashboard/page.tsx does NOT directly import OnboardingWizardOverlay',
  !dashPage.includes("import { OnboardingWizardOverlay }") && !dashPage.includes("import {OnboardingWizardOverlay}"),
  'Overlay is wrapped by Launcher — page.tsx should not import it directly'
)

// ── 7. OnboardingWizardOverlay component integrity ───────────────────────────

console.log('\n7. OnboardingWizardOverlay component is a proper modal')

const overlay = fs.readFileSync(OVERLAY_FILE, 'utf8')

check(
  'Overlay uses fixed inset-0 (full-screen modal)',
  overlay.includes('fixed inset-0'),
  'Must be a full-screen overlay, not inline content'
)

check(
  'Overlay has z-50 or higher z-index',
  overlay.includes('z-50') || overlay.includes('z-[50]') || overlay.includes('z-[100]'),
  'Overlay must appear above dashboard content'
)

check(
  'Overlay accepts onComplete prop',
  overlay.includes('onComplete:') || overlay.includes('onComplete?:'),
  'Required prop for wizard completion'
)

check(
  'Overlay accepts onDismiss prop',
  overlay.includes('onDismiss?:') || overlay.includes('onDismiss:'),
  'Optional prop for user-initiated close'
)

check(
  'Overlay renders setup steps (FUB, Twilio, etc)',
  overlay.includes("currentStep === 'fub'") || overlay.includes("state.currentStep"),
  'Overlay must contain the actual setup step content'
)

// ── 8. Loading state — does not flicker ──────────────────────────────────────

console.log('\n8. Loading state handling')

check(
  'Returns null during loading (no flash)',
  launcher.includes('loading') && (launcher.includes('if (loading') || launcher.includes('loading ||')),
  'Must return null while loading to prevent UI flash'
)

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60))
console.log('SUMMARY')
console.log('='.repeat(60))
console.log(`PASS: ${passed}`)
console.log(`FAIL: ${failed}`)
console.log(`Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`)

if (failures.length > 0) {
  console.log('\nFailures:')
  failures.forEach(f => console.log(`  - ${f}`))
}

console.log('='.repeat(60))

process.exit(failed > 0 ? 1 : 0)
