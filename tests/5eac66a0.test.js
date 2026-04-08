/**
 * E2E test for PR #1036: Fix browser test failures
 * Task: 5eac66a0-6a3c-4f24-9dfb-bede5058ec21
 *
 * Validates:
 * 1. data-testid="login-error-message" exists in the login page source
 * 2. auth.spec.js uses the correct testid selector (not fragile CSS class match)
 * 3. auth.spec.js timeout is >= 20000ms (generous for cold starts)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`FAIL: ${name}`)
    console.log(`      ${e.message}`)
    failed++
  }
}

const loginPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/login/page.tsx')
const authSpecPath = path.join(__dirname, 'browser/auth.spec.js')

const loginPageSrc = fs.readFileSync(loginPagePath, 'utf8')
const authSpecSrc = fs.readFileSync(authSpecPath, 'utf8')

// 1. data-testid exists in the login page
test('login page has data-testid="login-error-message"', () => {
  assert(
    loginPageSrc.includes('data-testid="login-error-message"'),
    'Expected data-testid="login-error-message" in login/page.tsx'
  )
})

// 2. auth.spec.js uses getByTestId for error message (not fragile class selector)
test('auth.spec.js uses getByTestId("login-error-message") for error check', () => {
  assert(
    authSpecSrc.includes("getByTestId('login-error-message')"),
    'Expected getByTestId selector for login-error-message in auth.spec.js'
  )
})

// 3. The old fragile CSS class selector is gone
test('auth.spec.js no longer uses [class*="red"] selector', () => {
  assert(
    !authSpecSrc.includes('[class*="red"]'),
    'Old fragile CSS class selector [class*="red"] should not exist in auth.spec.js'
  )
})

// 4. Timeout is >= 20000 for the error check (generous for Vercel cold starts)
test('auth.spec.js error check timeout is >= 20000ms', () => {
  const match = authSpecSrc.match(/login-error-message[^}]+timeout:\s*(\d+)/)
  assert(match, 'Could not find timeout near login-error-message in auth.spec.js')
  const timeout = parseInt(match[1], 10)
  assert(timeout >= 20000, `Expected timeout >= 20000, got ${timeout}`)
})

// 5. No hardcoded secrets in the changed file
test('auth.spec.js has no hardcoded API keys or secrets', () => {
  const secretPatterns = [/sk_live_/, /sk_test_/, /password.*=.*['"][^'"]{10,}['"]/i, /api[_-]?key\s*=\s*['"][^'"]{10,}['"]/i]
  for (const pattern of secretPatterns) {
    assert(!pattern.test(authSpecSrc), `Found potential secret matching ${pattern} in auth.spec.js`)
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
