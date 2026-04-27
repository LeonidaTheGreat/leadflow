'use strict'

/**
 * E2E test: fix-email-delivery-resend-from-domain-not-verified
 *
 * Verifies that all email services use onboarding@leadflow.ai as the default
 * FROM address instead of the Resend test domain (onboarding@resend.dev).
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
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ FAIL: ${name}`)
    console.log(`     ${err.message}`)
  }
}

console.log('\n🧪 fix-email-delivery-resend-from-domain-not-verified\n')

console.log('email-service.ts')
const emailService = fs.readFileSync(path.join(LIB_DIR, 'email-service.ts'), 'utf-8')

test('default FROM_EMAIL is onboarding@leadflow.ai', () => {
  assert.ok(emailService.includes("'onboarding@leadflow.ai'"), 'Missing onboarding@leadflow.ai')
})

test('does not fall back to resend.dev test domain', () => {
  assert.ok(!emailService.includes("'onboarding@resend.dev'"), 'Still contains onboarding@resend.dev')
})

test('reads FROM_EMAIL from process.env', () => {
  assert.ok(emailService.includes('process.env.FROM_EMAIL'), 'Missing process.env.FROM_EMAIL')
})

test('comment mentions domain is verified in Resend', () => {
  assert.ok(emailService.includes('verified in Resend'), 'Missing "verified in Resend" comment')
})

console.log('\ntrial-emails.ts')
const trialEmails = fs.readFileSync(path.join(LIB_DIR, 'trial-emails.ts'), 'utf-8')

test('defines FROM_EMAIL constant with leadflow.ai fallback', () => {
  assert.ok(trialEmails.includes("'onboarding@leadflow.ai'"), 'Missing onboarding@leadflow.ai')
})

test('defines FROM_DISPLAY as dynamic template', () => {
  assert.ok(trialEmails.includes('const FROM_DISPLAY = `LeadFlow AI <${FROM_EMAIL}>`'), 'Missing FROM_DISPLAY')
})

test('uses FROM_DISPLAY in email sends', () => {
  assert.ok(trialEmails.includes('from: FROM_DISPLAY,'), 'Missing from: FROM_DISPLAY,')
})

test('does not contain resend.dev test domain', () => {
  assert.ok(!trialEmails.includes("'onboarding@resend.dev'"), 'Contains resend.dev')
})

console.log('\nnps-email-service.ts')
const npsService = fs.readFileSync(path.join(LIB_DIR, 'nps-email-service.ts'), 'utf-8')

test('default FROM_EMAIL is onboarding@leadflow.ai', () => {
  assert.ok(npsService.includes("'onboarding@leadflow.ai'"), 'Missing onboarding@leadflow.ai')
})

test('does not fall back to resend.dev test domain', () => {
  assert.ok(!npsService.includes("'onboarding@resend.dev'"), 'Still contains onboarding@resend.dev')
})

console.log('\noutreach-email-service.ts')
const outreachService = fs.readFileSync(path.join(LIB_DIR, 'outreach-email-service.ts'), 'utf-8')

test('final fallback is onboarding@leadflow.ai', () => {
  assert.ok(outreachService.includes("'onboarding@leadflow.ai'"), 'Missing onboarding@leadflow.ai')
})

test('does not contain resend.dev test domain', () => {
  assert.ok(!outreachService.includes("'onboarding@resend.dev'"), 'Contains resend.dev')
})

console.log(`\n${'='.repeat(60)}`)
console.log(`Results: ${passed}/${total} passed`)

if (passed !== total) {
  process.exit(1)
}
