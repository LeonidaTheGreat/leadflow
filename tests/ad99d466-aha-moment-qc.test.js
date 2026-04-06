/**
 * QC E2E Test: Trial Aha Moment (uc-revenue-aha-moment)
 * Task: ad99d466-fffb-432c-a9dc-8324db8b91ed
 *
 * Acceptance criteria from PRD-TRIAL-AHA-MOMENT.md:
 * AC-1  New trial user can reach simulator without FUB/SMS (≤2 clicks)
 * AC-2  Simulator API returns status:success
 * AC-3  Skip button shows confirmation modal before bypassing
 * AC-4  Dashboard banner visible for agents without simulator
 * AC-5  Dashboard banner absent for agents with simulator success
 * AC-6  Day-1 email sends after verification
 * AC-7  Day-3 email sends to correct cohort (no sim success, ≥3 days since signup)
 * AC-8  Aha moment metric queryable from DB
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASH = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

// ─── AC-1: Simulator reachable without FUB setup ──────────────────────────────
test('AC-1: onboarding wizard includes simulator step', () => {
  const page = fs.readFileSync(path.join(DASH, 'app/dashboard/onboarding/page.tsx'), 'utf8');
  assert(page.includes("'simulator'"), 'simulator step not found in wizard');
  // Simulator must appear in step list before confirmation
  const simIdx = page.indexOf("'simulator'");
  const confirmIdx = page.indexOf("'confirmation'");
  assert(simIdx < confirmIdx, 'simulator step must come before confirmation');
});

test('AC-1: simulator step uses /api/onboarding/simulator (no FUB required)', () => {
  const sim = fs.readFileSync(path.join(DASH, 'app/onboarding/steps/simulator.tsx'), 'utf8');
  assert(sim.includes('/api/onboarding/simulator'), 'simulator must call /api/onboarding/simulator');
  assert(!sim.toLowerCase().includes('fub_api_key'), 'simulator must not require FUB API key');
  assert(!sim.toLowerCase().includes('twilio_auth_token'), 'simulator must not require Twilio');
});

// ─── AC-2: Simulator API ──────────────────────────────────────────────────────
test('AC-2: /api/onboarding/simulator route exists', () => {
  const routePath = path.join(DASH, 'app/api/onboarding/simulator/route.ts');
  assert(fs.existsSync(routePath), 'Simulator API route not found');
});

test('AC-2: simulator API supports start action', () => {
  const content = fs.readFileSync(path.join(DASH, 'app/api/onboarding/simulator/route.ts'), 'utf8');
  assert(content.includes("'start'") || content.includes('"start"'), 'start action must be handled');
  assert(content.includes('success'), 'API must support success status');
});

// ─── AC-3: Skip confirmation modal (R2) ──────────────────────────────────────
test('AC-3: FAIL — skip button has NO confirmation modal', () => {
  const sim = fs.readFileSync(path.join(DASH, 'app/onboarding/steps/simulator.tsx'), 'utf8');
  // PRD R2 requires confirmation dialog/modal before skip completes
  const hasModal = sim.includes('confirm') || sim.includes('modal') || sim.includes('Modal') ||
    sim.includes('dialog') || sim.includes('Dialog') || sim.includes('Are you sure');
  assert(hasModal, 'Skip button must show confirmation modal (R2 not implemented)');
});

// ─── AC-4 & AC-5: Dashboard banner ───────────────────────────────────────────
test('AC-4/AC-5: AhaMomentBanner component exists', () => {
  const bannerPath = path.join(DASH, 'components/dashboard/AhaMomentBanner.tsx');
  assert(fs.existsSync(bannerPath), 'AhaMomentBanner component not found');
});

test('AC-4/AC-5: FAIL — AhaMomentBanner is NOT imported in dashboard page', () => {
  const dashPage = fs.readFileSync(path.join(DASH, 'app/dashboard/page.tsx'), 'utf8');
  assert(
    dashPage.includes('AhaMomentBanner'),
    'AhaMomentBanner must be imported and used in dashboard/page.tsx (R4 not implemented)'
  );
});

test('AC-4/AC-5: FAIL — AhaMomentBanner uses hardcoded hasPendingAha=true (not real DB check)', () => {
  const banner = fs.readFileSync(path.join(DASH, 'components/dashboard/AhaMomentBanner.tsx'), 'utf8');
  const hasRealCheck = !banner.includes('const hasPendingAha = true // Placeholder');
  assert(hasRealCheck, 'AhaMomentBanner uses placeholder hasPendingAha=true instead of real DB query');
});

// ─── AC-6: Day-1 aha email ────────────────────────────────────────────────────
test('AC-6: FAIL — no day-1 aha moment email after verification', () => {
  // PRD R3: send email immediately after email verification for agents without simulator success
  // trial-emails.ts has day-1 = "1 day remaining" (end-of-trial), NOT signup activation email
  const trialEmails = fs.readFileSync(path.join(DASH, 'lib/trial-emails.ts'), 'utf8');
  const hasAhaEmail = trialEmails.includes('aha') || trialEmails.includes('simulator') ||
    trialEmails.includes('Watch a 30-second demo') || trialEmails.includes('watch it handle');
  assert(hasAhaEmail, 'No aha moment email after verification exists (R3 not implemented)');
});

// ─── AC-7: Day-3 email (no sim success, ≥3 days since signup) ─────────────────
test('AC-7: FAIL — day-3 email does not filter by simulator completion', () => {
  const trialEmails = fs.readFileSync(path.join(DASH, 'lib/trial-emails.ts'), 'utf8');
  // PRD R4: day-3 nudge for users without completed simulator
  // trial-emails.ts day3 = 3 days remaining before expiry, no aha check
  const day3ChecksAha = trialEmails.match(/day.?3[\s\S]{0,500}aha_completed|onboarding_simulation[\s\S]{0,500}day.?3/);
  assert(day3ChecksAha, 'Day-3 email must check aha_completed/onboarding_simulation status (R4 email not implemented)');
});

// ─── AC-8: Aha moment metric queryable ───────────────────────────────────────
async function checkAhaMetric() {
  const { Client } = require('pg');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
  await client.connect();
  try {
    // Check aha_completed column exists
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
      AND column_name = 'aha_completed'
    `);
    assert(colCheck.rows.length > 0, 'aha_completed column missing from real_estate_agents — no migration created it');

    // Check aha_response_time_ms column
    const rtCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
      AND column_name = 'aha_response_time_ms'
    `);
    assert(rtCheck.rows.length > 0, 'aha_response_time_ms column missing from real_estate_agents');

    // Run the aha_moment_rate query from PRD
    const metricResult = await client.query(`
      SELECT 
        COUNT(CASE WHEN s.status = 'success' 
                   AND s.created_at <= (a.trial_start_date + interval '3 days') 
                   THEN 1 END)::float 
        / NULLIF(COUNT(a.id), 0) AS aha_moment_rate
      FROM real_estate_agents a
      LEFT JOIN onboarding_simulations s ON s.agent_id = a.id::text
      WHERE a.plan_tier = 'trial'
        AND a.trial_start_date >= NOW() - interval '30 days'
    `);
    const rate = metricResult.rows[0]?.aha_moment_rate;
    assert(rate !== undefined, 'aha_moment_rate query returned no result');
  } finally {
    await client.end();
  }
}

// ─── DB schema: aha columns must exist for route to work ──────────────────────
async function checkDbSchema() {
  const { Client } = require('pg');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
  await client.connect();
  try {
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'real_estate_agents'
      AND column_name IN ('aha_completed', 'aha_response_time_ms', 'onboarding_final_step')
    `);
    const found = result.rows.map(r => r.column_name);
    assert(found.includes('aha_completed'), 'MISSING DB COLUMN: aha_completed — /api/onboarding/complete will silently lose aha data');
    assert(found.includes('aha_response_time_ms'), 'MISSING DB COLUMN: aha_response_time_ms');
    assert(found.includes('onboarding_final_step'), 'MISSING DB COLUMN: onboarding_final_step');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('\n=== QC E2E: Trial Aha Moment (uc-revenue-aha-moment) ===\n');

  await asyncTest('AC-8 + DB schema: aha_completed column exists in real_estate_agents', checkDbSchema);
  await asyncTest('AC-8: aha_moment_rate metric queryable', checkAhaMetric);

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
