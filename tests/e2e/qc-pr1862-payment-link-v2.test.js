'use strict'

/**
 * QC E2E test for PR #1862 — Direct Stripe Payment Link
 *
 * Reads PR branch code via `git show` to validate correctness without cherry-picking.
 *
 * Validates:
 *  1. Webhook handler resolves agent_id from metadata (payment link flow)
 *  2. Tier validation in payment-link route
 *  3. Activation route stage param filtering
 *  4. Email route auth and fallback
 *  5. Express route validation and parameterized SQL
 *  6. TIER_CONFIG consistency across Express and Next.js
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')

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

const ROOT = path.resolve(__dirname, '../..')
const PR_REF = 'FETCH_HEAD'

function readFromPR(relPath) {
  try {
    return execSync(`git show ${PR_REF}:${relPath}`, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  } catch {
    return null
  }
}

console.log('\nQC PR #1862 — Direct Stripe Payment Link (code-level verification)\n')

// Ensure FETCH_HEAD is available
try {
  execSync('git fetch origin graveyard/3db389c7-dev-uc-stripe-payment-link-direct-direct-1784206193 2>/dev/null', { cwd: ROOT, stdio: 'pipe' })
} catch {
  console.log('  ⚠️  Could not fetch PR branch — trying existing FETCH_HEAD')
}

// ── 1. Webhook handler: metadata fallback for agent_id ────────────────────────

test('Webhook handleCheckoutComplete resolves userId from metadata', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
  assert.ok(src, 'Stripe webhook route.ts must exist on PR branch')
  assert.ok(
    src.includes('session.metadata') && src.includes('agent_id'),
    'handleCheckoutComplete must read agent_id from session.metadata for payment link flow'
  )
  assert.ok(
    src.includes('client_reference_id'),
    'Must preserve client_reference_id as primary lookup (backward compat)'
  )
})

test('Webhook tier resolution uses metadata tier with KNOWN_TIERS guard', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/webhooks/stripe/route.ts')
  assert.ok(src)
  assert.ok(
    src.includes('KNOWN_TIERS') || src.includes("['starter', 'pro', 'team']"),
    'Must validate metadata tier against known tier list before using'
  )
  assert.ok(
    src.includes('getTierFromPriceId'),
    'Must fall back to getTierFromPriceId when metadata tier is absent'
  )
})

// ── 2. Payment-link route: tier validation ────────────────────────────────────

test('Payment-link route validates tier against allowlist', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts')
  assert.ok(src, 'Payment-link route.ts must exist on PR branch')
  assert.ok(
    src.includes('VALID_TIERS') && src.includes("'starter'") && src.includes("'pro'") && src.includes("'team'"),
    'Must define VALID_TIERS with starter, pro, team'
  )
  assert.ok(
    src.includes('VALID_TIERS.includes'),
    'Must check incoming tier against VALID_TIERS'
  )
})

test('Payment-link route accepts agentId for DB lookup', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts')
  assert.ok(src)
  assert.ok(src.includes('agentId'), 'Must accept agentId parameter')
  assert.ok(src.includes('agentEmail'), 'Must preserve agentEmail for backward compat')
})

// ── 3. Activation route: stage filtering ──────────────────────────────────────

test('Activation GET route filters by stage param', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/activation/route.ts')
  assert.ok(src, 'Activation route.ts must exist on PR branch')
  assert.ok(src.includes('in_progress'), 'Must handle in_progress stage')
  assert.ok(src.includes('onboarding_step'), 'Must filter by onboarding_step')
  assert.ok(src.includes('onboarding_completed'), 'Must filter by onboarding_completed')
})

test('Activation POST validates phone before sending SMS', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/activation/route.ts')
  assert.ok(src)
  assert.ok(src.includes('normalizePhone'), 'Must normalize phone numbers')
  assert.ok(src.includes('isValidPhoneNumber'), 'Must validate phone numbers before sending')
  assert.ok(src.includes('last_activation_sms_at'), 'Must record SMS send timestamp')
})

test('Activation route requires admin auth', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/activation/route.ts')
  assert.ok(src)
  assert.ok(src.includes('requireAdmin'), 'Must use requireAdmin auth guard')
})

// ── 4. Email template route ───────────────────────────────────────────────────

test('send-payment-link-email route requires admin auth and agentId', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts')
  assert.ok(src, 'send-payment-link-email route.ts must exist on PR branch')
  assert.ok(src.includes('requireAdmin'), 'Must require admin auth')
  assert.ok(src.includes('agentId'), 'Must require agentId')
})

test('send-payment-link-email falls back gracefully when RESEND_API_KEY missing', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts')
  assert.ok(src)
  assert.ok(
    src.includes('RESEND_API_KEY') && src.includes('503'),
    'Must return 503 with payment link URL when email provider is not configured'
  )
  assert.ok(
    src.includes('url: paymentLink.url'),
    'Must still return the payment link URL even when email fails'
  )
})

// ── 5. Express backend route ──────────────────────────────────────────────────

test('Express payment-link route requires both agentId and planTier', () => {
  const src = readFromPR('routes/admin/payment-link.js')
  assert.ok(src, 'routes/admin/payment-link.js must exist on PR branch')
  assert.ok(src.includes('requireApiKey'), 'Must use API key auth middleware')
  assert.ok(src.includes('VALID_TIERS.includes(planTier)'), 'Must validate planTier')
  assert.ok(src.includes('agentId is required'), 'Must reject missing agentId')
})

test('Express route uses parameterized SQL (no injection)', () => {
  const src = readFromPR('routes/admin/payment-link.js')
  assert.ok(src)
  assert.ok(src.includes('$1'), 'Must use parameterized queries')
  const sqlLines = src.split('\n').filter(l => l.includes('SELECT') || l.includes('INSERT') || l.includes('UPDATE'))
  for (const line of sqlLines) {
    assert.ok(!line.includes('${'), `SQL must not use template interpolation: ${line.trim().slice(0, 60)}`)
  }
})

// ── 6. Tier config consistency ────────────────────────────────────────────────

test('TIER_CONFIG amounts match between Express and Next.js routes', () => {
  const express = readFromPR('routes/admin/payment-link.js')
  const nextjs = readFromPR('product/lead-response/dashboard/app/api/admin/sales-cockpit/payment-link/route.ts')
  assert.ok(express && nextjs, 'Both routes must exist on PR branch')

  const amounts = { starter: 4900, pro: 14900, team: 39900 }
  for (const [tier, amount] of Object.entries(amounts)) {
    assert.ok(express.includes(String(amount)), `Express route must have ${tier}=${amount}`)
    assert.ok(nextjs.includes(String(amount)), `Next.js route must have ${tier}=${amount}`)
  }
})

test('server.js registers payment-link router', () => {
  const src = readFromPR('server.js')
  assert.ok(src, 'server.js must exist on PR branch')
  assert.ok(src.includes('payment-link'), 'server.js must require the payment-link router')
})

// ── 7. Activation page and completed-agents endpoint ──────────────────────────

test('Activation page has 3 tabs: not_started, in_progress, ready_to_pay', () => {
  const src = readFromPR('product/lead-response/dashboard/app/admin/activation/page.tsx')
  assert.ok(src, 'Activation page.tsx must exist on PR branch')
  assert.ok(src.includes('not_started'), 'Must have not_started tab')
  assert.ok(src.includes('in_progress'), 'Must have in_progress tab')
  assert.ok(src.includes('ready_to_pay'), 'Must have ready_to_pay tab')
})

test('Completed agents route filters correctly', () => {
  const src = readFromPR('product/lead-response/dashboard/app/api/admin/activation/completed/route.ts')
  assert.ok(src, 'Activation completed route.ts must exist on PR branch')
  assert.ok(src.includes('email_verified'), 'Must filter email_verified')
  assert.ok(src.includes('onboarding_completed'), 'Must filter onboarding_completed')
  assert.ok(src.includes('subscription_status'), 'Must filter subscription_status')
})

// ── 8. Security: no hardcoded secrets ─────────────────────────────────────────

test('No hardcoded API keys or secrets in new files', () => {
  const files = [
    'routes/admin/payment-link.js',
    'product/lead-response/dashboard/app/api/admin/activation/route.ts',
    'product/lead-response/dashboard/app/api/admin/activation/completed/route.ts',
    'product/lead-response/dashboard/app/api/admin/sales-cockpit/send-payment-link-email/route.ts',
    'product/lead-response/dashboard/app/admin/activation/page.tsx',
  ]
  const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /sk_test_[a-zA-Z0-9]+/, /rk_live_/, /whsec_/]
  for (const f of files) {
    const src = readFromPR(f)
    if (!src) continue
    for (const pat of secretPatterns) {
      assert.ok(!pat.test(src), `${f} must not contain hardcoded secret matching ${pat}`)
    }
  }
})

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
