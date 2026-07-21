'use strict'

/**
 * E2E test: fix-email-delivery-resend-from-domain-not-verified
 *
 * Verifies that dashboard email services and diagnostic scripts use
 * onboarding@landyourleads.com as the FROM address (verified domain),
 * never Resend's sandbox domain (onboarding@resend.dev) which blocks
 * delivery to all recipients except the account owner.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const LIB_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib')
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name}`)
    console.log(`    ${err.message}`)
  }
}

const files = [
  'email-service.ts',
  'nps-email-service.ts',
  'trial-emails.ts',
  'outreach-email-service.ts',
  'verification-email.ts'
]

for (const file of files) {
  const src = fs.readFileSync(path.join(LIB_DIR, file), 'utf-8')

  test(`${file}: contains onboarding@landyourleads.com fallback`, () => {
    assert.ok(src.includes('onboarding@landyourleads.com'), 'Missing onboarding@landyourleads.com')
  })

  test(`${file}: FROM fallback does not use onboarding@resend.dev`, () => {
    const fallbackLine = src
      .split('\n')
      .find(line => line.includes('process.env.FROM_EMAIL') || line.includes('process.env.OUTREACH_FROM_EMAIL'))
    assert.ok(fallbackLine, 'Missing FROM_EMAIL fallback line')
    assert.ok(!fallbackLine.includes('onboarding@resend.dev'), `Fallback uses resend.dev: ${fallbackLine.trim()}`)
  })
}

// Verify the diagnostic script also uses the verified domain
const verifySrc = fs.readFileSync(path.join(SCRIPTS_DIR, 'verify-resend-key-live.js'), 'utf-8')

test('verify-resend-key-live.js: does not hard-code onboarding@resend.dev as sender', () => {
  const lines = verifySrc.split('\n')
  const senderLine = lines.find(line => line.trim().startsWith('from:') && line.includes('resend.dev'))
  assert.ok(!senderLine, `Script hard-codes resend.dev sender: ${senderLine && senderLine.trim()}`)
})

test('verify-resend-key-live.js: uses FROM_EMAIL env var with landyourleads.com fallback', () => {
  assert.ok(
    verifySrc.includes('FROM_EMAIL') && verifySrc.includes('landyourleads.com'),
    'Script must use FROM_EMAIL env var with landyourleads.com fallback'
  )
})

console.log(`Results: ${passed}/${total} passed`)
if (passed !== total) process.exit(1)
