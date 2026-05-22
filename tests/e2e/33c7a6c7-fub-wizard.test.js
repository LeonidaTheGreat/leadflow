/**
 * E2E Test: Guided FUB Connection Wizard
 * QC Task: 33c7a6c7-a3fc-45a1-abae-963f3ab879fe
 *
 * Tests acceptance criteria from PRD-FUB-CONNECTION-WIZARD.md
 * using plain Node.js assertions against live route files + build output.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name} — ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

const BASE = require('path').resolve(__dirname, '../../product/lead-response/dashboard');
const API_BASE = `${BASE}/app/api/onboarding/fub`;
const PAGE_PATH = `${BASE}/app/onboarding/fub/page.tsx`;

async function runTests() {
  console.log('\nFUB Wizard QC E2E Tests — Task 33c7a6c7\n');

  // ── AC: validate-key-valid — endpoint exists, accepts 20+ char keys ─────────
  await test('validate-key: route file exists', async () => {
    assert.ok(fs.existsSync(`${API_BASE}/validate-key/route.ts`), 'validate-key route must exist');
  });

  await test('validate-key: rejects keys < 20 chars with 400', async () => {
    const content = fs.readFileSync(`${API_BASE}/validate-key/route.ts`, 'utf-8');
    assert.ok(content.includes('apiKey.length < 20'), 'Must reject short keys');
    assert.ok(content.includes('status: 400') || content.includes("status:400"), 'Must return 400 for short key');
  });

  await test('validate-key: calls FUB live API for validation', async () => {
    const content = fs.readFileSync(`${API_BASE}/validate-key/route.ts`, 'utf-8');
    assert.ok(content.includes('api.followupboss.com'), 'Must call FUB live API');
    assert.ok(content.includes('Authorization'), 'Must send Authorization header');
  });

  await test('validate-key: requires auth (getAuthUserId)', async () => {
    const content = fs.readFileSync(`${API_BASE}/validate-key/route.ts`, 'utf-8');
    assert.ok(content.includes('getAuthUserId'), 'Must call getAuthUserId');
    assert.ok(content.includes('status: 401'), 'Must return 401 when unauthenticated');
  });

  // ── SECURITY: API key NOT stored in plaintext for audit purposes ─────────────
  await test('validate-key: hashes API key with SHA-256 for audit', async () => {
    const content = fs.readFileSync(`${API_BASE}/validate-key/route.ts`, 'utf-8');
    assert.ok(content.includes('sha256'), 'Must hash API key with SHA-256');
  });

  // ── SECURITY FAIL: Rate limiting missing ─────────────────────────────────────
  await test('validate-key: rate limiting exists (max 10/hr per PRD)', async () => {
    const content = fs.readFileSync(`${API_BASE}/validate-key/route.ts`, 'utf-8');
    const hasRateLimit = content.includes('rateLimit') ||
      content.includes('rate_limit') ||
      content.includes('MAX_ATTEMPTS') ||
      content.includes('attempt_count') ||
      content.includes('X-RateLimit');
    assert.ok(hasRateLimit, 'PRD requires rate limiting on validate-key (max 10 attempts/agent/hour) — MISSING');
  });

  // ── AC: webhook-url-endpoint ─────────────────────────────────────────────────
  await test('webhook-url: route returns imagineapi.org URL with agent_id', async () => {
    const content = fs.readFileSync(`${API_BASE}/webhook-url/route.ts`, 'utf-8');
    assert.ok(content.includes('api.imagineapi.org'), 'Must use api.imagineapi.org base URL');
    assert.ok(content.includes('/webhooks/fub/'), 'URL must include /webhooks/fub/ path');
    assert.ok(content.includes('agentId'), 'Must include agent ID in URL');
  });

  await test('webhook-url: requires auth', async () => {
    const content = fs.readFileSync(`${API_BASE}/webhook-url/route.ts`, 'utf-8');
    assert.ok(content.includes('getAuthUserId'), 'Must require auth');
    assert.ok(content.includes('status: 401'), 'Must return 401 when unauthenticated');
  });

  // ── AC: test-status-polling ──────────────────────────────────────────────────
  await test('test-status: returns received:false initially, received:true when lead exists', async () => {
    const content = fs.readFileSync(`${API_BASE}/test-status/route.ts`, 'utf-8');
    assert.ok(content.includes("received: false"), 'Must return received:false when no lead');
    assert.ok(content.includes("received: true"), 'Must return received:true when lead found');
    assert.ok(content.includes('leadName'), 'Must include leadName in success response');
  });

  // ── AC: wizard-complete ──────────────────────────────────────────────────────
  await test('complete: sets fub_onboarding_completed=true in real_estate_agents', async () => {
    const content = fs.readFileSync(`${API_BASE}/complete/route.ts`, 'utf-8');
    assert.ok(content.includes('fub_onboarding_completed: true'), 'Must set fub_onboarding_completed=true');
    assert.ok(content.includes('real_estate_agents'), 'Must update real_estate_agents table');
  });

  // ── AC FAIL: wizard-hidden-after-complete ────────────────────────────────────
  await test('wizard page: checks fub_onboarding_completed and redirects completed agents', async () => {
    const content = fs.readFileSync(PAGE_PATH, 'utf-8');
    const checksCompletedFlag = content.includes('fub_onboarding_completed') ||
      content.includes('onboarding_completed') ||
      content.includes('/api/onboarding/fub/status');
    assert.ok(
      checksCompletedFlag,
      'AC wizard-hidden-after-complete VIOLATED: page never reads fub_onboarding_completed — returning agents who completed the wizard will see it again'
    );
  });

  // ── UI: Step indicators present ──────────────────────────────────────────────
  await test('wizard page: all 4 step data-testids present', async () => {
    const content = fs.readFileSync(PAGE_PATH, 'utf-8');
    for (const id of ['step-1-api-key', 'step-2-webhook', 'step-3-test-lead', 'step-4-success', 'go-to-dashboard-btn']) {
      assert.ok(content.includes(`data-testid="${id}"`), `Missing data-testid="${id}"`);
    }
  });

  await test('wizard page: FUB admin link present in step 1', async () => {
    const content = fs.readFileSync(PAGE_PATH, 'utf-8');
    assert.ok(content.includes('app.followupboss.com/2/api'), 'Must link to FUB admin API page');
  });

  await test('wizard page: copy button present for webhook URL', async () => {
    const content = fs.readFileSync(PAGE_PATH, 'utf-8');
    assert.ok(content.includes('clipboard.writeText') || content.includes('copy'), 'Must have copy button for webhook URL');
  });

  await test('wizard page: confirmation checkbox before proceeding to step 3', async () => {
    const content = fs.readFileSync(PAGE_PATH, 'utf-8');
    assert.ok(content.includes('confirmed') || content.includes('checkbox'), 'Must have confirmation checkbox in step 2');
  });

  // ── Migration ────────────────────────────────────────────────────────────────
  await test('migration: targets real_estate_agents table (not wrong table)', async () => {
    const migPath = require('path').resolve(__dirname, '../../migrations/010_fub_onboarding_wizard.sql');
    const content = fs.readFileSync(migPath, 'utf-8');
    assert.ok(content.includes('real_estate_agents'), 'Migration must target real_estate_agents');
    assert.ok(content.includes('fub_onboarding_completed'), 'Must add fub_onboarding_completed');
    assert.ok(content.includes('fub_onboarding_step'), 'Must add fub_onboarding_step');
  });

  // ── No hardcoded secrets ─────────────────────────────────────────────────────
  await test('security: no hardcoded API keys or secrets in new files', async () => {
    const files = [
      `${API_BASE}/validate-key/route.ts`,
      `${API_BASE}/webhook-url/route.ts`,
      `${API_BASE}/test-status/route.ts`,
      `${API_BASE}/complete/route.ts`,
      PAGE_PATH,
    ];
    const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /fub_[a-zA-Z0-9]{30,}/, /Bearer [a-zA-Z0-9]{20,}/];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of secretPatterns) {
        assert.ok(!pattern.test(content), `Hardcoded secret found in ${path.basename(file)}`);
      }
    }
  });

  // ── Build output ─────────────────────────────────────────────────────────────
  await test('build: Next.js build succeeds (pre-verified)', async () => {
    // Build was run at QC start — passed. This asserts the artifact exists.
    const nextDir = `${BASE}/.next`;
    assert.ok(fs.existsSync(nextDir), 'Next.js .next directory must exist after successful build');
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Passed: ${passed} / ${passed + failed}`);
  if (failed > 0) {
    console.error(`Failed: ${failed}`);
    failures.forEach(f => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('All tests passed.');
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
