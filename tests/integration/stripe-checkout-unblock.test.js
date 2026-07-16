'use strict'

/**
 * Integration tests for Stripe Checkout Unblock (e0aed5ec)
 *
 * Tests:
 * 1. revenue-config-health endpoint — returns ok/missing/broken status
 * 2. create-checkout-session route validates price ID format and returns 503 for placeholders
 * 3. create-checkout route validates price ID format and returns 503 for placeholders
 * 4. Env var names are consistent: STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dashboardDir = path.join(__dirname, '../../product/lead-response/dashboard')
let passed = 0
let failed = 0

function check(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`)
    failed++
  }
}

// --- 1. revenue-config-health route exists and has correct shape ---
console.log('\n=== revenue-config-health route ===\n')
{
  const routePath = path.join(dashboardDir, 'app/api/admin/revenue-config-health/route.ts')

  check('route file exists', () => {
    assert.ok(fs.existsSync(routePath), `Missing: ${routePath}`)
  })

  const src = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

  check('exports GET handler', () => {
    assert.ok(src.includes('export async function GET'), 'Expected export async function GET')
  })

  check('validates STRIPE_SECRET_KEY format (sk_live_ or sk_test_)', () => {
    assert.ok(
      src.includes('sk_live_') || src.includes('sk_(live|test)'),
      'Expected secret key format validation'
    )
  })

  check('validates price ID format with isValidPriceId', () => {
    assert.ok(src.includes('isValidPriceId'), 'Expected isValidPriceId function')
  })

  check('checks STRIPE_PRICE_STARTER_MONTHLY', () => {
    assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Expected STRIPE_PRICE_STARTER_MONTHLY')
  })

  check('checks STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Expected STRIPE_PRICE_PRO_MONTHLY')
    assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL'), 'Must not use STRIPE_PRICE_PROFESSIONAL_*')
  })

  check('checks STRIPE_PRICE_TEAM_MONTHLY', () => {
    assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Expected STRIPE_PRICE_TEAM_MONTHLY')
  })

  check('returns overall: ok | degraded | broken', () => {
    assert.ok(src.includes("'ok'") && src.includes("'degraded'") && src.includes("'broken'"),
      "Expected overall status values: ok, degraded, broken")
  })

  check('requires auth (LEADFLOW_API_KEY)', () => {
    assert.ok(src.includes('LEADFLOW_API_KEY'), 'Expected LEADFLOW_API_KEY auth check')
  })
}

// --- 2. create-checkout-session route uses correct env var and validates format ---
console.log('\n=== create-checkout-session route ===\n')
{
  const routePath = path.join(dashboardDir, 'app/api/billing/create-checkout-session/route.ts')
  const src = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

  check('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
    assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      'Must not reference STRIPE_PRICE_PROFESSIONAL_MONTHLY — use STRIPE_PRICE_PRO_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'),
      'Must reference STRIPE_PRICE_PRO_MONTHLY')
  })

  check('validates price ID format with isValidPriceId', () => {
    assert.ok(src.includes('isValidPriceId'), 'Expected isValidPriceId validation in checkout-session route')
  })

  check('returns 503 with code PRICE_NOT_CONFIGURED when price ID is invalid', () => {
    assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'Expected PRICE_NOT_CONFIGURED error code in 503 response')
    assert.ok(src.includes('503'), 'Expected 503 status')
  })

  check('logs missing price ID with env var name', () => {
    assert.ok(src.includes('envVar'), 'Expected envVar in error response so Stojan can identify which var to set')
  })
}

// --- 3. create-checkout route (primary signup flow) uses correct env var ---
console.log('\n=== create-checkout route (signup flow) ===\n')
{
  const routePath = path.join(dashboardDir, 'app/api/billing/create-checkout/route.ts')
  const src = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

  check('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
    assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      'Must not reference STRIPE_PRICE_PROFESSIONAL_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Expected STRIPE_PRICE_PRO_MONTHLY')
  })

  check('has isValidPriceId function', () => {
    assert.ok(src.includes('isValidPriceId'), 'Expected isValidPriceId')
  })

  check('returns 503 + PRICE_NOT_CONFIGURED for invalid price IDs', () => {
    assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'Expected PRICE_NOT_CONFIGURED error code')
  })
}

// --- 4. payment-link route uses correct env var ---
console.log('\n=== payment-link route (admin sales cockpit) ===\n')
{
  const routePath = path.join(dashboardDir, 'app/api/admin/sales-cockpit/payment-link/route.ts')
  const src = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

  check('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
    assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      'Must not reference STRIPE_PRICE_PROFESSIONAL_MONTHLY — use STRIPE_PRICE_PRO_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Expected STRIPE_PRICE_PRO_MONTHLY')
  })

  check('has isValidPriceId validation', () => {
    assert.ok(src.includes('isValidPriceId'), 'Expected isValidPriceId validation')
  })

  check('returns 503 + PRICE_NOT_CONFIGURED for invalid price IDs', () => {
    assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'Expected PRICE_NOT_CONFIGURED error code')
  })

  check('accepts tier parameter (starter/pro/team via TIER_ENV_MAP)', () => {
    assert.ok(src.includes('TIER_ENV_MAP') || src.includes("starter:") || src.includes("'starter_monthly'"),
      'Expected tier mapping (TIER_ENV_MAP) in payment-link route')
    assert.ok(src.includes('tier'), 'Expected tier parameter to be read from request body')
  })
}

// --- 5. trial/nudge route uses correct env var ---
console.log('\n=== trial/nudge route ===\n')
{
  const routePath = path.join(dashboardDir, 'app/api/trial/nudge/route.ts')
  const src = fs.existsSync(routePath) ? fs.readFileSync(routePath, 'utf8') : ''

  check('uses STRIPE_PRICE_PRO_MONTHLY (not PROFESSIONAL)', () => {
    assert.ok(!src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
      'Must not reference STRIPE_PRICE_PROFESSIONAL_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Expected STRIPE_PRICE_PRO_MONTHLY')
  })

  check('no placeholder fallback value', () => {
    assert.ok(!src.includes("'price_professional_monthly'"),
      "Must not have placeholder fallback 'price_professional_monthly'")
  })
}

// --- 6. admin activation page shows health banner ---
console.log('\n=== admin activation page ===\n')
{
  const pagePath = path.join(dashboardDir, 'app/admin/activation/page.tsx')
  const src = fs.existsSync(pagePath) ? fs.readFileSync(pagePath, 'utf8') : ''

  check('page file exists', () => {
    assert.ok(fs.existsSync(pagePath), `Missing: ${pagePath}`)
  })

  check('fetches /api/admin/revenue-config-health', () => {
    assert.ok(src.includes('/api/admin/revenue-config-health'),
      'Expected fetch of /api/admin/revenue-config-health')
  })

  check('has revenue-config-health-banner test id', () => {
    assert.ok(src.includes('revenue-config-health-banner'),
      'Expected data-testid="revenue-config-health-banner"')
  })

  check('shows broken/degraded messaging', () => {
    assert.ok(src.includes('Payments are broken') || src.includes('Payments degraded'),
      'Expected user-readable payment status messages')
  })
}

// --- 7. STRIPE-SETUP.md exists ---
console.log('\n=== STRIPE-SETUP.md ===\n')
{
  const guidePath = path.join(__dirname, '../../docs/guides/STRIPE-SETUP.md')

  check('file exists', () => {
    assert.ok(fs.existsSync(guidePath), `Missing: ${guidePath}`)
  })

  const src = fs.existsSync(guidePath) ? fs.readFileSync(guidePath, 'utf8') : ''

  check('mentions all 3 tiers', () => {
    assert.ok(src.includes('Starter') && src.includes('Pro') && src.includes('Team'),
      'Expected all 3 tier names')
  })

  check('lists exact env var names', () => {
    assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Missing STRIPE_PRICE_STARTER_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Missing STRIPE_PRICE_PRO_MONTHLY')
    assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Missing STRIPE_PRICE_TEAM_MONTHLY')
  })

  check('references revenue-config-health endpoint', () => {
    assert.ok(src.includes('revenue-config-health'), 'Expected reference to health check endpoint')
  })
}

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
