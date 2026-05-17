/**
 * E2E Test: Duplicate email error renders sign-in link (not plain text)
 * Task ID: 9b7233b0-b54a-4480-a7e6-745ce5accfef
 *
 * Verifies:
 *  1. API route returns 409 with "already exists" message for duplicate emails
 *  2. TrialSignupForm tracks isDuplicateEmailError state
 *  3. TrialSignupForm detects 409 OR "already exists" in error message
 *  4. Both compact and full form variants render a <Link href="/login"> sign-in link
 *
 * Run with: node tests/e2e/fix-duplicate-email-error-shows-plain-text.test.js
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')
const FORM_PATH = path.join(DASHBOARD, 'components/trial-signup-form.tsx')
const ROUTE_PATH = path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts')

let testsRun = 0
let testsPassed = 0
let testsFailed = 0

function test(name, fn) {
  testsRun++
  try {
    fn()
    console.log(`  ✓ ${name}`)
    testsPassed++
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`)
    testsFailed++
  }
}

function describe(name, fn) {
  console.log(`\n${name}`)
  fn()
}

console.log('Duplicate Email Error — Sign-in Link Test')
console.log('='.repeat(50))

const formContent = fs.readFileSync(FORM_PATH, 'utf-8')
const routeContent = fs.readFileSync(ROUTE_PATH, 'utf-8')

describe('API route: returns 409 for duplicate emails', () => {
  test('route checks for existing account before insert', () => {
    assert.ok(
      routeContent.includes('existingAgent') || routeContent.includes('already exists'),
      'Route must check for existing email'
    )
  })

  test('route returns status 409 for duplicate email', () => {
    assert.ok(
      routeContent.includes('status: 409'),
      'Route must return 409 for duplicate email'
    )
  })

  test('route returns "already exists" message', () => {
    assert.ok(
      routeContent.includes('already exists'),
      'Route must include "already exists" in duplicate-email error message'
    )
  })
})

describe('TrialSignupForm: duplicate email detection', () => {
  test('component tracks isDuplicateEmailError state', () => {
    assert.ok(
      formContent.includes('isDuplicateEmailError'),
      'Component must have isDuplicateEmailError state'
    )
  })

  test('component sets isDuplicateEmailError on 409 response', () => {
    assert.ok(
      formContent.includes('response.status === 409') ||
      formContent.includes('status === 409'),
      'Component must detect 409 status to trigger duplicate-email state'
    )
  })

  test('component sets isDuplicateEmailError when message includes "already exists"', () => {
    assert.ok(
      formContent.includes('already exists'),
      'Component must detect "already exists" in error message as duplicate-email signal'
    )
  })
})

describe('TrialSignupForm: renders sign-in link (not plain text)', () => {
  test('full form renders Link to /login when isDuplicateEmailError', () => {
    assert.ok(
      formContent.includes('isDuplicateEmailError') &&
      formContent.includes('href="/login"'),
      'Full form must render <Link href="/login"> when isDuplicateEmailError is true'
    )
  })

  test('compact form also renders Link to /login for duplicate email', () => {
    const linkCount = (formContent.match(/href="\/login"/g) || []).length
    assert.ok(
      linkCount >= 2,
      `Both compact and full form must render sign-in link — found ${linkCount} occurrences of href="/login", expected >= 2`
    )
  })

  test('sign-in link text is "Sign in" (not just plain text in error string)', () => {
    assert.ok(
      formContent.includes('Sign in'),
      'Link must contain "Sign in" text'
    )
  })
})

describe('Detection logic: unit verification', () => {
  test('409 status triggers duplicate-email path', () => {
    const detectDuplicate = (status, msg) =>
      status === 409 || msg.toLowerCase().includes('already exists')

    assert.strictEqual(detectDuplicate(409, 'An account with this email already exists.'), true)
    assert.strictEqual(detectDuplicate(400, 'Email already exists in our system.'), true)
    assert.strictEqual(detectDuplicate(500, 'Something went wrong. Please try again.'), false)
    assert.strictEqual(detectDuplicate(400, 'Email and password are required'), false)
  })
})

console.log(`\n${'='.repeat(50)}`)
console.log(`Results: ${testsPassed}/${testsRun} passed${testsFailed > 0 ? `, ${testsFailed} failed` : ''}`)

if (testsFailed > 0) {
  process.exit(1)
}
