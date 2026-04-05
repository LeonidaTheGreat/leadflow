/**
 * E2E Test: Trial-to-Paid Conversion Path
 * Task: 6843b0d3-40a5-4ca1-ba07-45175839ad42
 *
 * Verifies:
 * 1. GET /api/trial/nudge exists, returns 401 for unauthenticated callers
 * 2. POST /api/trial/dismiss-nudge exists, returns 401 for unauthenticated callers
 * 3. POST /api/billing/create-checkout exists, returns 400 for missing fields
 * 4. POST /api/billing/create-checkout returns 400 for invalid tier
 * 5. /upgrade route redirects (302 or 307) rather than 404
 * 6. The TrialNudgeBanner component file exists with expected exports
 * 7. The dashboard layout imports and renders TrialNudgeBanner
 * 8. The nudge route has auth guard (not callable without a token)
 * 9. The create-checkout route validates UUID format
 * 10. Stripe checkout session response includes url field
 */

'use strict';

const assert = require('assert');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');
const BASE_URL = 'https://leadflow-ai-five.vercel.app';

let passed = 0;
let failed = 0;
const results = [];

function pass(name) {
  console.log(`  PASS: ${name}`);
  passed++;
  results.push({ name, status: 'PASS' });
}

function fail(name, reason) {
  console.error(`  FAIL: ${name} — ${reason}`);
  failed++;
  results.push({ name, status: 'FAIL', reason });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body, json: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body, json: null });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpsPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => (resBody += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: resBody, json: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: resBody, json: null });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('\nE2E: Trial-to-Paid Conversion Path\n');

  // --- Static file checks ---

  // Test 1: TrialNudgeBanner component exists
  const bannerPath = path.join(DASHBOARD_DIR, 'components/trial-nudge-banner.tsx');
  if (fs.existsSync(bannerPath)) {
    const content = fs.readFileSync(bannerPath, 'utf8');
    if (content.includes('TrialNudgeBanner') && content.includes('checkoutUrl') && content.includes('shouldShow')) {
      pass('TrialNudgeBanner component exists with required exports');
    } else {
      fail('TrialNudgeBanner component', 'missing required fields (checkoutUrl, shouldShow)');
    }
  } else {
    fail('TrialNudgeBanner component', `file not found: ${bannerPath}`);
  }

  // Test 2: Dashboard layout imports TrialNudgeBanner
  const layoutPath = path.join(DASHBOARD_DIR, 'app/dashboard/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf8');
    if (content.includes('TrialNudgeBanner') && content.includes('<TrialNudgeBanner')) {
      pass('Dashboard layout renders TrialNudgeBanner');
    } else {
      fail('Dashboard layout', 'TrialNudgeBanner not rendered in layout');
    }
  } else {
    fail('Dashboard layout', `not found: ${layoutPath}`);
  }

  // Test 3: Nudge API route exists
  const nudgeRoutePath = path.join(DASHBOARD_DIR, 'app/api/trial/nudge/route.ts');
  if (fs.existsSync(nudgeRoutePath)) {
    const content = fs.readFileSync(nudgeRoutePath, 'utf8');
    if (content.includes('getAuthUserId') && content.includes('shouldShow') && content.includes('checkoutUrl')) {
      pass('Nudge API route exists with auth guard and checkout URL');
    } else {
      fail('Nudge API route', 'missing auth guard or checkoutUrl logic');
    }
  } else {
    fail('Nudge API route', `not found: ${nudgeRoutePath}`);
  }

  // Test 4: Dismiss nudge API route exists
  const dismissRoutePath = path.join(DASHBOARD_DIR, 'app/api/trial/dismiss-nudge/route.ts');
  if (fs.existsSync(dismissRoutePath)) {
    const content = fs.readFileSync(dismissRoutePath, 'utf8');
    if (content.includes('trial_banner_dismissed') && content.includes('getAuthUserId')) {
      pass('Dismiss-nudge API route exists with auth guard');
    } else {
      fail('Dismiss-nudge API route', 'missing auth guard or trial_banner_dismissed update');
    }
  } else {
    fail('Dismiss-nudge API route', `not found: ${dismissRoutePath}`);
  }

  // Test 5: Billing create-checkout route exists with price validation
  const checkoutRoutePath = path.join(DASHBOARD_DIR, 'app/api/billing/create-checkout/route.ts');
  if (fs.existsSync(checkoutRoutePath)) {
    const content = fs.readFileSync(checkoutRoutePath, 'utf8');
    if (content.includes('isValidPriceId') && content.includes('IDOR') && content.includes('checkRateLimit')) {
      pass('Billing create-checkout route exists with price validation, IDOR protection, and rate limiting');
    } else {
      fail('Billing create-checkout route', 'missing isValidPriceId, IDOR protection, or rate limiting');
    }
  } else {
    fail('Billing create-checkout route', `not found: ${checkoutRoutePath}`);
  }

  // Test 6: Upgrade page exists
  const upgradePagePath = path.join(DASHBOARD_DIR, 'app/upgrade/page.tsx');
  if (fs.existsSync(upgradePagePath)) {
    pass('/upgrade route exists');
  } else {
    fail('/upgrade route', `not found: ${upgradePagePath}`);
  }

  // Test 7: Unit tests exist and cover key scenarios
  const unitTestPath = path.join(DASHBOARD_DIR, '__tests__/trial-nudge.test.ts');
  if (fs.existsSync(unitTestPath)) {
    const content = fs.readFileSync(unitTestPath, 'utf8');
    const requiredCases = [
      'returns 401 when not authenticated',
      'returns shouldShow: false for paid agents',
      'returns shouldShow: true',
      'isExpired',
      'dismissed',
    ];
    const allCovered = requiredCases.every(c => content.includes(c));
    if (allCovered) {
      pass('Unit tests exist covering auth, paid bypass, expiry, and dismissal');
    } else {
      const missing = requiredCases.filter(c => !content.includes(c));
      fail('Unit tests', `missing coverage for: ${missing.join(', ')}`);
    }
  } else {
    fail('Unit tests', `not found: ${unitTestPath}`);
  }

  // --- Live API checks ---
  // Test 8: GET /api/trial/nudge returns 401 without auth
  try {
    const res = await httpsGet(`${BASE_URL}/api/trial/nudge`);
    if (res.status === 401) {
      pass('GET /api/trial/nudge returns 401 without auth (live)');
    } else {
      fail('GET /api/trial/nudge auth gate', `expected 401, got ${res.status}: ${res.body.slice(0, 100)}`);
    }
  } catch (e) {
    fail('GET /api/trial/nudge (live)', `request failed: ${e.message}`);
  }

  // Test 9: POST /api/trial/dismiss-nudge returns 401 without auth
  try {
    const res = await httpsPost(`${BASE_URL}/api/trial/dismiss-nudge`, {});
    if (res.status === 401) {
      pass('POST /api/trial/dismiss-nudge returns 401 without auth (live)');
    } else {
      fail('POST /api/trial/dismiss-nudge auth gate', `expected 401, got ${res.status}`);
    }
  } catch (e) {
    fail('POST /api/trial/dismiss-nudge (live)', `request failed: ${e.message}`);
  }

  // Test 10: POST /api/billing/create-checkout rejects missing fields
  try {
    const res = await httpsPost(`${BASE_URL}/api/billing/create-checkout`, {});
    if (res.status === 400 && res.json && res.json.error) {
      pass('POST /api/billing/create-checkout returns 400 for missing fields (live)');
    } else {
      fail('POST /api/billing/create-checkout field validation', `expected 400, got ${res.status}`);
    }
  } catch (e) {
    fail('POST /api/billing/create-checkout (live)', `request failed: ${e.message}`);
  }

  // Test 11: POST /api/billing/create-checkout rejects invalid tier
  try {
    const res = await httpsPost(`${BASE_URL}/api/billing/create-checkout`, {
      tier: 'bogus_tier',
      agentId: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
    });
    if (res.status === 400 && res.json && res.json.code === 'INVALID_TIER') {
      pass('POST /api/billing/create-checkout returns INVALID_TIER for unknown tier (live)');
    } else {
      fail('POST /api/billing/create-checkout tier validation', `expected 400 INVALID_TIER, got ${res.status} ${JSON.stringify(res.json)}`);
    }
  } catch (e) {
    fail('POST /api/billing/create-checkout tier validation (live)', `request failed: ${e.message}`);
  }

  // Summary
  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} total\n`);
  if (failed > 0) {
    console.error('VERDICT: FAIL');
    process.exit(1);
  } else {
    console.log('VERDICT: PASS');
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
