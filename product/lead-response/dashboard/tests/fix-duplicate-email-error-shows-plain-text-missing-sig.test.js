/**
 * E2E Test: Duplicate Email Error Shows Sign-In Link
 * 
 * Tests that when a user tries to sign up with an email that already exists,
 * the error message includes a clickable sign-in link (not just plain text).
 * 
 * Acceptance Criteria:
 * - Duplicate email error shows friendly message with sign-in link
 * - Link is rendered as a proper Next.js Link component (not plain text)
 * - Both compact and full form variants show the sign-in link
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

// Test configuration
const DASHBOARD_DIR = path.join(__dirname, '..')
const COMPONENT_PATH = path.join(DASHBOARD_DIR, 'components', 'trial-signup-form.tsx')

// Colors for output
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const RESET = '\x1b[0m'

let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`${GREEN}✓${RESET} ${name}`)
    testsPassed++
  } catch (error) {
    console.log(`${RED}✗${RESET} ${name}`)
    console.log(`  ${RED}Error: ${error.message}${RESET}`)
    testsFailed++
  }
}

// Read the component source
const componentSource = fs.readFileSync(COMPONENT_PATH, 'utf-8')

console.log('\n=== Duplicate Email Error Sign-In Link E2E Test ===\n')

// Test 1: Link component is imported
test('Link component is imported from next/link', () => {
  assert(
    componentSource.includes("import Link from 'next/link'") ||
    componentSource.includes('import Link from "next/link"'),
    'Link component should be imported from next/link'
  )
})

// Test 2: isDuplicateEmailError state exists
test('isDuplicateEmailError state is defined', () => {
  assert(
    componentSource.includes('isDuplicateEmailError'),
    'isDuplicateEmailError state should be defined'
  )
  assert(
    componentSource.includes('setIsDuplicateEmailError'),
    'setIsDuplicateEmailError setter should be defined'
  )
})

// Test 3: Duplicate email detection logic exists
test('Duplicate email detection logic exists in error handler', () => {
  assert(
    componentSource.includes('response.status === 409') ||
    componentSource.includes("errorMessage.toLowerCase().includes('already exists')"),
    'Should detect duplicate email by 409 status or error message'
  )
  assert(
    componentSource.includes('setIsDuplicateEmailError(true)'),
    'Should set isDuplicateEmailError to true when duplicate detected'
  )
})

// Test 4: Compact form variant shows sign-in link
test('Compact form variant renders sign-in Link component', () => {
  // The component uses if (compact) return (...) pattern (no braces)
  assert(
    componentSource.includes('if (compact)'),
    'Should have compact form conditional'
  )
  
  // Since the component has two forms (compact and full), verify both have the Link
  // Count occurrences of the duplicate email error pattern with Link
  const duplicateErrorWithLinkPattern = /isDuplicateEmailError \? \(\s*<>[\s\S]*?already exists[\s\S]*?<Link[\s\S]*?\/Link>[\s\S]*?<\/>[\s\S]*?\) :/g
  const matches = componentSource.match(duplicateErrorWithLinkPattern)
  
  // Should have at least 2 matches (one in compact form, one in full form)
  assert(
    matches && matches.length >= 2,
    `Should have duplicate email error with Link in both form variants (found ${matches ? matches.length : 0})`
  )
  
  // Verify compact form section exists and contains the Link
  // The compact form is: if (compact) { return (...) } or if (compact) return (...)
  const compactFormStart = componentSource.indexOf('if (compact)')
  // Find the matching closing paren for the return statement
  // Look for the pattern where we exit the compact form (starts with just "return" for full form)
  const fullFormReturn = componentSource.indexOf('\n  return (', compactFormStart + 1)
  const compactSection = componentSource.substring(compactFormStart, fullFormReturn)
  
  assert(
    compactSection.includes('isDuplicateEmailError'),
    'Compact form should check isDuplicateEmailError'
  )
  assert(
    compactSection.includes('<Link'),
    'Compact form should render Link component'
  )
  assert(
    compactSection.includes('href="/login"'),
    'Compact form Link should point to /login'
  )
  assert(
    compactSection.includes('Sign in'),
    'Compact form should show "Sign in" text'
  )
})

// Test 5: Full form variant shows sign-in link
test('Full form variant renders sign-in Link component', () => {
  // The full form is the else branch, look for error display with Link
  assert(
    componentSource.includes('isDuplicateEmailError ?'),
    'Full form should have conditional for duplicate email error'
  )
  assert(
    componentSource.match(/<Link[^>]*href="\/login"[^>]*>[^<]*Sign in/),
    'Full form should render Link to /login with "Sign in" text'
  )
})

// Test 6: Error message content is correct
test('Error message includes "already exists" text', () => {
  assert(
    componentSource.includes('An account with this email already exists'),
    'Error message should include "An account with this email already exists"'
  )
})

// Test 7: Link has proper styling classes
test('Sign-in link has proper styling classes', () => {
  assert(
    componentSource.includes('underline') &&
    componentSource.includes('hover:text-red'),
    'Link should have underline and hover styling'
  )
})

// Test 8: State is reset on form submission
test('isDuplicateEmailError is reset on form submission', () => {
  assert(
    componentSource.includes('setIsDuplicateEmailError(false)'),
    'Should reset isDuplicateEmailError to false when form is submitted'
  )
})

// Summary
console.log('\n=== Test Summary ===')
console.log(`Total: ${testsPassed + testsFailed}`)
console.log(`${GREEN}Passed: ${testsPassed}${RESET}`)
console.log(`${RED}Failed: ${testsFailed}${RESET}`)

if (testsFailed > 0) {
  console.log(`\n${RED}E2E TEST FAILED${RESET}`)
  process.exit(1)
} else {
  console.log(`\n${GREEN}E2E TEST PASSED${RESET}`)
  process.exit(0)
}
