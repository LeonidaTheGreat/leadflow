/**
 * Tests: fix-mrr-is-0-no-paying-customers
 * Task: 186971a1-cfb0-4ca5-bc2d-69cb92d67f6c
 *
 * Verifies all code-level fixes that unblock the trial signup funnel and remove
 * barriers to MRR generation:
 *
 * 1. trial/start route uses 'auth-token' cookie name (hyphen) — not underscore
 * 2. trial-signup route redirects to /dashboard/onboarding — not /setup
 * 3. trial/start route redirects to /dashboard/onboarding — not /setup
 * 4. trial duration is 14 days in backend routes (not 30)
 * 5. LandingPage (dashboard/app/page.tsx) contains "How It Works" section
 * 6. LandingPage does not contain false social proof claims
 * 7. trial-signup-form shows 14-day trial copy (not 30)
 * 8. madzunkov@hotmail.com has plan_tier set (not null) — DB check
 * 9. action_items ec7162a6, 5fb4f36b, 96d5780f are resolved — DB check
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

// Test 1: trial/start route uses 'auth-token' cookie name (hyphen)
test('trial/start route sets auth-token cookie (hyphen, not underscore)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/trial/start/route.ts'),
    'utf-8'
  );
  assert(
    /cookies\.set\(['"]auth-token['"]/.test(src),
    'trial/start/route.ts must set cookie named auth-token (hyphen)'
  );
  assert(
    !/cookies\.set\(['"]auth_token['"]/.test(src),
    'trial/start/route.ts must NOT use auth_token (underscore) cookie name'
  );
});

// Test 2: trial-signup route redirects to /dashboard/onboarding — not /setup
test('trial-signup route redirects to /dashboard/onboarding (not /setup)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts'),
    'utf-8'
  );
  assert(
    src.includes("redirectTo: '/dashboard/onboarding'") ||
    src.includes('redirectTo: "/dashboard/onboarding"'),
    'trial-signup/route.ts must redirect to /dashboard/onboarding'
  );
  assert(
    !src.includes("redirectTo: '/setup'") && !src.includes('redirectTo: "/setup"'),
    'trial-signup/route.ts must NOT redirect to /setup'
  );
});

// Test 3: trial/start route redirects to /dashboard/onboarding — not /setup
test('trial/start route redirects to /dashboard/onboarding (not /setup)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/trial/start/route.ts'),
    'utf-8'
  );
  assert(
    src.includes("redirectTo: '/dashboard/onboarding'") ||
    src.includes('redirectTo: "/dashboard/onboarding"'),
    'trial/start/route.ts must redirect to /dashboard/onboarding'
  );
  assert(
    !src.includes("redirectTo: '/setup'") && !src.includes('redirectTo: "/setup"'),
    'trial/start/route.ts must NOT redirect to /setup'
  );
});

// Test 4: trial duration is 14 days in backend routes (not 30 days for trial_ends_at)
test('trial duration is 14 days in trial/start route (trial_ends_at)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/trial/start/route.ts'),
    'utf-8'
  );
  // Must set trial ends at 14 days (either via getDate()+14 or 14 * 24 * 60 * 60)
  const has14DayTrial =
    src.includes('+ 14') ||
    src.includes('14 * 24') ||
    src.includes('+14') ||
    /setDate.*\+\s*14/.test(src) ||
    /getDate\(\)\s*\+\s*14/.test(src);
  assert(has14DayTrial, 'trial/start/route.ts must set trial to 14 days');
});

// Test 5: LandingPage (page.tsx) contains "How It Works" section
test('LandingPage (page.tsx) contains How It Works section with correct testid', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/page.tsx'),
    'utf-8'
  );
  assert(
    src.includes('How It Works'),
    'page.tsx must contain "How It Works" text'
  );
  assert(
    src.includes('data-testid="how-it-works-section"'),
    'page.tsx must have data-testid="how-it-works-section" on the section wrapper'
  );
});

// Test 6: LandingPage does not contain false social proof claims
test('LandingPage does not claim hundreds/thousands of agents falsely', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'app/page.tsx'),
    'utf-8'
  );
  assert(
    !src.includes('hundreds of agents') && !src.includes('500+ agents') && !src.includes('1,000+ agents'),
    'page.tsx must not contain false agent count social proof claims'
  );
});

// Test 7: trial-signup-form shows 14-day trial copy (not 30)
test('trial-signup-form uses 14-day trial copy (not 30 days)', () => {
  const src = fs.readFileSync(
    path.join(DASHBOARD, 'components/trial-signup-form.tsx'),
    'utf-8'
  );
  // Must mention 14 days
  assert(
    src.includes('14 day') || src.includes('14-day'),
    'trial-signup-form.tsx must mention 14-day trial'
  );
  // Must NOT mention 30-day trial as a trial duration claim
  assert(
    !src.includes('30-day trial') && !src.includes('30 days free'),
    'trial-signup-form.tsx must not claim 30-day trial'
  );
});

// Test 8: madzunkov@hotmail.com has plan_tier set (not null) — DB check
testAsync('madzunkov@hotmail.com has plan_tier set in DB (not null)', async () => {
  let pool;
  try {
    // Try loading pg — look in main repo node_modules since this may be a worktree
    let Pool;
    const pgPaths = [
      path.join(ROOT, 'node_modules/pg'),
      '/Users/clawdbot/projects/leadflow/node_modules/pg',
    ];
    for (const p of pgPaths) {
      try { Pool = require(p).Pool; break; } catch { /* try next */ }
    }
    if (!Pool) {
      console.log('  (skipping DB check — pg module not found)');
      return;
    }

    let pgUrl = process.env.LOCAL_PG_URL;
    if (!pgUrl) {
      // Try dotenv from home dir
      const envPath = require('os').homedir() + '/.env';
      const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      const match = envContent.match(/^LOCAL_PG_URL=(.+)$/m);
      if (match) pgUrl = match[1].trim();
    }
    if (!pgUrl) {
      console.log('  (skipping DB check — LOCAL_PG_URL not set)');
      return;
    }

    pool = new Pool({ connectionString: pgUrl });
    const result = await pool.query(
      "SELECT plan_tier FROM real_estate_agents WHERE email='madzunkov@hotmail.com'"
    );
    assert(result.rows.length > 0, 'madzunkov@hotmail.com not found in real_estate_agents');
    const planTier = result.rows[0].plan_tier;
    assert(
      planTier !== null && planTier !== 'null' && planTier !== '',
      `madzunkov@hotmail.com plan_tier is '${planTier}' — expected 'trial' or a valid tier`
    );
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
});

// Test 9: action_items ec7162a6, 5fb4f36b, 96d5780f are resolved — DB check
testAsync('action_items ec7162a6, 5fb4f36b, 96d5780f are resolved in DB', async () => {
  let pool;
  try {
    let Pool;
    const pgPaths = [
      path.join(ROOT, 'node_modules/pg'),
      '/Users/clawdbot/projects/leadflow/node_modules/pg',
    ];
    for (const p of pgPaths) {
      try { Pool = require(p).Pool; break; } catch { /* try next */ }
    }
    if (!Pool) {
      console.log('  (skipping DB check — pg module not found)');
      return;
    }

    let pgUrl = process.env.LOCAL_PG_URL;
    if (!pgUrl) {
      const envPath = require('os').homedir() + '/.env';
      const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
      const match = envContent.match(/^LOCAL_PG_URL=(.+)$/m);
      if (match) pgUrl = match[1].trim();
    }
    if (!pgUrl) {
      console.log('  (skipping DB check — LOCAL_PG_URL not set)');
      return;
    }

    pool = new Pool({ connectionString: pgUrl });
    const prefixes = ['ec7162a6', '5fb4f36b', '96d5780f'];
    const result = await pool.query(
      `SELECT id, status FROM action_items WHERE ${prefixes.map(p => `id::text LIKE '${p}%'`).join(' OR ')}`
    );
    assert(
      result.rows.length > 0,
      `No action_items found with prefixes: ${prefixes.join(', ')}`
    );
    const unresolved = result.rows.filter(r => r.status !== 'resolved');
    assert(
      unresolved.length === 0,
      `${unresolved.length} action_item(s) not resolved: ${unresolved.map(r => `${r.id}=${r.status}`).join(', ')}`
    );
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
});

// Wait for all async tests to complete
setTimeout(() => {
  console.log('');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}, 5000);
