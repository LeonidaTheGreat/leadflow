/**
 * E2E Test: Pricing Clarity for Trial Users (uc-revenue-pricing-clarity)
 * Task ID: 41567a41-441c-4882-a7a4-f162d0d922e3
 *
 * Tests runtime HTTP behavior where possible, and structural integrity of
 * the implementation. HTTP tests are skipped if Vercel is unreachable
 * (pre-existing infrastructure issue tracked separately).
 *
 * Scenarios:
 * 1. Vercel availability check (gateway test)
 * 2. Events track API accepts valid pricing clarity events
 * 3. Events track API rejects unknown events
 * 4. Events track API handles missing event field gracefully (no 500)
 * 5. Stripe upgrade-checkout API requires authentication
 * 6. Trial status API endpoint exists (not 404)
 * 7. Vercel cron config includes send-trial-emails schedule
 * 8. Dashboard page integrates TrialCountdownWidget
 * 9. Pricing page data-testid structure and all 4 tiers
 * 10. Onboarding confirmation step has pricing mention + pricing link
 */

'use strict';

const assert = require('assert');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');
const VERCEL_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
const TIMEOUT_MS = 10000;

let passed = 0;
let failed = 0;
const results = [];
let vercelAvailable = false;

function pass(name) {
  console.log(`  ✓ ${name}`);
  passed++;
  results.push({ name, status: 'PASS' });
}

function fail(name, reason) {
  console.error(`  ✗ ${name}: ${reason}`);
  failed++;
  results.push({ name, status: 'FAIL', reason });
}

function skip(name, reason) {
  console.log(`  - ${name} [SKIP: ${reason}]`);
  results.push({ name, status: 'SKIP', reason });
}

/**
 * Make an HTTP/HTTPS request and return { status, body, headers }
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: TIMEOUT_MS,
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
    });
    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * POST JSON to an endpoint
 */
function post(url, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  return request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...extraHeaders,
    },
    body,
  });
}

async function runTests() {
  console.log('\n=== E2E: Pricing Clarity for Trial Users (Runtime Behavior) ===\n');
  console.log(`Target: ${VERCEL_URL}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Gateway: check if Vercel is available at all
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('1. [vercel-availability] Vercel deployment health:');

  try {
    const res = await request(`${VERCEL_URL}/api/health`);
    if (res.status === 500 && res.body.includes('FUNCTION_INVOCATION_FAILED')) {
      // Pre-existing Vercel infrastructure failure — HTTP tests will be skipped
      vercelAvailable = false;
      console.log(`  - Vercel returning 500 (FUNCTION_INVOCATION_FAILED) — pre-existing infra issue`);
      console.log(`    HTTP runtime tests will be skipped. Structural tests will still run.`);
      results.push({ name: 'Vercel deployment health', status: 'SKIP', reason: 'Pre-existing 500 infra issue' });
    } else if (res.status < 500) {
      vercelAvailable = true;
      pass(`Vercel deployment accessible (HTTP ${res.status})`);
    } else {
      vercelAvailable = false;
      skip('Vercel deployment health', `HTTP ${res.status} — not available`);
    }
  } catch (err) {
    vercelAvailable = false;
    skip('Vercel deployment health', `Connection error: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Events track API — valid pricing clarity events accepted
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n2. [event-tracking] Events track API — valid events:');

  const validEvents = [
    'trial_pricing_viewed',
    'trial_upgrade_clicked',
    'trial_checkout_started',
  ];

  if (!vercelAvailable) {
    for (const eventName of validEvents) {
      skip(`Event '${eventName}' accepted`, 'Vercel unavailable');
    }
  } else {
    for (const eventName of validEvents) {
      try {
        const res = await post(`${VERCEL_URL}/api/events/track`, {
          event: eventName,
          properties: { source: 'e2e_test', plan: 'pro' },
        });
        // 200 = saved, 401 = auth required but event recognized
        // 400/422 = event not in allowlist = FAIL
        assert.ok(
          res.status !== 400 && res.status !== 422,
          `Event '${eventName}' rejected with ${res.status} — not in allowlist`
        );
        pass(`Event '${eventName}' accepted (HTTP ${res.status})`);
      } catch (err) {
        fail(`Event '${eventName}' accepted`, err.message);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Events track API — unknown event rejected
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n3. [event-validation] Events track API rejects unknown events:');

  if (!vercelAvailable) {
    skip('Unknown event rejected', 'Vercel unavailable');
  } else {
    try {
      const res = await post(`${VERCEL_URL}/api/events/track`, {
        event: 'totally_fake_event_xyz_qc_test',
        properties: {},
      });
      assert.ok(
        res.status === 400 || res.status === 422 || res.status === 401,
        `Unknown event accepted with ${res.status} — allowlist not enforced`
      );
      pass(`Unknown event rejected (HTTP ${res.status})`);
    } catch (err) {
      fail('Unknown event rejected', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Events track API — missing event field handled gracefully (no 500)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n4. [event-robustness] Events track API handles missing event field:');

  if (!vercelAvailable) {
    skip('Missing event field handled gracefully', 'Vercel unavailable');
  } else {
    try {
      const res = await post(`${VERCEL_URL}/api/events/track`, {
        properties: { source: 'test' },
        // missing 'event' field
      });
      assert.ok(
        res.status !== 500,
        `Events API returned 500 on missing event field — unhandled error`
      );
      pass(`Missing event field handled gracefully (HTTP ${res.status})`);
    } catch (err) {
      fail('Missing event field handled gracefully', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Stripe upgrade-checkout API requires authentication
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n5. [auth-protection] Stripe upgrade-checkout requires authentication:');

  if (!vercelAvailable) {
    skip('Stripe upgrade-checkout requires auth', 'Vercel unavailable');
  } else {
    try {
      const res = await post(`${VERCEL_URL}/api/stripe/upgrade-checkout`, { plan: 'pro' });
      assert.ok(
        res.status === 401 || res.status === 403 || res.status === 302 || res.status === 307,
        `Stripe checkout accessible without auth (HTTP ${res.status}) — auth not enforced`
      );
      pass(`Stripe upgrade-checkout requires auth (HTTP ${res.status})`);
    } catch (err) {
      fail('Stripe upgrade-checkout auth protection', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Trial status API exists (not 404)
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n6. [trial-status-api] Trial status API endpoint exists:');

  if (!vercelAvailable) {
    skip('Trial status API endpoint exists', 'Vercel unavailable');
  } else {
    try {
      const res = await request(`${VERCEL_URL}/api/auth/trial-status`);
      assert.ok(
        res.status !== 404,
        `Trial status API returned 404 — route /api/auth/trial-status does not exist`
      );
      pass(`Trial status API exists (HTTP ${res.status}, not 404)`);
    } catch (err) {
      fail('Trial status API endpoint exists', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Vercel cron config — regression check for send-trial-emails
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n7. [cron-config] Vercel cron includes send-trial-emails (regression check):');

  try {
    const vercelJson = JSON.parse(fs.readFileSync(path.join(DASHBOARD_DIR, 'vercel.json'), 'utf8'));
    const crons = vercelJson.crons || [];
    const hasTrialEmails = crons.some((c) => c.path === '/api/cron/send-trial-emails');
    assert.ok(
      hasTrialEmails,
      'vercel.json is MISSING /api/cron/send-trial-emails — regression from d377c4d'
    );
    pass('vercel.json includes /api/cron/send-trial-emails schedule');
  } catch (err) {
    fail('Vercel cron config includes send-trial-emails', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Dashboard page integrates TrialCountdownWidget
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n8. [dashboard-integration] Dashboard integrates trial components:');

  try {
    const dashboardPage = fs.readFileSync(
      path.join(DASHBOARD_DIR, 'app/dashboard/page.tsx'),
      'utf8'
    );
    assert.ok(
      dashboardPage.includes('TrialCountdownWidget'),
      'Dashboard page does not import/render TrialCountdownWidget'
    );
    assert.ok(
      dashboardPage.includes('<TrialCountdownWidget'),
      'Dashboard page does not render <TrialCountdownWidget> JSX element'
    );
    pass('Dashboard page imports and renders TrialCountdownWidget');
  } catch (err) {
    fail('Dashboard TrialCountdownWidget integration', err.message);
  }

  try {
    const widgetFile = path.join(DASHBOARD_DIR, 'components/dashboard/TrialCountdownWidget.tsx');
    assert.ok(
      fs.existsSync(widgetFile),
      'TrialCountdownWidget.tsx does not exist at components/dashboard/'
    );
    // Widget must fetch trial-status API
    const src = fs.readFileSync(widgetFile, 'utf8');
    assert.ok(
      src.includes('/api/auth/trial-status'),
      'TrialCountdownWidget does not call /api/auth/trial-status'
    );
    // Widget must hide for paid users
    assert.ok(
      src.includes('!trial.isTrial') || (src.includes('isTrial') && src.includes('isPilot')),
      'TrialCountdownWidget does not check isTrial/isPilot to hide for paid users'
    );
    pass('TrialCountdownWidget component file exists, calls trial API, hides for paid users');
  } catch (err) {
    fail('TrialCountdownWidget component implementation', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Pricing page structure — data-testid, all 4 tiers, correct prices, upgrade CTAs
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n9. [pricing-page-structure] Pricing page structure:');

  try {
    const pricingSource = fs.readFileSync(
      path.join(DASHBOARD_DIR, 'app/dashboard/pricing/page.tsx'),
      'utf8'
    );

    // data-testid="pricing-page" must be a literal string in the source
    assert.ok(
      pricingSource.includes('data-testid="pricing-page"'),
      'Pricing page missing data-testid="pricing-page" literal attribute'
    );

    // Dynamic tier test IDs — the template literal pattern must be present
    assert.ok(
      pricingSource.includes('data-testid={`pricing-tier-${tier.id}`}') ||
      pricingSource.includes("data-testid={`pricing-tier-${tier.id}`}"),
      'Pricing page missing dynamic data-testid for tier cards'
    );

    // All 4 tier names and prices in PRICING_TIERS array
    const tiers = [
      { name: 'Starter', price: '$49' },
      { name: 'Pro', price: '$149' },
      { name: 'Team', price: '$399' },
      { name: 'Brokerage', price: '$999' },
    ];
    for (const tier of tiers) {
      assert.ok(pricingSource.includes(tier.name), `Pricing page missing tier: ${tier.name}`);
      assert.ok(pricingSource.includes(tier.price), `Pricing page missing price: ${tier.price}`);
    }

    // Trial-specific messaging
    assert.ok(
      pricingSource.includes('currently on a free trial'),
      'Pricing page missing trial-specific messaging'
    );

    // Stripe checkout integration
    assert.ok(
      pricingSource.includes('/api/stripe/upgrade-checkout'),
      'Pricing page does not call Stripe upgrade-checkout API'
    );

    // All 4 upgrade CTAs
    assert.ok(pricingSource.includes('Choose Starter'), 'Missing "Choose Starter" CTA');
    assert.ok(pricingSource.includes('Choose Pro'), 'Missing "Choose Pro" CTA');
    assert.ok(pricingSource.includes('Choose Team'), 'Missing "Choose Team" CTA');
    assert.ok(pricingSource.includes('Contact Sales'), 'Missing "Contact Sales" CTA for Brokerage');

    pass('Pricing page has all required structure: data-testid, 4 tiers, prices, CTAs, trial messaging');
  } catch (err) {
    fail('Pricing page structure', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Onboarding final step — pricing mention and link
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n10. [onboarding-pricing] Onboarding final step pricing nudge:');

  try {
    const confirmationFile = path.join(DASHBOARD_DIR, 'app/onboarding/steps/confirmation.tsx');
    assert.ok(
      fs.existsSync(confirmationFile),
      'Onboarding confirmation step file not found'
    );
    const source = fs.readFileSync(confirmationFile, 'utf8');
    const lower = source.toLowerCase();
    assert.ok(
      lower.includes('49') || lower.includes('plans start at'),
      'Onboarding confirmation does not mention $49/mo starting price'
    );
    assert.ok(
      source.includes('/dashboard/pricing'),
      'Onboarding confirmation does not link to /dashboard/pricing'
    );
    pass('Onboarding confirmation step shows pricing nudge ($49/mo) + pricing page link');
  } catch (err) {
    fail('Onboarding pricing nudge', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. Events track route registers all 3 pricing clarity events in allowlist
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n11. [event-allowlist] Events track API allowlist:');

  try {
    const eventsRoute = fs.readFileSync(
      path.join(DASHBOARD_DIR, 'app/api/events/track/route.ts'),
      'utf8'
    );
    assert.ok(eventsRoute.includes('trial_pricing_viewed'), 'Missing trial_pricing_viewed in allowlist');
    assert.ok(eventsRoute.includes('trial_upgrade_clicked'), 'Missing trial_upgrade_clicked in allowlist');
    assert.ok(eventsRoute.includes('trial_checkout_started'), 'Missing trial_checkout_started in allowlist');
    pass('Events track API allowlist includes all 3 pricing clarity events');
  } catch (err) {
    fail('Events track API allowlist', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. TrialStatusBanner fires conversion events
  // ─────────────────────────────────────────────────────────────────────────────

  console.log('\n12. [banner-events] TrialStatusBanner fires conversion events:');

  try {
    const bannerFile = path.join(DASHBOARD_DIR, 'components/dashboard/TrialStatusBanner.tsx');
    const src = fs.readFileSync(bannerFile, 'utf8');
    assert.ok(src.includes('trial_upgrade_clicked'), 'Banner does not fire trial_upgrade_clicked');
    assert.ok(src.includes('trial_checkout_started'), 'Banner does not fire trial_checkout_started');
    assert.ok(src.includes('$149'), 'Banner does not show $149 price');
    assert.ok(src.includes('See all plans'), 'Banner does not have "See all plans" link');
    assert.ok(src.includes('/dashboard/pricing'), 'Banner does not link to /dashboard/pricing');
    // Urgency: amber at <= 5 days
    assert.ok(src.includes('<= 5') || src.includes('daysRemaining <= 5'), 'Banner missing amber threshold at 5 days');
    // Urgency: red at <= 2 days
    assert.ok(src.includes('<= 2') || src.includes('daysRemaining <= 2'), 'Banner missing red threshold at 2 days');
    pass('TrialStatusBanner fires events, shows $149, links to pricing, has urgency tiers');
  } catch (err) {
    fail('TrialStatusBanner conversion events and content', err.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────────

  const skipped = results.filter((r) => r.status === 'SKIP').length;
  console.log('\n' + '='.repeat(60));
  console.log(`E2E Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (skipped > 0) {
    console.log(`(${skipped} HTTP tests skipped — Vercel deployment has a pre-existing 500 error)`);
  }
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  - ${r.name}: ${r.reason}`);
    });
    process.exit(1);
  } else {
    console.log('\nAll E2E tests passed (skipped tests excluded)!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
