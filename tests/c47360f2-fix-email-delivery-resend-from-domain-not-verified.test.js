'use strict'

/**
 * E2E test: fix-email-delivery-resend-from-domain-not-verified
 *
 * Verifies that dashboard email services use onboarding@leadflow.ai as the default
 * FROM address instead of the Resend test domain.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const LIB_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib')

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

  test(`${file}: contains onboarding@leadflow.ai fallback`, () => {
    assert.ok(src.includes('onboarding@leadflow.ai'), 'Missing onboarding@leadflow.ai')
  })

  test(`${file}: FROM fallback does not use onboarding@resend.dev`, () => {
    const fallbackLine = src
      .split('\n')
      .find(line => line.includes('process.env.FROM_EMAIL') || line.includes('process.env.OUTREACH_FROM_EMAIL'))
    assert.ok(fallbackLine, 'Missing FROM_EMAIL fallback line')
    assert.ok(!fallbackLine.includes('onboarding@resend.dev'), `Fallback uses resend.dev: ${fallbackLine.trim()}`)
  })
}

console.log(`Results: ${passed}/${total} passed`)
if (passed !== total) process.exit(1)
