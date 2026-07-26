'use strict';
/**
 * QC E2E Test: Agent Referral Program (uc-leadflow-agent-referral-program)
 * Runnable with: node tests/e2e/qc-uc-agent-referral-program.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD = path.resolve(__dirname, '../../product/lead-response/dashboard');
const passed = [];
const failed = [];

function ok(name, fn) {
  try {
    fn();
    passed.push(name);
    process.stdout.write(`  ✅ ${name}\n`);
  } catch (err) {
    failed.push({ name, reason: err.message });
    process.stdout.write(`  ❌ ${name}\n     ${err.message}\n`);
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────

async function checkSchema() {
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw' });
  await c.connect();

  const res = await c.query(
    `SELECT column_name, column_default FROM information_schema.columns
     WHERE table_name = 'real_estate_agents'
       AND column_name IN ('total_referral_credits')`
  );
  ok('total_referral_credits column exists with DEFAULT 0', () => {
    const row = res.rows[0];
    assert.ok(row, 'Column total_referral_credits missing from real_estate_agents');
    assert.ok(
      String(row.column_default).includes('0'),
      `total_referral_credits has no DEFAULT 0 — NULL+1=NULL in Postgres. Got: ${row.column_default}`
    );
  });

  const refRes = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'referrals'`
  );
  const refCols = refRes.rows.map(r => r.column_name);
  ok('referrals table has credit_applied and free_months_earned', () => {
    assert.ok(refCols.includes('credit_applied'), 'referrals.credit_applied missing');
    assert.ok(refCols.includes('free_months_earned'), 'referrals.free_months_earned missing');
  });

  await c.end();
}

// ── Correctness: apply-credit route ──────────────────────────────────────────

function checkApplyCreditRoute() {
  const file = path.join(DASHBOARD, 'app/api/referrals/apply-credit/route.ts');
  const src = fs.readFileSync(file, 'utf8');

  ok('apply-credit: auth header check present', () => {
    assert.ok(src.includes('authorization'), 'Missing authorization header check');
    assert.ok(src.includes('401'), 'Missing 401 response for unauthorized requests');
  });

  ok('apply-credit: does NOT nest rpc() inside update() — CORRECTNESS BUG CHECK', () => {
    // supabaseAdmin.rpc(...) used as a value inside .update({...}) is invalid.
    // rpc() returns a query builder, not a number. The increment silently fails.
    const nestPattern = /\.update\s*\(\s*\{[^}]*\.rpc\s*\(/s;
    assert.ok(
      !nestPattern.test(src),
      'BUG: supabaseAdmin.rpc() is nested inside .update() as a column value. ' +
      'This passes a Promise/builder object, not an integer. ' +
      'total_referral_credits will never be incremented. ' +
      'Fix: use a separate rpc() call or read-then-write pattern.'
    );
  });

  ok('apply-credit: plan credit amounts match pricing tiers', () => {
    // starter=$49, pro=$149, team=$399, brokerage=$999
    assert.ok(src.includes('49_00') || src.includes('4900'), 'Missing starter credit amount ($49)');
    assert.ok(src.includes('149_00') || src.includes('14900'), 'Missing pro credit amount ($149)');
  });

  ok('apply-credit: conversion email is non-fatal (try/catch)', () => {
    assert.ok(src.includes('emailErr') || src.includes('non-fatal'), 'Email send must be non-fatal');
  });
}

// ── Component wiring ──────────────────────────────────────────────────────────

function checkWiring() {
  ok('ReferralWidget imported in settings page', () => {
    const settings = fs.readFileSync(path.join(DASHBOARD, 'app/settings/page.tsx'), 'utf8');
    assert.ok(settings.includes('ReferralWidget'), 'ReferralWidget not imported in settings/page.tsx');
  });

  ok('/r/[code] landing page persists referral code in cookie', () => {
    const page = fs.readFileSync(path.join(DASHBOARD, 'app/r/[code]/page.tsx'), 'utf8');
    assert.ok(page.includes('document.cookie'), 'Landing page must set cookie');
    assert.ok(page.includes('referral_code'), 'Landing page must use referral_code key');
  });

  ok('generate route uses crypto.randomBytes (not Math.random)', () => {
    const gen = fs.readFileSync(path.join(DASHBOARD, 'app/api/referrals/generate/route.ts'), 'utf8');
    assert.ok(gen.includes('crypto.randomBytes'), 'Must use crypto.randomBytes for referral codes');
    assert.ok(!gen.includes('Math.random'), 'Must NOT use Math.random for security-sensitive codes');
  });

  ok('referral-email module exports sendReferralConversionEmail', () => {
    const email = fs.readFileSync(path.join(DASHBOARD, 'lib/referral-email.ts'), 'utf8');
    assert.ok(email.includes('sendReferralConversionEmail'), 'Missing sendReferralConversionEmail export');
  });
}

// ── Runner ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n=== QC: uc-leadflow-agent-referral-program ===\n');

  try {
    await checkSchema();
  } catch (e) {
    failed.push({ name: 'schema checks (DB connection)', reason: e.message });
    console.error('  ⚠️  DB connection failed — skipping schema checks:', e.message);
  }

  checkApplyCreditRoute();
  checkWiring();

  const total = passed.length + failed.length;
  console.log(`\n${passed.length}/${total} passed`);

  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(f => console.log(`  ✗ ${f.name}: ${f.reason}`));
    process.exit(1);
  }
})();
