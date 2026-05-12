/**
 * E2E Test: Auth form layout consistency (feat-lapsed-trial-reactivation)
 * Task ID: 74cd888f-a789-4481-b0ca-b055c64ab23a
 *
 * Verifies email/password field layout parity between login, paid signup,
 * and trial signup — per PRD-LEADFLOW-LAPSED-TRIAL-REACTIVATION-001.
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name}`)
    console.log(`       ${e.message}`)
    failed++
  }
}

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard')
const LOGIN_PAGE = path.join(DASHBOARD_DIR, 'app/login/page.tsx')
const SIGNUP_PAGE = path.join(DASHBOARD_DIR, 'app/signup/page.tsx')
const TRIAL_FORM = path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx')

const login = fs.readFileSync(LOGIN_PAGE, 'utf8')
const signup = fs.readFileSync(SIGNUP_PAGE, 'utf8')
const trial = fs.readFileSync(TRIAL_FORM, 'utf8')

console.log('\nAuth Form Layout Consistency Tests')
console.log('='.repeat(50))

// --- Login (baseline) ---
test('login page: email input has h-12 height', () => {
  assert.ok(login.includes('h-12'), 'Login email/password input missing h-12')
})
test('login page: email input has pl-10 (icon prefix)', () => {
  assert.ok(login.includes('pl-10'), 'Login input missing pl-10 icon offset')
})
test('login page: Mail icon imported', () => {
  assert.ok(login.includes('Mail'), 'Login page missing Mail icon import')
})
test('login page: Lock icon imported', () => {
  assert.ok(login.includes('Lock'), 'Login page missing Lock icon import')
})
test('login page: show/hide password toggle present', () => {
  assert.ok(login.includes('showPassword'), 'Login page missing showPassword toggle')
})

// --- Paid signup (enter-details step) ---
test('paid signup: file exists', () => {
  assert.ok(fs.existsSync(SIGNUP_PAGE), `Missing: ${SIGNUP_PAGE}`)
})
test('paid signup: Mail icon imported', () => {
  assert.ok(signup.includes('Mail'), 'Signup page missing Mail icon import')
})
test('paid signup: Lock icon imported', () => {
  assert.ok(signup.includes('Lock'), 'Signup page missing Lock icon import')
})
test('paid signup: Eye/EyeOff icons imported for password toggle', () => {
  assert.ok(signup.includes('Eye') && signup.includes('EyeOff'), 'Signup page missing Eye/EyeOff icons')
})
test('paid signup: email input has h-12 height', () => {
  assert.ok(signup.includes('h-12'), 'Signup email input missing h-12')
})
test('paid signup: email input has pl-10 (icon prefix)', () => {
  assert.ok(signup.match(/pl-10.*signup-email-input|signup-email-input.*pl-10|Mail.*signup-email|signup-email.*Mail/s),
    'Signup email input missing pl-10 or Mail icon association')
})
test('paid signup: password show/hide toggle present', () => {
  assert.ok(signup.includes('showPassword'), 'Paid signup missing showPassword state')
})
test('paid signup: data-testid="signup-email-input" present', () => {
  assert.ok(signup.includes('data-testid="signup-email-input"'), 'Missing data-testid on signup email input')
})
test('paid signup: data-testid="signup-password-input" present', () => {
  assert.ok(signup.includes('data-testid="signup-password-input"'), 'Missing data-testid on signup password input')
})

// --- Trial signup form (full mode) ---
test('trial form: file exists', () => {
  assert.ok(fs.existsSync(TRIAL_FORM), `Missing: ${TRIAL_FORM}`)
})
test('trial form: Mail icon imported', () => {
  assert.ok(trial.includes('Mail'), 'Trial form missing Mail icon import')
})
test('trial form: Lock icon imported', () => {
  assert.ok(trial.includes('Lock'), 'Trial form missing Lock icon import')
})
test('trial form: Input component imported from ui', () => {
  assert.ok(trial.includes("from '@/components/ui/input'"), 'Trial form not using Input component')
})
test('trial form: Label component imported from ui', () => {
  assert.ok(trial.includes("from '@/components/ui/label'"), 'Trial form not using Label component')
})
test('trial form: full-mode email input has h-12 height', () => {
  assert.ok(trial.includes('h-12'), 'Trial form missing h-12 input height (not matching login canonical)')
})
test('trial form: full-mode email input has pl-10 (icon prefix)', () => {
  assert.ok(trial.includes('pl-10'), 'Trial form email input missing pl-10 icon offset')
})
test('trial form: full-mode password has pl-10 pr-10', () => {
  assert.ok(trial.includes('pl-10 pr-10') || (trial.includes('pl-10') && trial.includes('pr-10')),
    'Trial form password field missing pl-10/pr-10 offsets')
})
test('trial form: data-testid="trial-signup-email-input" present', () => {
  assert.ok(trial.includes('data-testid="trial-signup-email-input"'), 'Missing data-testid on trial signup email input')
})
test('trial form: data-testid="trial-signup-password-input" present', () => {
  assert.ok(trial.includes('data-testid="trial-signup-password-input"'), 'Missing data-testid on trial signup password input')
})

// --- No API/schema changes ---
test('signup page: no api endpoint changes (create agent route unchanged)', () => {
  assert.ok(signup.includes('/api/agents/create'), 'Signup agent create endpoint missing or changed')
})
test('signup page: no checkout endpoint changes', () => {
  assert.ok(signup.includes('/api/billing/create-checkout'), 'Signup checkout endpoint missing or changed')
})
test('trial form: trial-signup endpoint unchanged', () => {
  assert.ok(trial.includes('/api/auth/trial-signup'), 'Trial signup endpoint missing or changed')
})

// --- Vertical stacking (no grid/flex-row for email+password) ---
test('paid signup: email/password not in a grid row together', () => {
  // Confirm no 'grid-cols-2' wrapping email and password as siblings
  const enterDetailsSection = signup.slice(signup.indexOf('enter-details'))
  assert.ok(!enterDetailsSection.match(/grid-cols-2[^}]*email[^}]*password|email[^}]*grid-cols-2[^}]*password/s),
    'Email and password appear to be in a 2-column grid in paid signup')
})

console.log('\n' + '='.repeat(50))
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
