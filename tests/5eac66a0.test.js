/**
 * E2E test for PR #1036: login error selector fix
 * Task: 5eac66a0-6a3c-4f24-9dfb-bede5058ec21
 *
 * Verifies:
 * 1. The login page component contains data-testid="login-error-message"
 * 2. The auth spec now uses getByTestId('login-error-message') not [class*="red"]
 * 3. The timeout was increased to 25000 (from 10000)
 * 4. The data-testid is on the conditionally rendered error div (only when error != null)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`)
    failed++
  }
}

const loginPagePath = path.join(__dirname, '../product/lead-response/dashboard/app/login/page.tsx')
const authSpecPath = path.join(__dirname, 'browser/auth.spec.js')

const loginPage = fs.readFileSync(loginPagePath, 'utf8')
const authSpec = fs.readFileSync(authSpecPath, 'utf8')

// 1. data-testid="login-error-message" exists in login page component
check('login page has data-testid="login-error-message"', () => {
  assert.ok(loginPage.includes('data-testid="login-error-message"'),
    'Missing data-testid="login-error-message" in login/page.tsx')
})

// 2. The error div is conditional on error state (not always rendered)
check('error element is conditionally rendered on error state', () => {
  // The pattern should be: {error && (<div data-testid="login-error-message"
  assert.ok(loginPage.includes('{error && ('), 'Error block not conditionally rendered')
  const errorBlockStart = loginPage.indexOf('{error && (')
  const testidIndex = loginPage.indexOf('data-testid="login-error-message"')
  assert.ok(testidIndex > errorBlockStart, 'data-testid not inside conditional error block')
})

// 3. auth spec uses getByTestId('login-error-message') — not the old [class*="red"] selector
check('auth spec uses getByTestId selector (not class-based selector)', () => {
  assert.ok(authSpec.includes("getByTestId('login-error-message')"),
    'auth.spec.js must use getByTestId("login-error-message")')
  assert.ok(!authSpec.includes('[class*="red"]'),
    'auth.spec.js must NOT use fragile [class*="red"] selector')
})

// 4. Timeout is 25000 (increased from 10000 for Vercel cold starts)
check('auth spec timeout is 25000ms', () => {
  assert.ok(authSpec.includes('timeout: 25000'),
    'Timeout for login-error-message must be 25000ms')
  // The old 10000 timeout for this specific test should be gone
  // (other tests may still use 10000 for other assertions — check only login-error-message context)
  const errorTestidLine = authSpec.split('\n').find(l => l.includes('login-error-message'))
  assert.ok(errorTestidLine, 'Could not find login-error-message line')
  // The timeout=10000 is gone from this line's context
  const surroundingLines = authSpec.split('\n')
  const testidIdx = surroundingLines.findIndex(l => l.includes('login-error-message'))
  const context = surroundingLines.slice(Math.max(0, testidIdx - 1), testidIdx + 2).join('\n')
  assert.ok(context.includes('25000'), 'Timeout near login-error-message must be 25000')
})

// 5. Old [class*="red"] selector is completely gone from auth spec
check('fragile class-based error selector removed from auth spec', () => {
  assert.ok(!authSpec.includes('[class*="red"]'), 'Old [class*="red"] selector must be removed')
})

// 6. login page has the error div styled with red classes (for red-path)
check('login page error div has red styling for standard errors', () => {
  assert.ok(loginPage.includes('bg-red-500/10'),
    'Standard error should have red background styling')
  assert.ok(loginPage.includes('text-red-400'),
    'Standard error should have red text styling')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
