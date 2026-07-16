'use strict';

/**
 * QC structural test for uc-sms-activation-nudge (PR #1860)
 *
 * Verifies:
 * 1. Required files exist at expected paths
 * 2. SQL migration is idempotent (ADD COLUMN IF NOT EXISTS)
 * 3. Route file exports GET and POST handlers (TypeScript analysis)
 * 4. Page component has required data-testid attributes for automation
 * 5. Auth guard is present in the route (requireAdmin call)
 * 6. Bulk-all guard: only targets IS NULL + not-null phone (no duplicate blasts)
 * 7. SMS message format includes onboarding URL
 *
 * Usage: node tests/qc-71d09217-activation-nudge-structural.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

console.log('\n🔍 QC Structural: uc-sms-activation-nudge (PR #1860)\n');

// ─── File existence ───────────────────────────────────────────────────────────

test('activation page.tsx exists', () => {
  const p = path.join(DASHBOARD, 'app/admin/activation/page.tsx');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('activation route.ts exists', () => {
  const p = path.join(DASHBOARD, 'app/api/admin/activation/route.ts');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('SQL migration exists', () => {
  const p = path.join(ROOT, 'scripts/db/add-activation-sms-timestamp.sql');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

test('E2E test file exists', () => {
  const p = path.join(ROOT, 'tests/uc-sms-activation-nudge.test.js');
  assert.ok(fs.existsSync(p), `Missing: ${p}`);
});

// ─── SQL migration quality ─────────────────────────────────────────────────

test('SQL migration uses IF NOT EXISTS (idempotent)', () => {
  const sql = readFile('scripts/db/add-activation-sms-timestamp.sql');
  assert.ok(sql.includes('IF NOT EXISTS'), 'Migration must use ADD COLUMN IF NOT EXISTS');
});

test('SQL migration targets correct column name', () => {
  const sql = readFile('scripts/db/add-activation-sms-timestamp.sql');
  assert.ok(sql.includes('last_activation_sms_at'), 'Migration must add last_activation_sms_at column');
});

test('SQL migration targets correct table', () => {
  const sql = readFile('scripts/db/add-activation-sms-timestamp.sql');
  assert.ok(sql.includes('real_estate_agents'), 'Migration must target real_estate_agents table');
});

// ─── Route integrity ─────────────────────────────────────────────────────────

test('route.ts exports GET handler', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(src.includes('export async function GET'), 'route.ts must export GET');
});

test('route.ts exports POST handler', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(src.includes('export async function POST'), 'route.ts must export POST');
});

test('route.ts guards GET with requireAdmin', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  const getMatch = src.match(/export async function GET[\s\S]*?requireAdmin/);
  assert.ok(getMatch, 'GET handler must call requireAdmin before doing anything');
});

test('route.ts guards POST with requireAdmin', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  const postMatch = src.match(/export async function POST[\s\S]*?requireAdmin/);
  assert.ok(postMatch, 'POST handler must call requireAdmin before doing anything');
});

test('route.ts uses phone validation before sending SMS', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(src.includes('isValidPhoneNumber'), 'Must validate phone before sending SMS');
  assert.ok(src.includes('normalizePhone'), 'Must normalize phone before sending SMS');
});

test('route.ts records last_activation_sms_at after send', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(src.includes('last_activation_sms_at'), 'Must record send timestamp');
});

test('route.ts bulkAll guard: only targets null timestamp (no re-blast)', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(src.includes("is('last_activation_sms_at', null)"), 'Bulk must only target agents never nudged');
});

test('SMS nudge message includes onboarding URL', () => {
  const src = readFile('product/lead-response/dashboard/app/api/admin/activation/route.ts');
  assert.ok(
    src.includes('leadflow-ai-five.vercel.app') || src.includes('ONBOARDING_URL'),
    'SMS message must include onboarding URL'
  );
});

// ─── Page integrity ──────────────────────────────────────────────────────────

test('page.tsx has nudge-all-btn testid', () => {
  const src = readFile('product/lead-response/dashboard/app/admin/activation/page.tsx');
  assert.ok(src.includes('data-testid="nudge-all-btn"'), 'Bulk nudge button must have testid for automation');
});

test('page.tsx has activation-table testid', () => {
  const src = readFile('product/lead-response/dashboard/app/admin/activation/page.tsx');
  assert.ok(src.includes('data-testid="activation-table"'), 'Agent table must have testid');
});

test('page.tsx handles 401 → redirects to login', () => {
  const src = readFile('product/lead-response/dashboard/app/admin/activation/page.tsx');
  assert.ok(src.includes('router.replace'), 'Should redirect on 401');
  assert.ok(src.includes('/admin/login'), 'Should redirect to admin login');
});

test('admin page.tsx links to /admin/activation', () => {
  const src = readFile('product/lead-response/dashboard/app/admin/page.tsx');
  assert.ok(src.includes('/admin/activation'), 'Admin hub must link to activation nudge page');
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
process.exit(failed > 0 ? 1 : 0);
