/**
 * Tests for trial-to-paid conversion path
 * Verifies upgrade CTAs, links, and checkout API routes exist
 */
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD_DIR = path.resolve(__dirname, '../../product/lead-response/dashboard')

function check(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    return true
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    return false
  }
}

let passed = 0
let total = 0

function run(name, fn) {
  total++
  if (check(name, fn)) passed++
}

console.log('Trial-to-Paid Conversion Path Tests\n')

// 1. Settings billing page exists with checkout integration
run('Settings billing page exists', () => {
  const billingPath = path.join(DASHBOARD_DIR, 'app/settings/billing/page.tsx')
  assert.ok(fs.existsSync(billingPath), 'settings/billing/page.tsx not found')
})

run('Settings billing page calls create-checkout-session', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/settings/billing/page.tsx'), 'utf-8')
  assert.ok(content.includes('create-checkout-session'), 'Missing create-checkout-session call')
})

run('Settings billing page has plan cards', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/settings/billing/page.tsx'), 'utf-8')
  assert.ok(content.includes('starter'), 'Missing starter plan')
  assert.ok(content.includes('pro'), 'Missing pro plan')
  assert.ok(content.includes('team'), 'Missing team plan')
})

// 2. Checkout session API route exists
run('create-checkout-session API route exists', () => {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout-session/route.ts')
  assert.ok(fs.existsSync(routePath), 'create-checkout-session/route.ts not found')
})

run('create-checkout-session uses Stripe checkout.sessions.create', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout-session/route.ts'), 'utf-8')
  assert.ok(content.includes('checkout.sessions.create'), 'Missing checkout.sessions.create call')
})

run('create-checkout-session requires auth', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout-session/route.ts'), 'utf-8')
  assert.ok(content.includes('getAuthUserId'), 'Missing auth check')
})

// 3. Stripe webhook handles checkout completion
run('Stripe webhook route exists', () => {
  const webhookPath = path.join(DASHBOARD_DIR, 'app/api/webhooks/stripe/route.ts')
  assert.ok(fs.existsSync(webhookPath), 'webhooks/stripe/route.ts not found')
})

run('Stripe webhook handles checkout.session.completed', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/webhooks/stripe/route.ts'), 'utf-8')
  assert.ok(content.includes('checkout.session.completed'), 'Missing checkout.session.completed handler')
})

run('Stripe webhook updates agent plan_tier', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/webhooks/stripe/route.ts'), 'utf-8')
  assert.ok(content.includes('plan_tier'), 'Missing plan_tier update in webhook')
})

// 4. Trial-expired page links to valid upgrade paths
run('Trial-expired page exists', () => {
  const trialPath = path.join(DASHBOARD_DIR, 'app/dashboard/trial-expired/page.tsx')
  assert.ok(fs.existsSync(trialPath), 'trial-expired/page.tsx not found')
})

run('Trial-expired page links to /settings/billing (not /dashboard/upgrade)', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/dashboard/trial-expired/page.tsx'), 'utf-8')
  assert.ok(content.includes('/settings/billing'), 'Missing link to /settings/billing')
  assert.ok(!content.includes('/dashboard/upgrade'), 'Still has broken /dashboard/upgrade link')
})

// 5. BillingCard has upgrade button for trial users
run('BillingCard has upgrade button for non-subscribers', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'components/billing/BillingCard.tsx'), 'utf-8')
  assert.ok(content.includes('Upgrade Now'), 'Missing Upgrade Now button')
  assert.ok(content.includes('/settings/billing'), 'Missing link to billing page')
})

// 6. Dashboard nav includes Settings link
run('Dashboard nav has Settings link', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/dashboard/dashboard-nav.tsx'), 'utf-8')
  assert.ok(content.includes('/settings'), 'Missing /settings link in nav')
  assert.ok(content.includes('nav-link-settings'), 'Missing data-testid for settings nav link')
})

// 7. Pricing page exists as alternative conversion path
run('Pricing page exists', () => {
  const pricingPath = path.join(DASHBOARD_DIR, 'app/pricing/page.tsx')
  assert.ok(fs.existsSync(pricingPath), 'pricing/page.tsx not found')
})

// 8. Upgrade checkout route for pilot agents exists
run('Stripe upgrade-checkout route exists', () => {
  const routePath = path.join(DASHBOARD_DIR, 'app/api/stripe/upgrade-checkout/route.ts')
  assert.ok(fs.existsSync(routePath), 'stripe/upgrade-checkout/route.ts not found')
})

run('Upgrade checkout route requires auth', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/api/stripe/upgrade-checkout/route.ts'), 'utf-8')
  assert.ok(content.includes('getAuthUserId'), 'Missing auth check in upgrade-checkout')
})

// 9. Trial badge links to billing
run('Trial badge links to /settings/billing', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'components/dashboard/trial-badge.tsx'), 'utf-8')
  assert.ok(content.includes('/settings/billing'), 'Trial badge should link to /settings/billing')
})

console.log(`\n${passed}/${total} passed`)
process.exit(passed === total ? 0 : 1)
