/**
 * QC Tests: fix-pricing-page-checkout-buttons-do-nothing
 * =======================================================
 * Task ID: b0f8d3cb-6c3d-4dda-bbf1-ba086bdd8639
 *
 * Verifies that handleSelectPlan in /app/pricing/page.tsx:
 *   1. No longer contains only a TODO / console.log stub
 *   2. Calls POST /api/billing/create-checkout
 *   3. Maps all four pricing page tiers (starter, pro, team, brokerage) correctly
 *   4. Redirects unauthenticated users to /login
 *   5. Redirects brokerage to contact-sales (mailto)
 *   6. Shows a loading state while checkout is in flight
 *   7. Handles API errors gracefully
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PRICING_PAGE = path.join(
  '/Users/clawdbot/projects/leadflow',
  'product/lead-response/dashboard/app/pricing/page.tsx'
)

let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.error(`  ❌ ${label}`)
    console.error(`     ${e.message}`)
    failed++
  }
}

const src = fs.readFileSync(PRICING_PAGE, 'utf8')

console.log('\n[1] handleSelectPlan implementation check')

test('TODO stub is removed', () => {
  assert.ok(
    !src.includes('// TODO: Implement checkout flow'),
    'Found the TODO stub that should have been replaced'
  )
})

test('console.log stub is removed', () => {
  assert.ok(
    !src.includes("console.log(`Selected plan"),
    'Found the console.log stub that should have been replaced'
  )
})

test('calls POST /api/billing/create-checkout', () => {
  assert.ok(
    src.includes('/api/billing/create-checkout'),
    'Expected fetch call to /api/billing/create-checkout'
  )
})

test('passes tier, agentId, email in request body', () => {
  assert.ok(src.includes('agentId'), 'Missing agentId in body')
  assert.ok(src.includes('email:'), 'Missing email in body')
  assert.ok(src.includes('tier:'), 'Missing tier in body')
})

console.log('\n[2] Tier key mapping')

test('TIER_KEY_MAP defined', () => {
  assert.ok(src.includes('TIER_KEY_MAP'), 'TIER_KEY_MAP constant missing')
})

test('starter maps to "starter"', () => {
  assert.ok(
    src.includes("starter:") && src.includes("'starter'"),
    'starter tier mapping missing'
  )
})

test('pro maps to "professional"', () => {
  assert.ok(
    src.includes("pro:") && src.includes("'professional'"),
    'pro → professional mapping missing'
  )
})

test('team maps to "enterprise"', () => {
  assert.ok(
    src.includes("team:") && src.includes("'enterprise'"),
    'team → enterprise mapping missing'
  )
})

test('brokerage maps to null (contact sales)', () => {
  assert.ok(
    src.includes("brokerage:") && src.includes("null"),
    'brokerage → null (contact sales) mapping missing'
  )
})

test('tier key includes billing interval suffix', () => {
  // Should combine baseTierKey + interval (e.g. "professional_monthly")
  assert.ok(
    src.includes('`${baseTierKey}_${interval}`') ||
    src.includes("baseTierKey + '_' + interval") ||
    src.includes("baseTierKey}_${interval}"),
    'Billing interval is not appended to tier key'
  )
})

console.log('\n[3] Authentication guard')

test('unauthenticated redirect to /login', () => {
  assert.ok(
    src.includes('/login') && src.includes('redirect=/pricing'),
    'Missing redirect-to-login for unauthenticated users'
  )
})

test('reads token from localStorage or sessionStorage', () => {
  assert.ok(
    src.includes('leadflow_token'),
    'Not reading leadflow_token from storage'
  )
})

test('reads user from localStorage or sessionStorage', () => {
  assert.ok(
    src.includes('leadflow_user'),
    'Not reading leadflow_user from storage'
  )
})

console.log('\n[4] Brokerage (Contact Sales) flow')

test('brokerage redirects to sales email', () => {
  assert.ok(
    src.includes('mailto:sales@leadflow.ai') || src.includes('Contact Sales'),
    'Brokerage plan missing contact sales redirect'
  )
})

console.log('\n[5] Loading & error states')

test('loading state variable defined', () => {
  assert.ok(
    src.includes('loadingTier') || src.includes('isLoading'),
    'No loading state for checkout in flight'
  )
})

test('error state variable defined', () => {
  assert.ok(
    src.includes('checkoutError') || src.includes('error'),
    'No error state for checkout failures'
  )
})

test('Loader2 spinner shown during loading', () => {
  assert.ok(
    src.includes('Loader2') || src.includes('animate-spin'),
    'No spinner component for loading state'
  )
})

test('redirects to session.url on success', () => {
  assert.ok(
    src.includes('data.url') || src.includes('session.url') || src.includes('window.location.href'),
    'Missing redirect to Stripe checkout URL'
  )
})

console.log('\n[6] Auth token sent in request headers')

test('Authorization header sent with token', () => {
  assert.ok(
    src.includes('Authorization') && src.includes('Bearer'),
    'Missing Authorization: Bearer header'
  )
})

test('x-agent-id header sent for IDOR protection', () => {
  assert.ok(
    src.includes('x-agent-id'),
    'Missing x-agent-id header for IDOR protection'
  )
})

// Summary
console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\n❌ Tests FAILED')
  process.exit(1)
} else {
  console.log('\n✅ All tests passed')
}
