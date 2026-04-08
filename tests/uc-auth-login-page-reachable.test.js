/**
 * QC E2E Test: Auth — Login/Signup Desktop Layout Fix
 * PR: #1049
 * Branch: dev/7be0d908-dev-fix-desktop-login-signup-page-layout
 * Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * AC: Fix desktop login/signup page layout — input fields too small and cut off.
 * Expected: Input elements have h-12 (48px height), w-full width, text-base font size.
 * Expected: Container uses max-w-lg (login) or max-w-2xl (signup detail step).
 * Expected: PR commit modifies login/signup layout source files (not a no-op binary commit).
 *
 * Context: PR #1049 was auto-merged but its dev commit (52649279) only added a binary
 * trace.zip file — zero layout source files were modified. The layout classes
 * already existed from PRs #992 and #1010. This test documents the no-op finding.
 *
 * Tests:
 *  1. Login page has full-width inputs (w-full)
 *  2. Login page has explicit height on inputs (h-12)
 *  3. Login page has text-base font size on inputs
 *  4. Login page uses max-width container
 *  5. Signup page has full-width inputs (w-full)
 *  6. Signup page has explicit height on inputs (h-12)
 *  7. Signup detail step uses max-width container
 *  8. PR #1049 dev commit modifies layout source files (not binary-only no-op)
 *  9. Login page has data-testid attributes for testability
 * 10. Next.js build artifact exists (build succeeded)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD_BASE = path.resolve(__dirname, '../product/lead-response/dashboard')
const LOGIN_PAGE = path.join(DASHBOARD_BASE, 'app/login/page.tsx')
const SIGNUP_PAGE = path.join(DASHBOARD_BASE, 'app/signup/page.tsx')
const REPO_ROOT = path.resolve(__dirname, '..')

// The specific commit that was PR #1049's dev implementation (already merged to main)
const PR_1049_COMMIT = '52649279a81a729fb3bfef359e8c0181fa72e5da'

let RESULTS = { passed: 0, failed: 0, details: [] }

function pass(name) {
  RESULTS.passed++
  RESULTS.details.push({ status: 'PASS', name })
  console.log(`  PASS  ${name}`)
}

function fail(name, reason) {
  RESULTS.failed++
  RESULTS.details.push({ status: 'FAIL', name, reason })
  console.log(`  FAIL  ${name}: ${reason}`)
}

function pass_or_fail(name, condition, failReason) {
  if (condition) pass(name)
  else fail(name, failReason)
}

async function runTests() {
  console.log('\n=== QC E2E: Desktop Login/Signup Layout Fix (PR #1049) ===\n')

  if (!fs.existsSync(LOGIN_PAGE)) {
    fail('login page.tsx exists', 'File not found')
    process.exit(1)
  }
  if (!fs.existsSync(SIGNUP_PAGE)) {
    fail('signup page.tsx exists', 'File not found')
    process.exit(1)
  }

  const loginSrc = fs.readFileSync(LOGIN_PAGE, 'utf8')
  const signupSrc = fs.readFileSync(SIGNUP_PAGE, 'utf8')

  // ── 1. Login: w-full on inputs ──────────────────────────────────────────────
  pass_or_fail(
    'login inputs have w-full class (fills container width on desktop)',
    loginSrc.includes('w-full'),
    'w-full not found — input may be cut off on desktop'
  )

  // ── 2. Login: h-12 on inputs ────────────────────────────────────────────────
  pass_or_fail(
    'login inputs have h-12 height class (48px — not too small on desktop)',
    loginSrc.includes('h-12'),
    'h-12 not found — inputs may be too short on desktop'
  )

  // ── 3. Login: text-base on inputs ───────────────────────────────────────────
  pass_or_fail(
    'login inputs have text-base font size (readable on desktop)',
    loginSrc.includes('text-base'),
    'text-base not found — font may be too small on desktop'
  )

  // ── 4. Login: max-width container ───────────────────────────────────────────
  pass_or_fail(
    'login page uses constrained max-width container (correct desktop layout)',
    loginSrc.includes('max-w-lg') || loginSrc.includes('max-w-xl') || loginSrc.includes('max-w-2xl'),
    'No max-w-* found — login form may stretch full width on desktop'
  )

  // ── 5. Signup: w-full on form inputs ────────────────────────────────────────
  pass_or_fail(
    'signup inputs have w-full class (fills container width)',
    signupSrc.includes('w-full'),
    'w-full not found on signup form inputs'
  )

  // ── 6. Signup: h-12 on form inputs ──────────────────────────────────────────
  pass_or_fail(
    'signup inputs have h-12 height class (48px — not too small on desktop)',
    signupSrc.includes('h-12'),
    'h-12 not found on signup form inputs'
  )

  // ── 7. Signup: max-width container ──────────────────────────────────────────
  pass_or_fail(
    'signup detail step uses constrained max-width container',
    signupSrc.includes('max-w-2xl') || signupSrc.includes('max-w-xl') || signupSrc.includes('max-w-lg'),
    'No max-w-* found on signup detail step'
  )

  // ── 8. PR #1049 dev commit contains layout source changes (not no-op) ───────
  // Critical AC gate: the implementation commit must modify layout source files.
  // Failure pattern: binary-only commit (trace.zip, no text insertions/deletions from .tsx/.css).
  try {
    const commitStat = execSync(
      `git show --stat ${PR_1049_COMMIT}`,
      { cwd: REPO_ROOT, encoding: 'utf8' }
    )

    // Parse non-zero text insertions/deletions
    const insertionMatch = commitStat.match(/(\d+) insertion/)
    const deletionMatch = commitStat.match(/(\d+) deletion/)
    const textInsertions = insertionMatch ? parseInt(insertionMatch[1], 10) : 0
    const textDeletions = deletionMatch ? parseInt(deletionMatch[1], 10) : 0

    const hasBinaryFiles = commitStat.includes('Bin ')
    const hasTextChanges = textInsertions > 0 || textDeletions > 0

    if (hasBinaryFiles && !hasTextChanges) {
      fail(
        'PR #1049 dev commit contains layout source changes',
        `Commit ${PR_1049_COMMIT.slice(0,8)} is binary-only (trace.zip, ${textInsertions} text insertions). ` +
        'No .tsx/.css layout files were modified. The fix was never implemented — ' +
        'layout classes (h-12, w-full) already existed from PRs #992 and #1010.'
      )
    } else if (hasTextChanges) {
      pass(`PR #1049 dev commit contains text source changes (${textInsertions} ins, ${textDeletions} del)`)
    } else {
      fail(
        'PR #1049 dev commit contains any source changes',
        `Commit ${PR_1049_COMMIT.slice(0,8)}: no text changes at all.`
      )
    }
  } catch (e) {
    fail('PR #1049 dev commit check', `Could not inspect commit ${PR_1049_COMMIT.slice(0,8)}: ${e.message}`)
  }

  // ── 9. Login page has data-testid attributes ─────────────────────────────────
  pass_or_fail(
    'login form has data-testid attributes (testable)',
    loginSrc.includes('data-testid="login-form"') &&
      loginSrc.includes('data-testid="login-email-input"') &&
      loginSrc.includes('data-testid="login-password-input"'),
    'Missing data-testid on login form/inputs'
  )

  // ── 10. Next.js build artifact exists ────────────────────────────────────────
  pass_or_fail(
    'Next.js build artifact (.next/server) exists — build succeeded',
    fs.existsSync(path.join(DASHBOARD_BASE, '.next/server')),
    '.next/server missing — run: cd product/lead-response/dashboard && npx next build'
  )

  // ── SUMMARY ─────────────────────────────────────────────────────────────────
  const total = RESULTS.passed + RESULTS.failed
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`RESULT: ${RESULTS.passed}/${total} passed`)
  console.log(`${'─'.repeat(60)}`)
  if (RESULTS.failed > 0) {
    console.log('\nFAILED CHECKS:')
    RESULTS.details.filter(d => d.status === 'FAIL').forEach(d => {
      console.log(`  - ${d.name}: ${d.reason}`)
    })
    console.log('\nVERDICT: REJECT — PR #1049 is a no-op (binary trace.zip only). Layout fix not implemented in this PR.')
  } else {
    console.log('\nAll checks passed.')
  }

  return RESULTS
}

runTests()
  .then(r => {
    process.exit(r.failed > 0 ? 1 : 0)
  })
  .catch(e => {
    console.error('Test runner error:', e)
    process.exit(1)
  })
