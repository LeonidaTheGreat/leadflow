/**
 * E2E Test: PR #1049 — Fix desktop login/signup page layout
 * Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * Verifies acceptance criteria for the desktop layout fix.
 * Acceptance criteria:
 *   1. Login inputs use h-12 w-full (desktop-safe height + full width)
 *   2. Login page has max-w-lg or wider container (not cramped on desktop)
 *   3. Login inputs use text-base (readable font size)
 *   4. Login form has data-testid attributes for testability
 *   5. Signup form uses max-w-2xl mx-auto responsive container
 *   6. Signup inputs use h-12 w-full
 *   7. UI component imports used (button, card, input, label)
 *   8. PR must contain layout source (.tsx) changes — not a binary-only no-op commit
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(__dirname, '../../../..')

let passed = 0
let failed = 0

function ok(name, cond, detail) {
  if (cond) {
    console.log(`  PASS  ${name}`)
    passed++
  } else {
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function readSrc(rel) {
  const abs = path.join(DASHBOARD, rel)
  if (!fs.existsSync(abs)) throw new Error(`Required file missing: ${rel}`)
  return fs.readFileSync(abs, 'utf8')
}

console.log('\n=== E2E: PR #1049 Desktop Login/Signup Layout Fix ===\n')

// ── 1. Login page layout checks ───────────────────────────────────────────────
const loginPage = readSrc('app/login/page.tsx')

ok(
  'Login email input: h-12 w-full (desktop-safe height + full width)',
  loginPage.includes('h-12 w-full'),
  'className must include h-12 w-full on email input'
)

ok(
  'Login password input: h-12 w-full',
  loginPage.includes('h-12 w-full pl-10 pr-10') || (loginPage.includes('h-12') && loginPage.includes('w-full')),
  'password input must also be h-12 and w-full'
)

ok(
  'Login page: max-w-lg or wider desktop container',
  loginPage.includes('max-w-lg') || loginPage.includes('max-w-xl') || loginPage.includes('max-w-2xl'),
  'Login card needs a desktop-appropriate max-width'
)

ok(
  'Login inputs: text-base (readable font size)',
  loginPage.includes('text-base'),
  'text-base ensures legible input text on desktop'
)

ok(
  'Login form: data-testid="login-form"',
  loginPage.includes('data-testid="login-form"'),
  'form element must have data-testid for test automation'
)

ok(
  'Login email input: data-testid="login-email-input"',
  loginPage.includes('data-testid="login-email-input"'),
  'email input must have data-testid'
)

ok(
  'Login password input: data-testid="login-password-input"',
  loginPage.includes('data-testid="login-password-input"'),
  'password input must have data-testid'
)

// ── 2. Signup page layout checks ──────────────────────────────────────────────
const signupPage = readSrc('app/signup/page.tsx')

ok(
  'Signup form: max-w-2xl mx-auto responsive container',
  signupPage.includes('max-w-2xl') || signupPage.includes('max-w-xl'),
  'signup form needs responsive max-width container'
)

ok(
  'Signup inputs: h-12 w-full',
  signupPage.includes('h-12 w-full'),
  'signup inputs must be h-12 w-full'
)

// ── 3. UI component files exist (no broken imports) ───────────────────────────
const uiComponents = ['button', 'card', 'input', 'label']
uiComponents.forEach(comp => {
  const p = path.join(DASHBOARD, `components/ui/${comp}.tsx`)
  ok(`UI component exists: components/ui/${comp}.tsx`, fs.existsSync(p), `File not found: ${p}`)
})

// ── 4. PR must have layout source (.tsx) changes — not a binary-only no-op ───
// Check that the branch actually modifies layout source files vs main.
// A branch that only adds binary files (trace.zip) and test files has NOT
// implemented the fix, even if the layout classes happen to exist from prior PRs.
try {
  const srcDiff = execSync(
    'git diff main...HEAD -- ' +
    '"product/lead-response/dashboard/app/login/page.tsx" ' +
    '"product/lead-response/dashboard/app/signup/page.tsx" ' +
    '"product/lead-response/dashboard/app/signup/trial/page.tsx" ' +
    '"product/lead-response/dashboard/app/signup/pilot/page.tsx" ' +
    '"product/lead-response/dashboard/components/trial-signup-form.tsx" ' +
    '"product/lead-response/dashboard/styles/" ' +
    '"*.tsx" "*.css" "*.scss"',
    { cwd: REPO_ROOT, encoding: 'utf8' }
  ).trim()

  ok(
    'Branch modifies layout source files (.tsx/.css) vs main',
    srcDiff.length > 0,
    'Branch has ZERO layout source changes vs main. The dev fix commit (a9ed911a) only adds a binary ' +
    'trace.zip file. Layout classes exist from prior PRs (#992, #1010) — this PR did not implement the fix.'
  )
} catch (e) {
  failed++
  console.log(`  FAIL  Layout source-change check: ${e.message}`)
}

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
