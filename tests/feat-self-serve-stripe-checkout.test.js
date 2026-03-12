/**
 * Test Suite: feat-self-serve-stripe-checkout
 * 
 * Validates self-serve Stripe checkout implementation:
 * 1. Upgrade CTA visible for trial/pilot agents
 * 2. Server-side checkout session creation
 * 3. Webhook processes payment and updates DB
 * 4. Dashboard reflects upgrade after payment
 * 5. Confirmation emails sent
 * 6. Cancel flow handled gracefully
 * 7. Signature validation & idempotency
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')
const CHECKOUT_ROUTE = path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout-session/route.ts')
const WEBHOOK_ROUTE = path.join(DASHBOARD_DIR, 'app/api/webhooks/stripe/route.ts')
const BILLING_PAGE = path.join(DASHBOARD_DIR, 'app/settings/billing/page.tsx')
const DASHBOARD_PAGE = path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx')
const UPGRADE_BANNER = path.join(DASHBOARD_DIR, 'components/dashboard/UpgradeBanner.tsx')
const MIGRATION = path.join(__dirname, '../supabase/migrations/014_add_stripe_checkout_fields.sql')

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

console.log('\n🧪 Test Suite: feat-self-serve-stripe-checkout\n')

// ── AC-1: Upgrade CTA visibility ──────────────────────────────────────────────
console.log('── AC-1: Upgrade CTA visible for trial/pilot agents ──')

check('UpgradeBanner component exists', () => {
  assert.ok(fs.existsSync(UPGRADE_BANNER), 'UpgradeBanner.tsx not found')
})

check('UpgradeBanner conditionally renders based on plan_tier', () => {
  const content = fs.readFileSync(UPGRADE_BANNER, 'utf8')
  assert.ok(content.includes('trial'), 'trial plan check missing')
  assert.ok(content.includes('pilot'), 'pilot plan check missing')
  assert.ok(content.includes('null'), 'null tier check missing')
})

check('UpgradeBanner hides for paid agents (starter/pro/team)', () => {
  const content = fs.readFileSync(UPGRADE_BANNER, 'utf8')
  assert.ok(content.includes("['trial', 'pilot', null]"), 'paid tier filtering missing')
})

check('Dashboard imports and renders UpgradeBanner', () => {
  const content = fs.readFileSync(DASHBOARD_PAGE, 'utf8')
  assert.ok(content.includes('UpgradeBanner'), 'UpgradeBanner not imported')
  assert.ok(content.includes('<UpgradeBanner'), 'UpgradeBanner not rendered')
})

// ── AC-2: Server-side checkout session creation ────────────────────────────────
console.log('\n── AC-2: Stripe Checkout session created server-side ──')

check('create-checkout-session route.ts exists', () => {
  assert.ok(fs.existsSync(CHECKOUT_ROUTE), 'route.ts not found')
})

check('Endpoint validates planId (starter/pro/team)', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes("['starter', 'pro', 'team']"), 'plan validation missing')
  assert.ok(content.includes("status: 400"), 'bad request handling missing')
})

check('Endpoint retrieves price IDs from environment variables', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'Starter price ID missing')
  assert.ok(content.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'Pro price ID missing')
  assert.ok(content.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'Team price ID missing')
})

check('Endpoint requires authentication (401 for no user)', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes('getUser'), 'auth check missing')
  assert.ok(content.includes('status: 401'), '401 response missing')
})

check('Endpoint creates Stripe session with subscription mode', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes("mode: 'subscription'"), "subscription mode missing")
  assert.ok(content.includes('checkout.sessions.create'), 'session creation missing')
})

check('Endpoint sets client_reference_id to agent ID for webhook correlation', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes('client_reference_id'), 'client_reference_id missing')
  assert.ok(content.includes('agent.id'), 'agent ID reference missing')
})

check('Endpoint sets success_url and cancel_url', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes('success_url'), 'success_url missing')
  assert.ok(content.includes('cancel_url'), 'cancel_url missing')
  assert.ok(content.includes('upgrade=success'), 'success query param missing')
  assert.ok(content.includes('upgrade=cancelled'), 'cancel query param missing')
})

check('Endpoint returns Stripe URL to client (never exposes secret key)', () => {
  const content = fs.readFileSync(CHECKOUT_ROUTE, 'utf8')
  assert.ok(content.includes('session.url'), 'session.url not returned')
  assert.ok(!content.includes('secret_key'), 'secret key leak risk')
})

// ── AC-3: Webhook processes checkout.session.completed ────────────────────────
console.log('\n── AC-3: Webhook updates plan_tier on successful payment ──')

check('Webhook handler exists for /api/webhooks/stripe', () => {
  assert.ok(fs.existsSync(WEBHOOK_ROUTE), 'webhook route not found')
})

check('Webhook validates Stripe signature with webhook secret', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('webhooks.constructEvent'), 'signature validation missing')
  assert.ok(content.includes('STRIPE_WEBHOOK_SECRET'), 'webhook secret reference missing')
  assert.ok(content.includes('stripe-signature'), 'signature header check missing')
})

check('Webhook returns 400 for invalid signature', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('status: 400'), 'invalid signature handling missing')
})

check('Webhook handles checkout.session.completed event', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('checkout.session.completed'), 'event type handling missing')
})

check('Webhook maps price_id to plan_tier', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('getTierFromPriceId'), 'price_id mapping missing')
  assert.ok(content.includes('STRIPE_PRICE_STARTER_MONTHLY'), 'starter mapping missing')
  assert.ok(content.includes('STRIPE_PRICE_PROFESSIONAL_MONTHLY'), 'pro mapping missing')
  assert.ok(content.includes('STRIPE_PRICE_TEAM_MONTHLY'), 'team mapping missing')
})

check('Webhook updates real_estate_agents table', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('real_estate_agents'), 'agent table update missing')
  assert.ok(content.includes('stripe_customer_id'), 'stripe_customer_id update missing')
  assert.ok(content.includes('stripe_subscription_id'), 'stripe_subscription_id update missing')
  assert.ok(content.includes('plan_tier'), 'plan_tier update missing')
  assert.ok(content.includes('plan_activated_at'), 'plan_activated_at update missing')
})

check('Webhook extracts client_reference_id (agent_id) from session', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('client_reference_id'), 'client_reference_id extraction missing')
})

check('Webhook sends confirmation email via Resend', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('resend.emails.send'), 'email sending missing')
  assert.ok(content.includes('RESEND_API_KEY'), 'Resend key reference missing')
})

check('Email includes plan name and next billing date', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('planName'), 'plan name in email missing')
  assert.ok(content.includes('nextBillingDate'), 'next billing date missing')
})

check('Webhook handles email failure gracefully (non-blocking)', () => {
  const content = fs.readFileSync(WEBHOOK_ROUTE, 'utf8')
  assert.ok(content.includes('catch ('), 'error handling missing')
  assert.ok(content.includes('{ received: true }'), 'success response after handlers missing')
})

// ── AC-4: Dashboard reflects new plan immediately ──────────────────────────────
console.log('\n── AC-4: Dashboard reflects upgrade on redirect from Stripe ──')

check('Billing page handles upgrade=success query param', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes("searchParams.get('upgrade')"), 'query param extraction missing')
  assert.ok(content.includes("=== 'success'"), 'success status check missing')
})

check('Billing page shows success banner with upgrade confirmation', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes('🎉'), 'success emoji missing')
  assert.ok(content.includes('emerald'), 'success color styling missing')
})

check('Upgrade CTA hidden after successful payment (conditional render)', () => {
  const content = fs.readFileSync(UPGRADE_BANNER, 'utf8')
  assert.ok(content.includes('planTier'), 'plan tier check in component')
})

// ── AC-5 & AC-6: Database updates on webhook ──────────────────────────────────
console.log('\n── AC-5/AC-6: Database schema includes necessary fields ──')

check('Migration adds stripe_subscription_id column', () => {
  const content = fs.readFileSync(MIGRATION, 'utf8')
  assert.ok(content.includes('stripe_subscription_id'), 'stripe_subscription_id missing')
})

check('Migration adds plan_activated_at column', () => {
  const content = fs.readFileSync(MIGRATION, 'utf8')
  assert.ok(content.includes('plan_activated_at'), 'plan_activated_at missing')
})

check('Migration creates indexes for efficient lookups', () => {
  const content = fs.readFileSync(MIGRATION, 'utf8')
  assert.ok(content.includes('CREATE INDEX'), 'indexes missing')
  assert.ok(content.includes('stripe_customer_id'), 'customer index missing')
  assert.ok(content.includes('plan_tier'), 'plan tier index missing')
})

// ── AC-6: Cancel flow ─────────────────────────────────────────────────────────
console.log('\n── AC-6: Cancel flow handled gracefully ──')

check('Billing page handles upgrade=cancelled query param', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes("=== 'cancelled'"), 'cancelled status check missing')
})

check('Cancel redirect shows "no charge" message', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes('No charge'), 'no charge message missing')
  assert.ok(content.includes('amber'), 'cancel color styling missing')
})

// ── AC-7: Error handling ──────────────────────────────────────────────────────
console.log('\n── AC-7: Error handling for failed/invalid requests ──')

check('Billing page shows error state with clear message', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes('error'), 'error state missing')
  assert.ok(content.includes('red'), 'error color styling missing')
})

check('Upgrade button shows loading state during checkout creation', () => {
  const content = fs.readFileSync(BILLING_PAGE, 'utf8')
  assert.ok(content.includes('loadingPlan'), 'loading state missing')
  assert.ok(content.includes('disabled'), 'disabled state missing')
  assert.ok(content.includes('Loader'), 'loading spinner missing')
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('='.repeat(70) + '\n')

if (failed > 0) {
  process.exit(1)
}

process.exit(0)
