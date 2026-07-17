const assert = require('assert')
const path = require('path')
const fs = require('fs')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')

let passed = 0
let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${label} — ${err.message}`)
    failed++
  }
}

// --- revenue-config-health endpoint ---

check('revenue-config-health route exists', () => {
  const routePath = path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts')
  assert.ok(fs.existsSync(routePath), 'revenue-config-health route.ts missing')
})

check('revenue-config-health checks STRIPE_SECRET_KEY format', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(src.includes('sk_(live|test)_'), 'Must validate sk_live_ or sk_test_ format')
})

check('revenue-config-health checks all 6 STRIPE_PRICE_* vars', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  const vars = [
    'STRIPE_PRICE_STARTER_MONTHLY', 'STRIPE_PRICE_STARTER_ANNUAL',
    'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL',
    'STRIPE_PRICE_TEAM_MONTHLY', 'STRIPE_PRICE_TEAM_ANNUAL',
  ]
  for (const v of vars) {
    assert.ok(src.includes(v), `Missing check for ${v}`)
  }
})

check('revenue-config-health checks RESEND_API_KEY', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(src.includes('RESEND_API_KEY'), 'Must check RESEND_API_KEY')
})

check('revenue-config-health checks email FROM domain', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(
    src.includes('EMAIL_FROM_DOMAIN') || src.includes('RESEND_FROM_DOMAIN'),
    'Must check email FROM domain env var'
  )
})

check('revenue-config-health returns ok/degraded/broken overall', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(src.includes("'ok'"), 'Must return ok status')
  assert.ok(src.includes("'degraded'"), 'Must return degraded status')
  assert.ok(src.includes("'broken'"), 'Must return broken status')
})

check('revenue-config-health supports LEADFLOW_API_KEY auth', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(src.includes('LEADFLOW_API_KEY'), 'Must support LEADFLOW_API_KEY auth')
  assert.ok(src.includes('Bearer'), 'Must support Bearer token auth')
})

check('revenue-config-health returns 401 without auth', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(src.includes('401'), 'Must return 401 for unauthorized requests')
})

check('revenue-config-health uses isValidPriceId with proper regex', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/admin/revenue-config-health/route.ts'), 'utf8'
  )
  assert.ok(
    src.includes('price_[A-Za-z0-9]{14,30}'),
    'isValidPriceId must reject placeholders like price_starter_49'
  )
})

// --- create-checkout-session route hardening ---

check('create-checkout-session uses isValidPriceId (not startsWith check)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8'
  )
  assert.ok(src.includes('isValidPriceId'), 'Must use isValidPriceId function')
  assert.ok(
    !src.includes("startsWith('price_replace')"),
    'Must not use weak startsWith check — use regex validation'
  )
})

check('create-checkout-session returns 503 with PRICE_NOT_CONFIGURED code', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8'
  )
  assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'Must return PRICE_NOT_CONFIGURED error code')
  assert.ok(src.includes('503'), 'Must return 503 status')
})

check('create-checkout-session uses consistent env var names', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8'
  )
  assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Must use STRIPE_PRICE_STARTER_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Must use STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Must use STRIPE_PRICE_TEAM_MONTHLY')
  assert.ok(
    !src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Must NOT use STRIPE_PRICE_PROFESSIONAL_MONTHLY (wrong naming convention)'
  )
})

// --- upgrade-checkout route hardening ---

check('upgrade-checkout uses isValidPriceId', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8'
  )
  assert.ok(src.includes('isValidPriceId'), 'Must use isValidPriceId function')
})

check('upgrade-checkout returns 503 with PRICE_NOT_CONFIGURED', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8'
  )
  assert.ok(src.includes('PRICE_NOT_CONFIGURED'), 'Must return PRICE_NOT_CONFIGURED error code')
  assert.ok(src.includes('503'), 'Must return 503 status')
})

check('upgrade-checkout uses consistent env var names', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf8'
  )
  assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Must use STRIPE_PRICE_STARTER_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Must use STRIPE_PRICE_PRO_MONTHLY')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Must use STRIPE_PRICE_TEAM_MONTHLY')
  assert.ok(
    !src.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'),
    'Must NOT use STRIPE_PRICE_PROFESSIONAL_MONTHLY'
  )
  assert.ok(
    !src.includes('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
    'Must NOT use STRIPE_PRICE_ENTERPRISE_MONTHLY'
  )
})

// --- create-checkout route (already hardened, verify it stays correct) ---

check('create-checkout uses isValidPriceId', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'), 'utf8'
  )
  assert.ok(src.includes('isValidPriceId'), 'Must use isValidPriceId function')
  assert.ok(src.includes('price_[A-Za-z0-9]{14,30}'), 'Must have proper regex')
})

// --- All 3 checkout routes use same env var naming convention ---

check('all checkout routes use PRO (not PROFESSIONAL) naming', () => {
  const routes = [
    'app/api/billing/create-checkout/route.ts',
    'app/api/billing/create-checkout-session/route.ts',
    'app/api/stripe/upgrade-checkout/route.ts',
  ]
  for (const route of routes) {
    const src = fs.readFileSync(path.join(DASHBOARD, route), 'utf8')
    assert.ok(
      !src.includes('PROFESSIONAL'),
      `${route} must use PRO, not PROFESSIONAL`
    )
    assert.ok(
      !src.includes('ENTERPRISE'),
      `${route} must use TEAM, not ENTERPRISE`
    )
  }
})

// --- Admin page shows revenue config health ---

check('admin page fetches revenue-config-health', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/admin/page.tsx'), 'utf8')
  assert.ok(src.includes('revenue-config-health'), 'Must fetch revenue-config-health endpoint')
})

check('admin page shows revenue config banner when degraded/broken', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/admin/page.tsx'), 'utf8')
  assert.ok(src.includes('RevenueConfigBanner'), 'Must have RevenueConfigBanner component')
  assert.ok(src.includes('revenue-config-banner'), 'Must have data-testid for banner')
})

check('admin page shows Stripe Checkout status in blockers section', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/admin/page.tsx'), 'utf8')
  assert.ok(src.includes('Stripe Checkout'), 'Must show Stripe Checkout in blockers')
})

// --- STRIPE-SETUP.md guide ---

check('STRIPE-SETUP.md exists with all 3 tiers documented', () => {
  const guidePath = path.join(__dirname, '../../docs/guides/STRIPE-SETUP.md')
  assert.ok(fs.existsSync(guidePath), 'STRIPE-SETUP.md missing')
  const src = fs.readFileSync(guidePath, 'utf8')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Must list Starter env var')
  assert.ok(src.includes('STRIPE_PRICE_PRO_MONTHLY'), 'Must list Pro env var')
  assert.ok(src.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Must list Team env var')
  assert.ok(src.includes('STRIPE_PRICE_STARTER_ANNUAL'), 'Must list annual env vars')
  assert.ok(src.includes('revenue-config-health'), 'Must reference health endpoint')
})

// --- Summary ---
console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed}`)
if (failed > 0) process.exit(1)
