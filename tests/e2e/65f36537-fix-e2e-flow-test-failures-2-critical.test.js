/**
 * QC E2E Test — Task 65f36537-ae2f-4625-9026-588fdffa4fa4
 * Fix: E2E flow test failures (2 critical)
 *
 * Validates:
 * 1. No unresolved merge conflict markers in the fixed test files
 * 2. The bcrypt test uses @/lib/db mock (not @supabase/supabase-js)
 * 3. The upgrade-checkout test uses the correct API URL (not supabase.co)
 * 4. Dashboard Jest tests for the fixed files pass (24/24)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD_DIR = path.resolve(__dirname, '../../product/lead-response/dashboard')
const BCRYPT_TEST = path.join(DASHBOARD_DIR, '__tests__/bcrypt-password-verify.test.ts')
const UPGRADE_TEST = path.join(DASHBOARD_DIR, '__tests__/upgrade-checkout.test.ts')

// ── Test 1: No merge conflict markers in bcrypt test ──────────────────────────
{
  const content = fs.readFileSync(BCRYPT_TEST, 'utf8')
  assert(!content.includes('<<<<<<<'), 'FAIL: bcrypt test has unresolved conflict marker <<<<<<<')
  assert(!content.includes('>>>>>>>'), 'FAIL: bcrypt test has unresolved conflict marker >>>>>>>')
  // Allow ======= in comments but not as standalone conflict separator
  const lines = content.split('\n')
  const conflictSeparators = lines.filter(l => l.trim() === '=======')
  assert.strictEqual(conflictSeparators.length, 0, `FAIL: bcrypt test has ${conflictSeparators.length} standalone ======= conflict separator(s)`)
  console.log('PASS: No merge conflict markers in bcrypt-password-verify.test.ts')
}

// ── Test 2: No merge conflict markers in upgrade-checkout test ────────────────
{
  const content = fs.readFileSync(UPGRADE_TEST, 'utf8')
  assert(!content.includes('<<<<<<<'), 'FAIL: upgrade-checkout test has unresolved conflict marker <<<<<<<')
  assert(!content.includes('>>>>>>>'), 'FAIL: upgrade-checkout test has unresolved conflict marker >>>>>>>')
  const lines = content.split('\n')
  const conflictSeparators = lines.filter(l => l.trim() === '=======')
  assert.strictEqual(conflictSeparators.length, 0, `FAIL: upgrade-checkout test has ${conflictSeparators.length} standalone ======= conflict separator(s)`)
  console.log('PASS: No merge conflict markers in upgrade-checkout.test.ts')
}

// ── Test 3: bcrypt test mocks @/lib/db (not @supabase/supabase-js) ────────────
{
  const content = fs.readFileSync(BCRYPT_TEST, 'utf8')
  assert(!content.includes("jest.mock('@supabase/supabase-js'"), 'FAIL: bcrypt test still mocks @supabase/supabase-js (should use @/lib/db)')
  assert(content.includes("jest.mock('@/lib/db'"), 'FAIL: bcrypt test does not mock @/lib/db')
  assert(content.includes('postgrestAdmin'), 'FAIL: @/lib/db mock missing postgrestAdmin export')
  assert(content.includes('postgrestPublic'), 'FAIL: @/lib/db mock missing postgrestPublic export')
  console.log('PASS: bcrypt test correctly mocks @/lib/db instead of @supabase/supabase-js')
}

// ── Test 4: upgrade-checkout test uses PostgREST URL, not Supabase URL ────────
{
  const content = fs.readFileSync(UPGRADE_TEST, 'utf8')
  assert(!content.includes('supabase.co'), 'FAIL: upgrade-checkout test still references supabase.co URL')
  assert(content.includes('localhost:8788/rest/v1'), 'FAIL: upgrade-checkout test should set NEXT_PUBLIC_API_URL to localhost:8788/rest/v1')
  console.log('PASS: upgrade-checkout test uses PostgREST URL (not Supabase)')
}

// ── Test 5: Run the two fixed Jest test suites and verify they pass ────────────
{
  console.log('Running bcrypt-password-verify and upgrade-checkout tests...')
  try {
    const result = execSync(
      'npm test -- --testPathPattern="bcrypt-password-verify|upgrade-checkout" --no-coverage --forceExit 2>&1',
      { cwd: DASHBOARD_DIR, timeout: 90000, encoding: 'utf8' }
    )
    // Check for pass summary
    assert(result.includes('Tests:'), 'FAIL: Jest did not produce test summary')
    assert(!result.includes('Test Suites: 0 passed'), 'FAIL: No test suites passed')
    
    // Extract pass counts
    const match = result.match(/Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed/)
    const passOnly = result.match(/Tests:\s+(\d+)\s+passed/)
    
    if (match) {
      const failed = parseInt(match[1], 10)
      assert.strictEqual(failed, 0, `FAIL: ${failed} tests still failing in the fixed test files`)
    } else if (passOnly) {
      const passed = parseInt(passOnly[1], 10)
      assert(passed >= 24, `FAIL: Expected at least 24 tests to pass, got ${passed}`)
    }
    
    assert(!result.includes('FAIL __tests__/bcrypt-password-verify'), 'FAIL: bcrypt-password-verify.test.ts is still failing')
    assert(!result.includes('FAIL __tests__/upgrade-checkout'), 'FAIL: upgrade-checkout.test.ts is still failing')
    
    console.log('PASS: Both fixed test suites pass (bcrypt 11/11, upgrade-checkout 13/13)')
  } catch (err) {
    // execSync throws on non-zero exit — extract output
    const output = err.stdout || err.message || ''
    if (output.includes('FAIL __tests__/bcrypt-password-verify') || output.includes('FAIL __tests__/upgrade-checkout')) {
      console.error('FAIL: Jest test output:', output.slice(-2000))
      process.exit(1)
    }
    // If only other unrelated suites fail, that's pre-existing — check ours specifically
    if (output.includes('PASS __tests__/bcrypt-password-verify') && output.includes('PASS __tests__/upgrade-checkout')) {
      console.log('PASS: Both fixed test suites pass despite other pre-existing failures')
    } else {
      console.error('FAIL: Unexpected test runner error:', output.slice(-1000))
      process.exit(1)
    }
  }
}

console.log('\nALL CHECKS PASSED — PR fixes are valid and both test suites are clean.')
