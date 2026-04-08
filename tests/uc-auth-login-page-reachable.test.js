/**
 * QC E2E Test: UC — Auth Login/Signup Desktop Layout
 * PR: #1049
 * Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * Acceptance criteria:
 * 1. Login input fields have h-12 w-full (desktop-safe height + full width)
 * 2. Login inputs have text-base for readable font size
 * 3. Login page container uses max-w-lg or wider (not mobile-only cramped)
 * 4. Login form has data-testid attributes for testability
 * 5. Signup form (trial-signup-form) uses max-w-2xl mx-auto container
 * 6. Signup submit CTA is full width
 * 7. Build artifact exists (build succeeded)
 */

'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.resolve(__dirname, '../product/lead-response/dashboard')

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
  if (!fs.existsSync(abs)) {
    throw new Error(`Required file not found: ${relPath}`)
  }
  return fs.readFileSync(abs, 'utf8')
}

console.log('\n=== QC E2E: Auth Login/Signup Desktop Layout (PR #1049, task 481833f7) ===\n')

// ── Login page ─────────────────────────────────────────────────────────────────
const loginPage = readFile('app/login/page.tsx')

ok(
  'Login inputs have h-12 w-full (desktop-safe height + full width)',
  loginPage.includes('h-12 w-full'),
  'Input className must include h-12 w-full'
)

ok(
  'Login inputs have text-base (readable desktop font size)',
  loginPage.includes('text-base'),
  'text-base ensures inputs are not too small on desktop'
)

ok(
  'Login container uses max-w-lg or wider (not cramped on desktop)',
  loginPage.includes('max-w-lg') || loginPage.includes('max-w-xl') || loginPage.includes('max-w-2xl'),
  'Login card container should have desktop-appropriate max-width'
)

ok(
  'Login form has data-testid="login-form"',
  loginPage.includes('data-testid="login-form"'),
  'login-form testid required'
)

ok(
  'Login email input has data-testid="login-email-input"',
  loginPage.includes('data-testid="login-email-input"'),
  'login-email-input testid required'
)

ok(
  'Login password input has data-testid="login-password-input"',
  loginPage.includes('data-testid="login-password-input"'),
  'login-password-input testid required'
)

// ── Signup form ────────────────────────────────────────────────────────────────
const signupForm = readFile('components/trial-signup-form.tsx')

ok(
  'Signup form uses max-w-2xl mx-auto (desktop-responsive width)',
  signupForm.includes('max-w-2xl mx-auto'),
  'trial-signup-form container must use max-w-2xl for desktop layout'
)

ok(
  'Signup submit CTA is full width (w-full)',
  signupForm.includes('w-full px-6') || signupForm.includes('className="w-full') || signupForm.includes("className='w-full"),
  'Submit button should be full width to match input stack'
)

// ── No trace.zip committed ─────────────────────────────────────────────────────
// Prior PR #1049 only committed a Playwright trace.zip — verify test-results are gitignored
const gitignore = fs.existsSync(path.join(DASHBOARD, '../../../.gitignore'))
  ? fs.readFileSync(path.join(DASHBOARD, '../../../.gitignore'), 'utf8')
  : ''
ok(
  'test-results/ is gitignored (Playwright artifacts not committed)',
  gitignore.includes('test-results') || !fs.existsSync(path.resolve(__dirname, '../test-results')),
  'Playwright trace.zip files should not be committed — add test-results/ to .gitignore'
)

// ── Build artifacts ────────────────────────────────────────────────────────────
ok(
  'Next.js .next/server build artifact exists (build succeeded)',
  fs.existsSync(path.join(DASHBOARD, '.next/server')),
  'Run: cd product/lead-response/dashboard && npx next build'
)

// ── SUMMARY ───────────────────────────────────────────────────────────────────
const total = passed + failed
console.log(`\n${'─'.repeat(60)}`)
console.log(`RESULT: ${passed}/${total} passed`)
console.log(`${'─'.repeat(60)}`)

if (failed > 0) {
  console.log('\nFAIL — desktop login/signup layout AC not met.')
  process.exit(1)
} else {
  console.log('\nPASS — desktop login/signup layout AC verified.')
  process.exit(0)
}
