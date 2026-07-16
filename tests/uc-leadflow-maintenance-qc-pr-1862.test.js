'use strict'

/**
 * QC E2E test for PR #1862 — Direct Stripe Payment Link
 *
 * Validates architecture: PaymentLinkService already exists, PR should use it.
 * Validates webhook metadata fallback for payment links.
 *
 * Usage: node tests/uc-leadflow-maintenance-qc-pr-1862.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

let passed = 0, failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

const root = path.resolve(__dirname, '..')
const mainRoot = '/Users/clawdbot/projects/leadflow'

console.log('\nQC PR #1862 — architecture and correctness checks\n')

let prDiff = ''
try {
  prDiff = execSync('gh pr diff 1862', { cwd: mainRoot, encoding: 'utf8', timeout: 15000 })
} catch {
  console.log('  WARNING: Could not fetch PR diff via gh CLI')
}

// 1. PaymentLinkService already exists and covers the needed functionality
test('PaymentLinkService.js exists and covers payment link creation', () => {
  const svcPath = path.join(mainRoot, 'lib/services/PaymentLinkService.js')
  assert.ok(fs.existsSync(svcPath), 'PaymentLinkService.js should exist in lib/services/')
  const src = fs.readFileSync(svcPath, 'utf8')
  assert.ok(src.includes('createPaymentLink'), 'Service exposes createPaymentLink()')
  assert.ok(src.includes('prices.create'), 'Service creates Stripe prices on-the-fly')
  assert.ok(src.includes('paymentLinks.create'), 'Service creates Stripe payment links')
  assert.ok(src.includes('4900'), 'Service has starter tier at $49')
  assert.ok(src.includes('14900'), 'Service has pro tier at $149')
  assert.ok(src.includes('39900'), 'Service has team tier at $399')
})

// 2. PR introduces inline Stripe logic instead of using existing service
test('PR adds inline stripe.prices.create (duplicates PaymentLinkService)', () => {
  assert.ok(prDiff.length > 0, 'PR diff should be available')
  const addedPriceCreates = (prDiff.match(/^\+.*prices\.create/gm) || []).length
  assert.ok(addedPriceCreates >= 2,
    `PR adds ${addedPriceCreates} new prices.create calls — PaymentLinkService already does this`)
})

// 3. PR adds inline paymentLinks.create in multiple locations
test('PR adds inline paymentLinks.create in multiple files', () => {
  const addedLinkCreates = (prDiff.match(/^\+.*paymentLinks\.create/gm) || []).length
  assert.ok(addedLinkCreates >= 2,
    `PR adds ${addedLinkCreates} new paymentLinks.create calls — should use PaymentLinkService`)
})

// 4. Webhook metadata.agent_id fallback is a valid change
test('Stripe webhook adds metadata.agent_id fallback for payment links', () => {
  assert.ok(prDiff.includes('webhooks/stripe/route.ts'), 'PR modifies Stripe webhook')
  assert.ok(prDiff.includes('metadata'), 'Webhook diff references metadata')
  assert.ok(prDiff.includes('agent_id'), 'Webhook diff adds agent_id lookup')
})

// 5. Activation API routes use auth
test('New activation routes use requireAdmin auth', () => {
  const lines = prDiff.split('\n')
  const addedRequireAdmin = lines.filter(l => l.startsWith('+') && l.includes('requireAdmin'))
  assert.ok(addedRequireAdmin.length >= 2, `Found ${addedRequireAdmin.length} added requireAdmin calls`)
})

// 6. No hardcoded secrets in PR diff
test('No hardcoded secrets in PR diff', () => {
  const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /sk_test_[a-zA-Z0-9]+/, /whsec_[a-zA-Z0-9]+/]
  for (const pat of secretPatterns) {
    assert.ok(!pat.test(prDiff), `PR diff contains hardcoded secret matching ${pat}`)
  }
})

// 7. Backend route uses parameterized SQL
test('Backend route uses parameterized queries ($1 placeholders)', () => {
  if (prDiff.includes('pool.query')) {
    assert.ok(prDiff.includes('$1'), 'SQL should use $1 parameterized placeholders')
  }
})

// 8. Sales cockpit GET now returns onboarding_completed
test('Sales cockpit adds onboarding_completed to response', () => {
  const addedLines = prDiff.split('\n').filter(l => l.startsWith('+') && l.includes('onboarding_completed'))
  assert.ok(addedLines.length >= 1, 'PR adds onboarding_completed field')
})

// 9. Activation page has SMS nudge and payment link functions
test('Activation page has sendNudge, nudgeAll, generatePaymentLink', () => {
  const addedLines = prDiff.split('\n').filter(l => l.startsWith('+'))
  const joined = addedLines.join('\n')
  assert.ok(joined.includes('sendNudge'), 'Page has sendNudge function')
  assert.ok(joined.includes('nudgeAll'), 'Page has nudgeAll function')
  assert.ok(joined.includes('generatePaymentLink'), 'Page has generatePaymentLink function')
})

// 10. Count total Stripe price/link creation locations (service + PR additions)
test('Total Stripe payment link creation points after PR: 4+ (should be 1)', () => {
  const svcPath = path.join(mainRoot, 'lib/services/PaymentLinkService.js')
  const svc = fs.readFileSync(svcPath, 'utf8')
  const svcCount = (svc.match(/prices\.create/g) || []).length
  const prCount = (prDiff.match(/^\+.*prices\.create/gm) || []).length
  const total = svcCount + prCount
  console.log(`    PaymentLinkService: ${svcCount} call(s), PR adds: ${prCount} call(s), total: ${total}`)
  assert.ok(total > 1, `${total} separate Stripe price creation points — should consolidate into service`)
})

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
