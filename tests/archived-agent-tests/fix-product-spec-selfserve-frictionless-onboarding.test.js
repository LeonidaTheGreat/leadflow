/**
 * Test: fix-product-spec-selfserve-frictionless-onboarding
 * Verifies the self-serve frictionless onboarding flow implementation.
 *
 * Acceptance criteria from PRD-FRICTIONLESS-ONBOARDING-001:
 * 1. Trial signup sets email_verified=true (no email gate)
 * 2. Trial signup creates a session and sets leadflow_session cookie
 * 3. Trial signup redirects to /dashboard (not /check-your-inbox)
 * 4. Trial is 14 days per PRD
 * 5. Sample leads API exists and returns DEMO data
 * 6. Onboarding wizard overlay auto-triggers when onboarding_completed=false
 * 7. Trial badge shows days remaining
 * 8. key event types logged: trial_signup_completed, trial_started
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard')
const TRIAL_SIGNUP_ROUTE = path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts')
const TRIAL_SIGNUP_FORM = path.join(DASHBOARD, 'components/trial-signup-form.tsx')
const SAMPLE_LEADS_ROUTE = path.join(DASHBOARD, 'app/api/sample-leads/route.ts')
const WIZARD_OVERLAY = path.join(DASHBOARD, 'components/onboarding-wizard-overlay.tsx')
const TRIAL_BADGE = path.join(DASHBOARD, 'components/dashboard/trial-badge.tsx')
const DASHBOARD_PAGE = path.join(DASHBOARD, 'app/dashboard/page.tsx')
const LANDING_PAGE = path.join(DASHBOARD, 'app/page.tsx')

let passed = 0
let failed = 0
const failures = []

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${label}: ${err.message}`)
    failed++
    failures.push({ label, error: err.message })
  }
}

// ---------------------------------------------------------------------------
// FR-2 / FR-3: Frictionless trial signup — no email gate, immediate dashboard
// ---------------------------------------------------------------------------
console.log('\n📋 FR-2/FR-3: Frictionless trial signup')

test('trial-signup route file exists', () => {
  assert.ok(fs.existsSync(TRIAL_SIGNUP_ROUTE), 'trial-signup/route.ts must exist')
})

test('trial signup sets email_verified: true (no email gate for trial users)', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes('email_verified: true'),
    'email_verified must be true for immediate trial access'
  )
  assert.ok(
    !content.match(/email_verified:\s*false/),
    'email_verified must NOT be false (would block dashboard access)'
  )
})

test('trial signup creates a session (uses createSession)', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes('createSession'),
    'createSession must be called to establish server-side session'
  )
})

test('trial signup sets leadflow_session cookie', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes('leadflow_session'),
    'leadflow_session cookie must be set after trial signup'
  )
})

test('trial signup redirects to /dashboard (not /check-your-inbox)', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes("redirectTo: '/dashboard'"),
    "redirectTo must be '/dashboard' for frictionless access"
  )
  assert.ok(
    !content.includes("redirectTo: '/check-your-inbox'"),
    "redirectTo must NOT be '/check-your-inbox' (blocks frictionless onboarding)"
  )
})

test('trial length is 14 days per PRD', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  // Check for 14 * 24 * 60 * 60 * 1000 OR "14 * 24" pattern
  const has14Days = content.includes('14 * 24') || content.includes("trial_days: 14")
  assert.ok(has14Days, 'Trial must be 14 days per PRD-FRICTIONLESS-ONBOARDING-001')
  assert.ok(
    !content.match(/30 \* 24 \* 60 \* 60 \* 1000/),
    'Trial must not be 30 days'
  )
})

test('trial signup returns user object in response', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes("'user'") || content.includes('"user"') || content.includes('user: {'),
    'Response must include user object for client-side storage'
  )
})

test('trial signup logs trial_signup_completed event', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8')
  assert.ok(
    content.includes('trial_signup_completed'),
    'Must track trial_signup_completed event for funnel analysis'
  )
})

// ---------------------------------------------------------------------------
// FR-2: Account creation (email + password only, no CC)
// ---------------------------------------------------------------------------
console.log('\n📋 FR-2: Account creation form')

test('trial signup form exists', () => {
  assert.ok(fs.existsSync(TRIAL_SIGNUP_FORM), 'trial-signup-form.tsx must exist')
})

test('trial signup form stores user data to localStorage for wizard trigger', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_FORM, 'utf8')
  assert.ok(
    content.includes('leadflow_user'),
    'Must store leadflow_user to localStorage so wizard can auto-trigger on dashboard'
  )
})

test('trial signup form redirects using data.redirectTo', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_FORM, 'utf8')
  assert.ok(
    content.includes('data.redirectTo'),
    'Must use data.redirectTo from server response'
  )
})

test('trial signup form does NOT have credit card input field', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_FORM, 'utf8')
  // Check for input fields related to credit card — not just text mentions like "No credit card"
  const hasCardInput = content.match(/type=["'](?:text|tel|number)["'][^>]*(?:card|cc-number)/i)
    || content.match(/name=["'](?:card|cardNumber|cc_number)/i)
    || content.match(/placeholder=["'][^"']*card\s+number/i)
  assert.ok(!hasCardInput, 'Trial form must NOT have a credit card input field (PRD FR-2)')
})

// ---------------------------------------------------------------------------
// FR-1: Landing page CTA path
// ---------------------------------------------------------------------------
console.log('\n📋 FR-1: Landing page CTA')

test('landing page links to trial signup', () => {
  const content = fs.readFileSync(LANDING_PAGE, 'utf8')
  assert.ok(
    content.includes('/signup/trial') || content.includes('signup?mode=trial'),
    'Landing page must have CTA linking to trial signup'
  )
})

test('landing page shows 14-day trial (not 30-day)', () => {
  const content = fs.readFileSync(LANDING_PAGE, 'utf8')
  assert.ok(
    content.includes('14-day') || content.includes('14 day'),
    'Landing page must say 14-day trial per PRD'
  )
})

// ---------------------------------------------------------------------------
// FR-4: First-session seeded sample data
// ---------------------------------------------------------------------------
console.log('\n📋 FR-4: Sample lead data')

test('sample-leads API route exists', () => {
  assert.ok(fs.existsSync(SAMPLE_LEADS_ROUTE), 'app/api/sample-leads/route.ts must exist')
})

test('sample-leads returns at least 3 leads', () => {
  const content = fs.readFileSync(SAMPLE_LEADS_ROUTE, 'utf8')
  const sampleMatches = content.match(/id:\s*['"]sample-lead-/g) || []
  assert.ok(sampleMatches.length >= 3, `Must have at least 3 sample leads, found ${sampleMatches.length}`)
})

test('sample leads are marked as is_sample: true', () => {
  const content = fs.readFileSync(SAMPLE_LEADS_ROUTE, 'utf8')
  assert.ok(content.includes('is_sample: true'), 'Sample leads must be flagged as demo data')
})

test('sample-leads only available when onboarding_completed=false', () => {
  const content = fs.readFileSync(SAMPLE_LEADS_ROUTE, 'utf8')
  assert.ok(
    content.includes('onboarding_completed'),
    'Must check onboarding_completed to gate sample data'
  )
})

// ---------------------------------------------------------------------------
// FR-5: Guided setup wizard
// ---------------------------------------------------------------------------
console.log('\n📋 FR-5: Guided setup wizard')

test('onboarding wizard overlay component exists', () => {
  assert.ok(fs.existsSync(WIZARD_OVERLAY), 'onboarding-wizard-overlay.tsx must exist')
})

test('wizard includes FUB connection step', () => {
  const content = fs.readFileSync(WIZARD_OVERLAY, 'utf8')
  assert.ok(
    content.includes('fub') || content.includes('FUB') || content.includes('SetupFUB'),
    'Wizard must include FUB connection step'
  )
})

test('wizard includes SMS/Twilio step', () => {
  const content = fs.readFileSync(WIZARD_OVERLAY, 'utf8')
  assert.ok(
    content.includes('twilio') || content.includes('Twilio') || content.includes('SetupTwilio') || content.includes('sms'),
    'Wizard must include SMS/Twilio setup step'
  )
})

test('wizard includes aha moment simulator step', () => {
  const content = fs.readFileSync(WIZARD_OVERLAY, 'utf8')
  assert.ok(
    content.includes('simulator') || content.includes('Simulator'),
    'Wizard must include aha moment simulator step'
  )
})

test('dashboard auto-triggers wizard for new users', () => {
  const content = fs.readFileSync(DASHBOARD_PAGE, 'utf8')
  assert.ok(
    content.includes('OnboardingWizardOverlay') || content.includes('showWizard'),
    'Dashboard page must auto-trigger wizard overlay'
  )
  assert.ok(
    content.includes('onboarding_completed') || content.includes('onboardingCompleted'),
    'Dashboard must check onboardingCompleted to decide whether to show wizard'
  )
})

// ---------------------------------------------------------------------------
// FR-7: Trial state visibility
// ---------------------------------------------------------------------------
console.log('\n📋 FR-7: Trial state visibility')

test('trial badge component exists', () => {
  assert.ok(fs.existsSync(TRIAL_BADGE), 'components/dashboard/trial-badge.tsx must exist')
})

test('trial badge shows days remaining', () => {
  const content = fs.readFileSync(TRIAL_BADGE, 'utf8')
  assert.ok(
    content.includes('daysRemaining') || content.includes('days remaining'),
    'Trial badge must display days remaining'
  )
})

test('trial badge links to upgrade/billing', () => {
  const content = fs.readFileSync(TRIAL_BADGE, 'utf8')
  assert.ok(
    content.includes('/upgrade') || content.includes('/settings/billing'),
    'Trial badge must link to upgrade flow'
  )
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failures.length > 0) {
  console.log('\nFailed tests:')
  failures.forEach(f => console.log(`  - ${f.label}: ${f.error}`))
  process.exit(1)
} else {
  console.log('\n✅ All acceptance criteria met for frictionless onboarding')
  process.exit(0)
}
