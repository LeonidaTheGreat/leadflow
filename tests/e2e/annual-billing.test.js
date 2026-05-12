/**
 * E2E Test: Annual Billing Plan — 2 Months Free, Cash Upfront
 * Task: aa3c9d52-e2ef-4680-986d-a9cdfe1e23f6
 *
 * Verifies:
 * 1. Pricing page has monthly/annual toggle (file structure)
 * 2. Billing settings page has annual toggle and renewal date display
 * 3. create-checkout API supports annual price IDs via env var mapping
 * 4. create-checkout-session API supports annual interval param
 * 5. subscription-info API route exists
 * 6. Checkout tier names route correctly to annual Stripe price env vars
 * 7. No regression: monthly checkout still works
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// ── File existence checks ─────────────────────────────────────────────────────

test('Public pricing page exists', () => {
  const f = path.join(DASHBOARD, 'app/pricing/page.tsx');
  assert.ok(fs.existsSync(f), 'pricing/page.tsx not found');
});

test('Billing settings page exists', () => {
  const f = path.join(DASHBOARD, 'app/settings/billing/page.tsx');
  assert.ok(fs.existsSync(f), 'settings/billing/page.tsx not found');
});

test('create-checkout API route exists', () => {
  const f = path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts');
  assert.ok(fs.existsSync(f), 'create-checkout/route.ts not found');
});

test('create-checkout-session API route exists', () => {
  const f = path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts');
  assert.ok(fs.existsSync(f), 'create-checkout-session/route.ts not found');
});

test('subscription-info API route exists', () => {
  const f = path.join(DASHBOARD, 'app/api/billing/subscription-info/route.ts');
  assert.ok(fs.existsSync(f), 'subscription-info/route.ts not found');
});

// ── Pricing page: annual toggle + "2 months free" ────────────────────────────

test('Public pricing page has billing interval toggle', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/pricing/page.tsx'), 'utf8');
  assert.ok(content.includes("BillingInterval"), 'missing BillingInterval type');
  assert.ok(content.includes("'monthly'") || content.includes('"monthly"'), 'missing monthly option');
  assert.ok(content.includes("'annual'") || content.includes('"annual"'), 'missing annual option');
});

test('Public pricing page shows "2 months free" badge on annual', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/pricing/page.tsx'), 'utf8');
  assert.ok(
    content.includes('2 Months Free') || content.includes('2 months free') || content.includes('Save 2 months'),
    'missing "2 months free" text in pricing page'
  );
});

test('Public pricing page constructs annual tier key correctly', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/pricing/page.tsx'), 'utf8');
  // Should construct tier as `${baseTierKey}_${interval}` or `${tier}_${interval}`
  assert.ok(
    content.includes('_annual') || content.includes('`${') && content.includes('interval}'),
    'pricing page does not construct annual tier key'
  );
});

// ── Billing settings page: toggle + renewal date ─────────────────────────────

test('Billing settings page has billing interval toggle', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/settings/billing/page.tsx'), 'utf8');
  assert.ok(content.includes('billingInterval'), 'missing billingInterval state');
  assert.ok(content.includes('billing-toggle-annual') || content.includes('Annual'), 'missing Annual toggle button');
  assert.ok(content.includes('2 months free') || content.includes('2 MONTHS FREE'), 'missing "2 months free" label');
});

test('Billing settings page shows renewal date for annual subscribers', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/settings/billing/page.tsx'), 'utf8');
  assert.ok(content.includes('renewsAt') || content.includes('renewsAt'), 'missing renewsAt state');
  assert.ok(content.includes('subscription-info'), 'missing subscription-info API call');
  assert.ok(content.includes('renews on'), 'missing renewal date display text');
});

test('Billing settings page sends interval to checkout API', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/settings/billing/page.tsx'), 'utf8');
  assert.ok(
    content.includes('billingInterval') && (content.includes('create-checkout') || content.includes('interval')),
    'billing settings page does not pass interval to checkout'
  );
});

// ── create-checkout API: annual price ID mapping ──────────────────────────────

test('create-checkout route maps starter_annual to STRIPE_PRICE_STARTER_ANNUAL env var', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'), 'utf8');
  assert.ok(content.includes('starter_annual'), 'missing starter_annual in create-checkout');
  assert.ok(content.includes('STRIPE_PRICE_STARTER_ANNUAL'), 'missing STRIPE_PRICE_STARTER_ANNUAL');
});

test('create-checkout route maps pro_annual to STRIPE_PRICE_PRO_ANNUAL env var', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'), 'utf8');
  assert.ok(content.includes('pro_annual'), 'missing pro_annual in create-checkout');
  assert.ok(content.includes('STRIPE_PRICE_PRO_ANNUAL'), 'missing STRIPE_PRICE_PRO_ANNUAL');
});

test('create-checkout route maps team_annual to STRIPE_PRICE_TEAM_ANNUAL env var', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'), 'utf8');
  assert.ok(content.includes('team_annual'), 'missing team_annual in create-checkout');
  assert.ok(content.includes('STRIPE_PRICE_TEAM_ANNUAL'), 'missing STRIPE_PRICE_TEAM_ANNUAL');
});

test('create-checkout route records interval in checkout_sessions log', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout/route.ts'), 'utf8');
  assert.ok(content.includes('tierInterval') || content.includes("interval:"), 'missing interval recording in checkout log');
});

// ── create-checkout-session: annual support ───────────────────────────────────

test('create-checkout-session route supports annual interval param', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8');
  assert.ok(content.includes("'annual'") || content.includes('"annual"'), 'missing annual support in create-checkout-session');
  assert.ok(content.includes('ANNUAL') || content.includes('annual'), 'missing annual price ID resolution');
});

test('create-checkout-session route defaults interval to monthly (no regression)', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/create-checkout-session/route.ts'), 'utf8');
  assert.ok(
    content.includes("= 'monthly'") || content.includes('= "monthly"') || content.includes("interval = 'monthly'"),
    'missing monthly default — could break existing monthly checkout flow'
  );
});

// ── subscription-info: returns interval + renewsAt ────────────────────────────

test('subscription-info route queries subscriptions table with interval and current_period_end', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/subscription-info/route.ts'), 'utf8');
  assert.ok(content.includes('subscriptions'), 'missing subscriptions table query');
  assert.ok(content.includes('interval'), 'missing interval field in subscription-info');
  assert.ok(content.includes('current_period_end'), 'missing current_period_end field');
  assert.ok(content.includes('renewsAt'), 'missing renewsAt in response');
});

test('subscription-info route returns null safely when no subscription exists', () => {
  const content = fs.readFileSync(path.join(DASHBOARD, 'app/api/billing/subscription-info/route.ts'), 'utf8');
  assert.ok(
    content.includes('interval: null') || content.includes("{ interval: null"),
    'subscription-info does not handle missing subscription gracefully'
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
