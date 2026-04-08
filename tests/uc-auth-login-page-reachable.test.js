/**
 * QC E2E Test: Auth — Login/Signup Desktop Layout Fix
 * PR: #1049
 * Branch: dev/7be0d908-dev-fix-desktop-login-signup-page-layout
 * Task ID: 481833f7-b7df-409f-972f-432c625ab54a
 *
 * AC: Fix desktop login/signup page layout — input fields too small and cut off.
 * Context: PR #1049 dev commit (52649279) is binary-only (trace.zip).
 * No layout source files (.tsx/.css) were modified. Layout classes already existed from PRs #992/#1010.
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD = path.resolve(__dirname, '../product/lead-response/dashboard')
const REPO_ROOT = path.resolve(__dirname, '..')
const PR_1049_COMMIT = '52649279a81a729fb3bfef359e8c0181fa72e5da'

let passed = 0, failed = 0
function ok(name, cond, reason) {
  if (cond) { passed++; console.log('  PASS  ' + name) }
  else { failed++; console.log('  FAIL  ' + name + ': ' + reason) }
}

console.log('\n=== QC E2E: Desktop Login/Signup Layout Fix (PR #1049) ===\n')

const loginSrc = fs.readFileSync(path.join(DASHBOARD, 'app/login/page.tsx'), 'utf8')
const signupSrc = fs.readFileSync(path.join(DASHBOARD, 'app/signup/page.tsx'), 'utf8')

ok('login w-full', loginSrc.includes('w-full'), 'w-full not found')
ok('login h-12', loginSrc.includes('h-12'), 'h-12 not found')
ok('login text-base', loginSrc.includes('text-base'), 'text-base not found')
ok('login max-w-*', loginSrc.includes('max-w-lg') || loginSrc.includes('max-w-xl'), 'No max-w-* container')
ok('signup w-full', signupSrc.includes('w-full'), 'w-full not found')
ok('signup h-12', signupSrc.includes('h-12'), 'h-12 not found')
ok('signup max-w-*', signupSrc.includes('max-w-2xl') || signupSrc.includes('max-w-xl'), 'No max-w-* container')
ok('login data-testid attrs', loginSrc.includes('data-testid="login-form"') && loginSrc.includes('data-testid="login-email-input"'), 'Missing data-testid')
ok('build artifact exists', fs.existsSync(path.join(DASHBOARD, '.next/server')), '.next/server missing')

// Critical: dev commit must not be binary-only
try {
  const stat = execSync('git show --stat ' + PR_1049_COMMIT, { cwd: REPO_ROOT, encoding: 'utf8' })
  const insMatch = stat.match(/(\d+) insertion/)
  const delMatch = stat.match(/(\d+) deletion/)
  const ins = insMatch ? parseInt(insMatch[1], 10) : 0
  const del = delMatch ? parseInt(delMatch[1], 10) : 0
  const binaryOnly = stat.includes('Bin ') && ins === 0 && del === 0
  if (binaryOnly) {
    failed++
    console.log('  FAIL  PR #1049 dev commit has text source changes: Commit ' + PR_1049_COMMIT.slice(0,8) +
      ' is binary-only (trace.zip, 0 insertions). No layout files modified. Fix not implemented — classes existed from PRs #992 #1010.')
  } else {
    passed++
    console.log('  PASS  PR #1049 dev commit has text source changes (' + ins + ' ins, ' + del + ' del)')
  }
} catch (e) {
  failed++
  console.log('  FAIL  PR #1049 commit check: ' + e.message)
}

const total = passed + failed
console.log('\n' + '-'.repeat(60))
console.log('RESULT: ' + passed + '/' + total + ' passed')
if (failed > 0) {
  console.log('VERDICT: REJECT — no-op binary commit, layout fix not implemented in PR #1049')
}
process.exit(failed > 0 ? 1 : 0)
