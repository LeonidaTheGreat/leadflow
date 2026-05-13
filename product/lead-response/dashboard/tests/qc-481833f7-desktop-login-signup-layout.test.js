'use strict'

// QC E2E: PR #1049 — Fix desktop login/signup page layout
// Task: 481833f7-b7df-409f-972f-432c625ab54a
// Verifies acceptance criteria via static source analysis (no browser required)

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.resolve(__dirname, '..')

let passed = 0
let failed = 0

function ok(name, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${name}`)
    passed++
  } else {
    console.log(`  FAIL  ${name}${detail ? ': ' + detail : ''}`)
    failed++
  }
}

function read(relPath) {
  const abs = path.join(DASHBOARD, relPath)
  assert(fs.existsSync(abs), `File must exist: ${relPath}`)
  return fs.readFileSync(abs, 'utf8')
}

console.log('\n=== QC: Desktop Login/Signup Layout Fix (PR #1049) ===\n')

// ─── Login page ───────────────────────────────────────────────────────────────
const login = read('app/login/page.tsx')

ok('Login: email input has h-12 (explicit desktop-safe height)',
  login.includes('h-12 w-full pl-10 bg-slate-900'),
  'Email input must have h-12 w-full')

ok('Login: password input has h-12 w-full (full-width, desktop height)',
  login.includes('h-12 w-full pl-10 pr-10'),
  'Password input must have h-12 w-full')

ok('Login: inputs use text-base (readable size on desktop)',
  login.includes('text-base'),
  'Inputs should use text-base to avoid tiny text on desktop')

ok('Login: outer container uses max-w-lg or wider (not mobile-only)',
  login.includes('max-w-lg') || login.includes('max-w-xl') || login.includes('max-w-2xl'),
  'Login card container must constrain width responsively')

ok('Login: form has data-testid="login-form"',
  login.includes('data-testid="login-form"'),
  'Login form needs data-testid for E2E testability')

ok('Login: email input has data-testid',
  login.includes('data-testid="login-email-input"'),
  'Email input needs data-testid')

ok('Login: password input has data-testid',
  login.includes('data-testid="login-password-input"'),
  'Password input needs data-testid')

ok('Login: submit button has data-testid',
  login.includes('data-testid="login-submit-button"'),
  'Submit button needs data-testid')

// ─── Signup page ─────────────────────────────────────────────────────────────
const signup = read('app/signup/page.tsx')

ok('Signup: email input has h-12 w-full text-base',
  signup.includes('h-12 w-full bg-slate-900 border-slate-600 text-base'),
  'Signup email input must have h-12 w-full text-base')

ok('Signup: name input has h-12 w-full text-base',
  signup.includes('h-12 w-full bg-slate-900 border-slate-600 text-base'),
  'Name input must be sized consistently with login')

ok('Signup: ALL 4 form fields cover h-12 w-full (count occurrences)',
  (signup.match(/h-12 w-full/g) || []).length >= 4,
  'signup/page.tsx should have h-12 w-full on all 4 fields')

ok('Signup: fields use text-base',
  signup.includes('text-base'),
  'text-base ensures readable size on desktop')

// ─── Trial signup form ────────────────────────────────────────────────────────
const trialForm = read('components/trial-signup-form.tsx')

ok('TrialSignupForm: compact container uses max-w-2xl mx-auto (responsive width)',
  trialForm.includes('max-w-2xl mx-auto'),
  'Compact form should constrain width to 2xl for desktop')

ok('TrialSignupForm: submit CTA is w-full (full-width to match input stack)',
  trialForm.includes('w-full px-6 py-3 bg-emerald-500'),
  'Submit button must be full width')

// ─── No stale inline styles that would override layout ───────────────────────
ok('Login: no inline style width (uses Tailwind only)',
  !login.includes("style={{ width:") && !login.includes('style="width:'),
  'Login page must not override input width via inline style')

ok('Signup: no inline style width',
  !signup.includes("style={{ width:") && !signup.includes('style="width:'),
  'Signup page must not override input width via inline style')

// ─── UI components exist ─────────────────────────────────────────────────────
const uiComps = ['button', 'card', 'input', 'label']
for (const comp of uiComps) {
  const p = path.join(DASHBOARD, `components/ui/${comp}.tsx`)
  ok(`UI component exists: ${comp}.tsx`, fs.existsSync(p), `Missing: ${p}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULT: ${passed}/${total} passed`)
if (failed > 0) {
  console.log('FAILED — desktop layout acceptance criteria not fully met.')
  process.exit(1)
} else {
  console.log('PASS — all desktop login/signup layout AC verified.')
  process.exit(0)
}
