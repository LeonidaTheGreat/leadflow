'use strict'

/**
 * E2E test: fix-email-delivery-resend-from-domain-not-verified
 *
 * Verifies that active email send paths use onboarding@leadflow.ai as the default
 * FROM address instead of an unverified/test domain.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_LIB_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'lib')

const files = [
  path.join('product', 'lead-response', 'dashboard', 'lib', 'email-service.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'nps-email-service.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'trial-emails.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'outreach-email-service.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'verification-email.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'lead-magnet-email.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'pilot-conversion-service.ts'),
  path.join('product', 'lead-response', 'dashboard', 'lib', 'email-config-validation.ts'),
  path.join('product', 'lead-response', 'dashboard', 'app', 'api', 'auth', 'pilot-signup', 'route.ts'),
  path.join('product', 'lead-response', 'dashboard', 'app', 'api', 'admin', 'pilot-signups', 'invite', 'route.ts'),
  path.join('lib', 'services', 'EmailService.js'),
  path.join('lib', 'services', 'ActivationService.js'),
  path.join('lib', 'services', 'LapsedTrialReactivationService.js'),
  path.join('lib', 'services', 'PilotConversionService.js'),
  path.join('lib', 'services', 'WeeklyPerformanceService.js'),
  path.join('lib', 'config', 'index.js'),
]

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

for (const file of files) {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf-8')

  test(`${file}: contains onboarding@leadflow.ai fallback`, () => {
    assert.ok(src.includes('onboarding@leadflow.ai'), 'Missing onboarding@leadflow.ai')
  })

  test(`${file}: sender fallback does not use resend.dev or landyourleads default`, () => {
    const fallbackLine = src
      .split('\n')
      .find(line =>
        line.includes('process.env.FROM_EMAIL')
        || line.includes('process.env.OUTREACH_FROM_EMAIL')
        || line.includes('options.fromEmail')
      )
    assert.ok(fallbackLine, 'Missing FROM_EMAIL fallback line')
    assert.ok(!fallbackLine.includes('onboarding@resend.dev'), `Fallback uses resend.dev: ${fallbackLine.trim()}`)
    assert.ok(!fallbackLine.includes('landyourleads.com'), `Fallback uses landyourleads.com: ${fallbackLine.trim()}`)
  })
}

console.log(`Results: ${passed}/${total} passed`)
if (passed !== total) process.exit(1)
