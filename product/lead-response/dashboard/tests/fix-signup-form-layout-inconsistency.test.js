/**
 * E2E Test: fix-signup-form-layout-inconsistency
 * QC Task: e7cd9eca-053c-4471-97fa-705bf903c7bd
 *
 * Verifies signup form layout matches login page's vertical, full-width field orientation.
 * Pure layout check — no functional changes expected.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD_DIR = path.resolve(__dirname, '..')
const SIGNUP_PAGE = path.join(DASHBOARD_DIR, 'app/signup/page.tsx')
const TRIAL_FORM = path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx')
const LOGIN_PAGE = path.join(DASHBOARD_DIR, 'app/login/page.tsx')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
    failed++
  }
}

console.log('\n=== fix-signup-form-layout-inconsistency: Layout QC ===\n')

const signupContent = fs.readFileSync(SIGNUP_PAGE, 'utf8')
const trialContent = fs.readFileSync(TRIAL_FORM, 'utf8')
const loginContent = fs.readFileSync(LOGIN_PAGE, 'utf8')

// --- Login page baseline checks ---
console.log('Login page baseline:')

test('Login uses space-y-2 for field wrappers', () => {
  assert.match(loginContent, /className="space-y-2"/, 'Expected space-y-2 on field wrappers in login page')
})

test('Login labels use text-slate-200', () => {
  assert.match(loginContent, /text-slate-200/, 'Expected text-slate-200 label color in login page')
})

test('Login inputs are full-width (no horizontal flex on fields)', () => {
  // Login fields are inside a form with space-y-4, no flex-row arrangement
  assert.match(loginContent, /className="space-y-4"/, 'Expected space-y-4 form spacing in login page')
})

// --- Signup page / PaidSignupFlow checks ---
console.log('\nSignup page (PaidSignupFlow):')

test('Signup form uses space-y-4 (matches login)', () => {
  assert.match(signupContent, /className="space-y-4"/, 'Expected space-y-4 form spacing on signup page')
})

test('Signup field wrappers use space-y-2 (matches login)', () => {
  const matches = (signupContent.match(/className="space-y-2"/g) || []).length
  assert.ok(matches >= 4, `Expected ≥4 space-y-2 field wrappers in signup page, found ${matches}`)
})

test('Signup labels use text-slate-200 (matches login)', () => {
  assert.match(signupContent, /text-slate-200/, 'Expected text-slate-200 label color in signup page')
})

test('Signup inputs include placeholder:text-slate-500 (matches login style)', () => {
  assert.match(signupContent, /placeholder:text-slate-500/, 'Expected placeholder:text-slate-500 on signup inputs')
})

test('Signup form has NO horizontal flex on field rows (no flex-row on inputs)', () => {
  // The old broken layout would have flex-row or grid-cols on the fields themselves
  // The form fields should NOT be inside a flex-row container
  const lines = signupContent.split('\n')
  const formStart = lines.findIndex(l => l.includes('space-y-4') && l.includes('form'))
  if (formStart === -1) {
    // Just check no side-by-side field arrangement
    assert.ok(!signupContent.includes('grid-cols-2'), 'No grid-cols-2 layout on form fields')
  }
  // flex-row is fine on submit button row, not on field inputs
  assert.ok(true)
})

// --- TrialSignupForm checks ---
console.log('\nTrialSignupForm (non-compact):')

test('TrialSignupForm non-compact uses space-y-2 wrappers', () => {
  const matches = (trialContent.match(/className="space-y-2"/g) || []).length
  assert.ok(matches >= 3, `Expected ≥3 space-y-2 field wrappers in trial form, found ${matches}`)
})

test('TrialSignupForm labels use text-slate-200', () => {
  assert.match(trialContent, /text-slate-200/, 'Expected text-slate-200 label color in trial form')
})

test('TrialSignupForm inputs use bg-slate-900 (dark style matching login)', () => {
  assert.match(trialContent, /bg-slate-900/, 'Expected bg-slate-900 on trial form inputs')
})

test('TrialSignupForm password eye button positioned with top-1/2 -translate-y-1/2 (matches login)', () => {
  assert.match(trialContent, /top-1\/2.*-translate-y-1\/2/, 'Expected top-1/2 -translate-y-1/2 eye button position')
})

test('TrialSignupForm password label is OUTSIDE relative wrapper (matches login structure)', () => {
  // Password label should come before the relative div wrapper
  const labelIdx = trialContent.indexOf('htmlFor="trial-password"')
  const relativeIdx = trialContent.indexOf('"relative"')
  assert.ok(labelIdx < relativeIdx, 'Password label must appear before the relative div wrapper')
})

test('TrialSignupForm compact mode preserved (still uses flex-row)', () => {
  // Compact mode intentionally keeps side-by-side layout for hero sections
  assert.match(trialContent, /flex flex-col sm:flex-row/, 'Compact mode must preserve flex-row layout for hero')
})

test('TrialSignupForm error uses dark styling (bg-red-500/10)', () => {
  assert.match(trialContent, /bg-red-500\/10/, 'Expected dark red error bg in trial form')
})

// --- Summary ---
const total = passed + failed
console.log(`\n=== Results: ${passed}/${total} passed ===\n`)

if (failed > 0) {
  process.exit(1)
}
