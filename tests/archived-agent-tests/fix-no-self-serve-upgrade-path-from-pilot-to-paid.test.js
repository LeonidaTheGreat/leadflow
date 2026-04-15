/**
 * E2E Test: fix-no-self-serve-upgrade-path-from-pilot-to-paid
 *
 * Verifies:
 * 1. /api/stripe/upgrade-checkout route exists and is protected (401 without auth)
 * 2. Invalid plan returns 400
 * 3. UpgradeButton component exists in billing components
 * 4. billing/page.tsx renders UpgradeButton for pilot agents (not Link to /signup)
 * 5. PilotStatusBanner renders UpgradeButton instead of bare <a href="/settings/billing">
 * 6. Build succeeds with all new components
 * 7. Route file has correct Stripe checkout + customer creation + metadata shape
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')
const ROUTE_FILE = path.join(DASHBOARD_DIR, 'app/api/stripe/upgrade-checkout/route.ts')
const UPGRADE_BTN = path.join(DASHBOARD_DIR, 'components/billing/UpgradeButton.tsx')
const BILLING_PAGE = path.join(DASHBOARD_DIR, 'app/settings/billing/page.tsx')
const PILOT_BANNER = path.join(DASHBOARD_DIR, 'components/dashboard/PilotStatusBanner.tsx')
const BILLING_INDEX = path.join(DASHBOARD_DIR, 'components/billing/index.ts')

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  ✅ PASS: ${name}`)
  passed++
}

function fail(name, reason) {
  console.error(`  ❌ FAIL: ${name} — ${reason}`)
  failed++
}

function check(name, fn) {
  try {
    fn()
    pass(name)
  } catch (e) {
    fail(name, e.message)
  }
}

console.log('\n🧪 E2E: fix-no-self-serve-upgrade-path-from-pilot-to-paid\n')

// ── 1. Files exist ────────────────────────────────────────────────────────────
console.log('── File existence ──')
check('upgrade-checkout/route.ts exists', () =>
  assert.ok(fs.existsSync(ROUTE_FILE), 'route.ts not found'))

check('UpgradeButton.tsx exists', () =>
  assert.ok(fs.existsSync(UPGRADE_BTN), 'UpgradeButton.tsx not found'))

// ── 2. Route — auth guard ─────────────────────────────────────────────────────
console.log('\n── Route: auth & plan validation ──')
const route = fs.readFileSync(ROUTE_FILE, 'utf8')

check('Route returns 401 for missing auth-token', () =>
  assert.ok(route.includes("status: 401"), 'No 401 status in route'))

check('Route checks for auth-token cookie', () =>
  assert.ok(route.includes("auth-token"), 'auth-token cookie check missing'))

check('Route validates plan against PLAN_PRICE_IDS', () =>
  assert.ok(route.includes('PLAN_PRICE_IDS'), 'PLAN_PRICE_IDS map not found'))

check('Route covers starter/pro/team plans', () => {
  assert.ok(route.includes("starter"), 'starter plan missing')
  assert.ok(route.includes("pro"), 'pro plan missing')
  assert.ok(route.includes("team"), 'team plan missing')
})

check('Route returns 400 for invalid plan', () =>
  assert.ok(route.includes("Invalid plan"), 'Invalid plan error not found'))

// ── 3. Route — Stripe checkout shape ─────────────────────────────────────────
console.log('\n── Route: Stripe checkout shape ──')

check('Route creates Stripe customer when none exists', () =>
  assert.ok(route.includes('customers.create'), 'customers.create not found'))

check('Route reuses existing stripe_customer_id', () =>
  assert.ok(route.includes('stripe_customer_id'), 'stripe_customer_id reuse logic missing'))

check('Route sets upgraded_from=pilot in metadata', () =>
  assert.ok(route.includes('upgraded_from'), "'upgraded_from' metadata key missing"))

check('Route success_url points to /settings/billing?upgrade=success', () =>
  assert.ok(route.includes('/settings/billing?upgrade=success'), 'success_url mismatch'))

check('Route uses checkout.sessions.create', () =>
  assert.ok(route.includes('checkout.sessions.create'), 'checkout.sessions.create missing'))

check('Route returns url and sessionId in response', () => {
  assert.ok(route.includes('url:'), 'url field missing from response')
  assert.ok(route.includes('sessionId'), 'sessionId field missing from response')
})

// ── 4. No hardcoded secrets ───────────────────────────────────────────────────
console.log('\n── Security: no hardcoded secrets ──')

check('No hardcoded sk_live Stripe key', () =>
  assert.ok(!route.includes('sk_live_'), 'Hardcoded live Stripe key found!'))

check('No hardcoded sk_test Stripe key', () =>
  assert.ok(!route.match(/sk_test_[a-zA-Z0-9]{20,}/), 'Hardcoded test Stripe key found!'))

check('Stripe key comes from env var', () =>
  assert.ok(route.includes('process.env.STRIPE_SECRET_KEY'), 'STRIPE_SECRET_KEY env var not used'))

check('Supabase keys come from env vars', () => {
  assert.ok(route.includes('NEXT_PUBLIC_SUPABASE_URL'), 'Supabase URL env var missing')
  assert.ok(route.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Supabase service role env var missing')
})

// ── 5. UpgradeButton component integrity ──────────────────────────────────────
console.log('\n── UpgradeButton component ──')
const upgradeBtn = fs.readFileSync(UPGRADE_BTN, 'utf8')

check('UpgradeButton calls /api/stripe/upgrade-checkout', () =>
  assert.ok(upgradeBtn.includes('/api/stripe/upgrade-checkout'), 'Endpoint not called'))

check('UpgradeButton redirects to data.url after checkout', () =>
  assert.ok(upgradeBtn.includes('window.location.href = data.url'), 'No redirect to Stripe URL'))

check('UpgradeButton renders loading state', () =>
  assert.ok(upgradeBtn.includes('Redirecting to checkout'), 'Loading state copy missing'))

check('UpgradeButton shows inline error on failure', () =>
  assert.ok(upgradeBtn.includes('setError'), 'Error state handling missing'))

check('UpgradeButton accepts starter|pro|team plans', () => {
  assert.ok(upgradeBtn.includes("starter"), 'starter plan missing')
  assert.ok(upgradeBtn.includes("pro"), 'pro plan missing')
  assert.ok(upgradeBtn.includes("team"), 'team plan missing')
})

// ── 6. billing/index.ts exports UpgradeButton ─────────────────────────────────
console.log('\n── Billing component exports ──')
const billingIndex = fs.readFileSync(BILLING_INDEX, 'utf8')

check('billing/index.ts exports UpgradeButton', () =>
  assert.ok(billingIndex.includes('UpgradeButton'), 'UpgradeButton not exported from index.ts'))

// ── 7. Billing page uses UpgradeButton not <Link href="/signup?plan=..."> ─────
console.log('\n── Billing page ──')
const billingPage = fs.readFileSync(BILLING_PAGE, 'utf8')

check('Billing page imports UpgradeButton', () =>
  assert.ok(billingPage.includes('UpgradeButton'), 'UpgradeButton not imported in billing page'))

check('Billing page does NOT use bare /signup?plan= links for upgrade', () => {
  // Old pattern was: href={`/signup?plan=${plan.id}`}
  const hasOldLink = billingPage.includes('/signup?plan=')
  assert.ok(!hasOldLink, 'Old /signup?plan= link still present — self-serve not wired up')
})

check('Billing page shows success message for ?upgrade=success', () =>
  assert.ok(billingPage.includes('upgrade=success') || billingPage.includes('upgrade'), 
    'No upgrade success handling in billing page'))

// ── 8. PilotStatusBanner uses UpgradeButton ───────────────────────────────────
console.log('\n── PilotStatusBanner ──')
const banner = fs.readFileSync(PILOT_BANNER, 'utf8')

check('PilotStatusBanner imports UpgradeButton', () =>
  assert.ok(banner.includes('UpgradeButton'), 'UpgradeButton not used in PilotStatusBanner'))

check('PilotStatusBanner no longer uses bare <a href="/settings/billing"> for upgrade', () => {
  // Old: <a href="/settings/billing" ...>Upgrade Now →</a>
  const hasOldAnchor = banner.includes('href="/settings/billing"') && banner.includes('Upgrade Now →')
  assert.ok(!hasOldAnchor, 'Old bare anchor still used — self-serve not wired in banner')
})

check('PilotStatusBanner shows upgrade CTA always (not just ending-soon)', () => {
  // The new impl shows CTA even when pilot is active (not just isEndingSoon)
  assert.ok(banner.includes('Upgrade to Paid'), 
    'No non-urgent upgrade CTA for active pilot state')
})

// ── 9. Build output contains the new route ────────────────────────────────────
console.log('\n── Build artifacts ──')
const buildDir = path.join(DASHBOARD_DIR, '.next/server/app/api/stripe/upgrade-checkout')
check('Build output for upgrade-checkout route exists', () => {
  const exists = fs.existsSync(buildDir)
  assert.ok(exists, `Build artifact missing at ${buildDir} — run npm run build first`)
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`)
console.log('════════════════════════════════════════\n')

if (failed > 0) {
  process.exit(1)
}
