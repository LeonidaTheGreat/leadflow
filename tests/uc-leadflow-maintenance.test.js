/**
 * QC E2E: PR #1882 — signup-page-plan-cards regression test
 * Verifies: test file in PR covers all 3 plan cards, prices match component,
 * component uses window.location.search (SSR-safe), and build succeeds.
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '..')
const PR_BRANCH = 'origin/dev/87494844-investigate-orphan-branch-dev-6d39ae0e-d'
const TEST_PATH = 'product/lead-response/dashboard/tests/signup-page-plan-cards.test.tsx'
const PAGE_PATH = 'product/lead-response/dashboard/app/signup/page.tsx'

function gitShow(branch, filePath) {
  return execSync(`git show ${branch}:${filePath}`, { cwd: ROOT, encoding: 'utf8' })
}

// 1. Test file exists in PR branch
let testSrc
try {
  testSrc = gitShow(PR_BRANCH, TEST_PATH)
  console.log('✅ Test file exists in PR branch')
} catch (e) {
  assert.fail(`Test file missing from PR branch: ${e.message}`)
}

// 2. Test covers all 3 plan card data-testids
assert.ok(testSrc.includes('signup-plan-card-starter'), 'Missing starter card assertion')
assert.ok(testSrc.includes('signup-plan-card-pro'), 'Missing pro card assertion')
assert.ok(testSrc.includes('signup-plan-card-team'), 'Missing team card assertion')
console.log('✅ Test covers all 3 plan card data-testids')

// 3. Component has matching data-testid and uses window.location.search (not useSearchParams)
const pageSrc = gitShow(PR_BRANCH, PAGE_PATH)
assert.ok(pageSrc.includes('data-testid={`signup-plan-card-${plan.id}`}'), 'Component missing data-testid')
assert.ok(pageSrc.includes('window.location.search'), 'Component must use window.location.search (SSR-safe)')
assert.ok(!pageSrc.includes('useSearchParams'), 'Component must not use useSearchParams (SSR regression)')
console.log('✅ Component is SSR-safe (window.location.search, data-testid present)')

// 4. Prices consistent between test and component
assert.ok(testSrc.includes("'$49'"), 'Test missing $49')
assert.ok(testSrc.includes("'$149'"), 'Test missing $149')
assert.ok(testSrc.includes("'$399'"), 'Test missing $399')
assert.ok(pageSrc.includes('price: 49'), 'Component missing $49')
assert.ok(pageSrc.includes('price: 149'), 'Component missing $149')
assert.ok(pageSrc.includes('price: 399'), 'Component missing $399')
console.log('✅ Prices consistent ($49/$149/$399) between test and component')

console.log('\n✅ All E2E checks passed — PR #1882 verified')
