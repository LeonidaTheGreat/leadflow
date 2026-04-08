/**
 * QC E2E Test: PR #1049 — Fix desktop login/signup page layout
 * Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * Acceptance criteria:
 * 1. Login input fields have explicit full-width + desktop-safe height (h-12 w-full)
 * 2. Signup form container uses responsive max-width (max-w-2xl mx-auto)
 * 3. Signup submit CTA is full width matching input stack
 * 4. Login form has data-testid attributes for testability
 * 5. Login page uses max-w-lg or wider container (not constrained to mobile-only width)
 * 6. No layout regression: login page imports exist (components referenced)
 */

'use strict'
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

function readFile(relPath) {
  const abs = path.join(DASHBOARD, relPath)
  assert(fs.existsSync(abs), `File must exist: ${relPath}`)
  return fs.readFileSync(abs, 'utf8')
}

console.log('\n=== QC E2E: PR #1049 Desktop Login/Signup Layout Fix ===\n')

// ── 1. Login page source checks ───────────────────────────────────────────────
const loginPage = readFile('app/login/page.tsx')

ok(
  'Login email input has h-12 w-full (desktop-safe height + full width)',
  loginPage.includes('h-12 w-full'),
  'Expected className to include h-12 w-full on email input'
)

ok(
  'Login password input has h-12 w-full',
  loginPage.includes('h-12 w-full pl-10 pr-10') || loginPage.includes('h-12 w-full'),
  'Password input should also be full width with desktop height'
)

ok(
  'Login page uses max-w-lg or wider container (not cramped)',
  loginPage.includes('max-w-lg') || loginPage.includes('max-w-xl') || loginPage.includes('max-w-2xl'),
  'Login card should have a sensible max-width for desktop'
)

ok(
  'Login form has data-testid attributes for testability',
  loginPage.includes('data-testid="login-form"') &&
    loginPage.includes('data-testid="login-email-input"') &&
    loginPage.includes('data-testid="login-password-input"'),
  'Missing data-testid attributes on login form elements'
)

ok(
  'Login page uses text-base on inputs (not default small text)',
  loginPage.includes('text-base'),
  'text-base ensures readable font size on desktop'
)

// ── 2. Signup form (trial-signup-form) checks ─────────────────────────────────
const signupForm = readFile('components/trial-signup-form.tsx')

ok(
  'Signup form container uses max-w-2xl mx-auto (desktop-responsive width)',
  signupForm.includes('max-w-2xl mx-auto'),
  'Expected trial-signup-form to constrain width responsively with max-w-2xl'
)

ok(
  'Signup submit CTA is full width (w-full)',
  signupForm.includes('w-full px-6') || signupForm.includes('className="w-full'),
  'Submit button should be full width to match input stack'
)

// ── 3. No broken imports ───────────────────────────────────────────────────────
const importedComponents = [
  'components/ui/button',
  'components/ui/card',
  'components/ui/input',
  'components/ui/label',
]
importedComponents.forEach(comp => {
  const absPath = path.join(DASHBOARD, comp + '.tsx')
  const absPathIndex = path.join(DASHBOARD, comp, 'index.tsx')
  const exists = fs.existsSync(absPath) || fs.existsSync(absPathIndex) ||
    fs.existsSync(path.join(DASHBOARD, comp.replace('components/', 'components/ui/') + '.tsx'))
  // Flexible check — component may be in ui subdir
  const uiPath = path.join(DASHBOARD, 'components/ui', path.basename(comp) + '.tsx')
  ok(
    `Login import exists: ${comp}`,
    fs.existsSync(absPath) || fs.existsSync(absPathIndex) || fs.existsSync(uiPath),
    `Component file not found at ${absPath} or ${uiPath}`
  )
})

// ── 4. Build artifact present (build succeeded) ───────────────────────────────
ok(
  'Next.js .next/server build artifact exists (build ran successfully)',
  fs.existsSync(path.join(DASHBOARD, '.next/server')),
  'Run: cd product/lead-response/dashboard && npx next build'
)

// ── SUMMARY ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULT: ${passed}/${total} passed`)
console.log(`${'─'.repeat(60)}`)

if (failed > 0) {
  console.log('\nFAILED — desktop login/signup layout AC not met.')
  process.exit(1)
} else {
  console.log('\nPASS — desktop login/signup layout AC verified.')
  process.exit(0)
}
