'use strict'

/**
 * QC E2E test for PR #1862 — Direct Stripe Payment Link
 *
 * Validates architecture rules, security, and code quality by inspecting
 * the PR diff (fetched via gh CLI).
 *
 * Verify: node tests/e2e/qc-pr1862-payment-link.test.js
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

let passed = 0, failed = 0
const errors = []

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    errors.push({ name, error: e.message })
    failed++
  }
}

const diff = execSync('gh pr diff 1862 2>/dev/null || echo ""', { encoding: 'utf8', maxBuffer: 1024 * 1024 })
if (!diff.trim()) {
  console.error('Could not fetch PR #1862 diff')
  process.exit(1)
}

function extractFile(filePath) {
  const marker = `+++ b/${filePath}`
  const idx = diff.indexOf(marker)
  if (idx === -1) return null
  const nextFile = diff.indexOf('\ndiff --git', idx + 1)
  const section = nextFile === -1 ? diff.slice(idx) : diff.slice(idx, nextFile)
  return section
    .split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .map(l => l.slice(1))
    .join('\n')
}

console.log('\nQC E2E — PR #1862: Direct Stripe Payment Link (diff-based review)\n')

// ── Architecture: Express route must use existing PaymentLinkService ──

test('ARCH: payment-link.js must not remove PaymentLinkService (regression check)', () => {
  const src = extractFile('routes/admin/payment-link.js')
  assert.ok(src, 'routes/admin/payment-link.js not found in diff')
  const removesService = !src.includes('PaymentLinkService')
  assert.ok(
    !removesService,
    'REGRESSION: main already has a clean pattern — routes/admin/payment-link.js uses ' +
    'PaymentLinkService from lib/services/PaymentLinkService.js (thin route + service). ' +
    'This PR replaces it with inline Stripe calls, making PaymentLinkService dead code. ' +
    'Fix: use the existing PaymentLinkService instead of inlining.'
  )
})

test('ARCH: payment-link.js should use StripeService, not inline Stripe calls', () => {
  const src = extractFile('routes/admin/payment-link.js')
  assert.ok(src, 'routes/admin/payment-link.js not found in diff')
  const hasInlineStripe = src.includes("stripe.prices.create") || src.includes("stripe.paymentLinks.create")
  const usesService = src.includes('StripeService') || src.includes('require') && src.includes("services/Stripe")
  assert.ok(
    !hasInlineStripe || usesService,
    'VIOLATION: routes/admin/payment-link.js has inline Stripe API calls (stripe.prices.create, ' +
    'stripe.paymentLinks.create) instead of using lib/services/StripeService.js. ' +
    'Existing pattern: activation-outreach.js uses ActivationService.'
  )
})

test('ARCH: payment-link.js should use service for DB queries, not inline pool.query', () => {
  const src = extractFile('routes/admin/payment-link.js')
  assert.ok(src, 'routes/admin/payment-link.js not found in diff')
  const hasInlineQuery = src.includes('pool.query')
  assert.ok(
    !hasInlineQuery,
    'VIOLATION: routes/admin/payment-link.js has inline pool.query. ' +
    'Routes must be thin — DB operations belong in service classes (see activation-outreach.js pattern).'
  )
})

// ── Duplicate constants ──

test('DRY: TIER_CONFIG should not be duplicated across files', () => {
  const files = [
    'routes/admin/payment-link.js',
    'product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts',
  ]
  let tierConfigCount = 0
  for (const f of files) {
    const src = extractFile(f)
    if (src && src.includes('TIER_CONFIG')) tierConfigCount++
  }
  assert.ok(
    tierConfigCount <= 1,
    `TIER_CONFIG is defined in ${tierConfigCount} files. Should be in one shared location.`
  )
})

// ── Magic numbers ──

test('NO MAGIC: send-payment-link-email must not have bare unit_amount: 4900', () => {
  const src = extractFile('product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts')
  assert.ok(src, 'send-payment-link-email/route.ts not found in diff')
  assert.ok(
    !src.includes('unit_amount: 4900'),
    'VIOLATION: send-payment-link-email/route.ts uses magic number `unit_amount: 4900`. ' +
    'Must use a named constant or import from a shared tier config.'
  )
})

// ── Security: HTML email escaping ──

test('SEC: email HTML template should escape firstName to prevent XSS', () => {
  const src = extractFile('product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts')
  assert.ok(src, 'send-payment-link-email/route.ts not found in diff')
  const hasRawInterpolation = src.includes("${firstName || 'there'}") || src.includes('${firstName}')
  if (hasRawInterpolation) {
    const hasEscapeCall = src.includes('escapeHtml(firstName') || src.includes('sanitize(firstName')
    assert.ok(
      hasEscapeCall,
      'WARNING: firstName is interpolated directly into HTML email template (buildEmailHtml) ' +
      'without HTML-escaping. A DB record with <script> or HTML tags in first_name would inject ' +
      'into the email body. Use an escapeHtml() helper before interpolation.'
    )
  }
})

// ── Security: auth gates ──

test('SEC: all new routes have auth gates', () => {
  const routeFiles = [
    'routes/admin/payment-link.js',
    'product/lead-response/dashboard/app/api/admin/activation/route.ts',
    'product/lead-response/dashboard/app/api/admin/activation/completed/route.ts',
    'product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts',
  ]
  for (const f of routeFiles) {
    const src = extractFile(f)
    if (!src) continue
    const hasAuth = src.includes('requireApiKey') || src.includes('requireAdmin')
    assert.ok(hasAuth, `${f} is missing auth gate (requireApiKey or requireAdmin)`)
  }
})

// ── Security: SQL injection ──

test('SEC: payment-link.js uses parameterized queries', () => {
  const src = extractFile('routes/admin/payment-link.js')
  assert.ok(src, 'routes/admin/payment-link.js not found in diff')
  if (src.includes('pool.query')) {
    assert.ok(
      src.includes('$1'),
      'DB query must use parameterized placeholders ($1, $2, etc.)'
    )
    const hasStringConcat = /query\s*\(\s*['"`].*\+/.test(src)
    assert.ok(!hasStringConcat, 'SQL query must not use string concatenation')
  }
})

// ── Correctness: Stripe webhook metadata fallback ──

test('CORRECT: webhook reads agent_id from metadata as fallback', () => {
  const src = extractFile('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
  assert.ok(src, 'stripe webhook route.ts not found in diff')
  assert.ok(
    src.includes('metadata') && src.includes('agent_id'),
    'Webhook must read agent_id from session metadata for payment link flow'
  )
})

test('CORRECT: webhook validates metadata tier against known list', () => {
  const src = extractFile('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
  assert.ok(src, 'stripe webhook route.ts not found in diff')
  assert.ok(
    src.includes('KNOWN_TIERS') || src.includes("['starter', 'pro', 'team']"),
    'Webhook must validate metadata tier against known tier list'
  )
})

// ── Correctness: server.js registration ──

test('CORRECT: server.js registers payment-link router', () => {
  const src = extractFile('server.js')
  assert.ok(src, 'server.js not found in diff')
  assert.ok(
    src.includes("require('./routes/admin/payment-link')"),
    'payment-link router must be registered in server.js'
  )
})

// ── Report ──

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\nFailing checks (REJECT reasons):')
  for (const { name, error } of errors) {
    console.log(`  • ${name}`)
    console.log(`    ${error}\n`)
  }
  process.exit(1)
}
