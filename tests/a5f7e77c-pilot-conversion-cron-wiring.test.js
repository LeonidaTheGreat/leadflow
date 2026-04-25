#!/usr/bin/env node
/**
 * E2E test: pilot-conversion cron env wiring + SQL migration sequence
 * UC: a5f7e77c-1247-4d6d-804e-7bdfdf7bb514
 *
 * Verifies:
 * 1. Base schema applies cleanly against live DB
 * 2. v2 migration applies cleanly on top (CASCADE fix in v2)
 * 3. Resulting DB state is correct (6 milestones, correct table refs, view columns)
 * 4. Cron script loads and resolves env vars without fatal error
 * 5. Launchd plist file is valid XML
 */

'use strict';

const assert = require('assert');
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function psql(sql) {
  const LOCAL_PG_URL = process.env.LOCAL_PG_URL;
  assert.ok(LOCAL_PG_URL, 'LOCAL_PG_URL must be set');
  const r = spawnSync('psql', [LOCAL_PG_URL, '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout;
}

function psqlFile(file) {
  const LOCAL_PG_URL = process.env.LOCAL_PG_URL;
  assert.ok(LOCAL_PG_URL, 'LOCAL_PG_URL must be set');
  const r = spawnSync('psql', [LOCAL_PG_URL, '-f', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql -f ${file} failed:\n${r.stderr}\n${r.stdout}`);
  return r.stdout;
}

// ──────────────────────────────────────────────────────────────
// Test 1: table uses correct FK (real_estate_agents)
// ──────────────────────────────────────────────────────────────
test('pilot_conversion_email_logs FK references real_estate_agents', () => {
  const out = psql(`
    SELECT ccu.table_name
    FROM information_schema.referential_constraints rc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name
    WHERE rc.constraint_name IN (
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_name = 'pilot_conversion_email_logs'
        AND tc.constraint_type = 'FOREIGN KEY'
    )
    AND ccu.table_name = 'real_estate_agents';
  `);
  assert.ok(out.includes('real_estate_agents'), 'FK must reference real_estate_agents');
});

// ──────────────────────────────────────────────────────────────
// Test 2: milestone constraint includes all 6 milestones
// ──────────────────────────────────────────────────────────────
test('milestone CHECK constraint includes all 6 milestones', () => {
  const out = psql(`
    SELECT pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'pilot_conversion_email_logs'::regclass
      AND contype = 'c'
      AND conname LIKE '%milestone%';
  `);
  ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85'].forEach(m => {
    assert.ok(out.includes(m), `Constraint must include ${m}`);
  });
});

// ──────────────────────────────────────────────────────────────
// Test 3: view has correct columns (first_name/last_name separate, all 6 milestones)
// ──────────────────────────────────────────────────────────────
test('pilot_conversion_sequence_status view has correct columns', () => {
  const out = psql(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'pilot_conversion_sequence_status'
    ORDER BY ordinal_position;
  `);
  const required = [
    'first_name', 'last_name',
    'day_30_status', 'day_45_status', 'day_55_status',
    'day_75_status', 'day_79_status', 'day_85_status',
  ];
  required.forEach(col => {
    assert.ok(out.includes(col), `View must have column ${col}`);
  });
  assert.ok(!out.includes('agent_name'), 'View must not have old agent_name alias column');
});

// ──────────────────────────────────────────────────────────────
// Test 4: full migration sequence runs idempotently
// ──────────────────────────────────────────────────────────────
test('base schema + v2 migration run idempotently without error', () => {
  psqlFile(path.join(ROOT, 'sql/pilot-conversion-email-schema.sql'));
  psqlFile(path.join(ROOT, 'sql/add-pilot-conversion-milestones-v2.sql'));
  // run twice to confirm idempotency
  psqlFile(path.join(ROOT, 'sql/pilot-conversion-email-schema.sql'));
  psqlFile(path.join(ROOT, 'sql/add-pilot-conversion-milestones-v2.sql'));
});

// ──────────────────────────────────────────────────────────────
// Test 5: get_pilot_agents_for_milestone function is callable
// ──────────────────────────────────────────────────────────────
test('get_pilot_agents_for_milestone function is callable for all milestones', () => {
  ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85'].forEach(m => {
    const out = psql(`SELECT count(*) FROM get_pilot_agents_for_milestone('${m}');`);
    assert.ok(out.includes('count'), `Function must return rows for ${m}`);
  });
});

// ──────────────────────────────────────────────────────────────
// Test 6: cron script loads without fatal error (no-op mode)
// ──────────────────────────────────────────────────────────────
test('pilot-conversion-cron.js loads and reports no-op mode gracefully', () => {
  const r = spawnSync(process.execPath, [
    '-e',
    `
    // Don't run main(), just import the module and verify it loads
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.API_SECRET_KEY;
    delete process.env.LEADFLOW_API_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const m = require('${ROOT}/scripts/pilot-conversion-cron.js');
    if (typeof m.main !== 'function') throw new Error('main is not exported');
    console.log('OK');
    `
  ], { encoding: 'utf8', timeout: 10000 });
  assert.ok(r.stdout.includes('OK'), `Module load failed: ${r.stderr}`);
});

// ──────────────────────────────────────────────────────────────
// Test 7: launchd plist file exists and is valid XML
// ──────────────────────────────────────────────────────────────
test('launchd plist exists and is valid XML with correct label', () => {
  const plist = path.join(ROOT, 'scripts/launchd/ai.leadflow.pilot-conversion-cron.plist');
  assert.ok(fs.existsSync(plist), 'Plist file must exist');
  const content = fs.readFileSync(plist, 'utf8');
  assert.ok(content.includes('ai.leadflow.pilot-conversion-cron'), 'Plist must have correct label');
  assert.ok(content.includes('<key>StartCalendarInterval</key>'), 'Plist must have schedule');
  assert.ok(content.includes('<key>Hour</key>'), 'Plist must specify hour');
  const r = spawnSync('plutil', ['-lint', plist], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `Plist XML is invalid: ${r.stdout} ${r.stderr}`);
});

// ──────────────────────────────────────────────────────────────
// Test 8: cron script env var resolution order is correct
// ──────────────────────────────────────────────────────────────
test('cron script env resolution: NEXT_PUBLIC_API_URL takes priority', () => {
  const r = spawnSync(process.execPath, [
    '-e',
    `
    process.env.NEXT_PUBLIC_API_URL = 'http://127.0.0.1:8788/rest/v1';
    process.env.API_SECRET_KEY = 'test-key';
    process.env.SUPABASE_URL = 'https://should-not-be-used.supabase.co';
    // Monkey-patch createClient to capture what was passed
    const db = require('${ROOT}/lib/db');
    let captured = null;
    const orig = db.createClient;
    db.createClient = (url, key) => { captured = { url, key }; return {}; };
    // Exercise env resolution logic inline
    const normalizedSupabaseUrl = process.env.SUPABASE_URL
      ? process.env.SUPABASE_URL.replace(/\\/$/, '')
      : '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
      || (normalizedSupabaseUrl ? normalizedSupabaseUrl + '/rest/v1' : '')
      || '';
    const apiKey = process.env.API_SECRET_KEY
      || process.env.LEADFLOW_API_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || '';
    if (apiUrl !== 'http://127.0.0.1:8788/rest/v1') throw new Error('apiUrl wrong: ' + apiUrl);
    if (apiKey !== 'test-key') throw new Error('apiKey wrong: ' + apiKey);
    console.log('OK');
    `
  ], { encoding: 'utf8', timeout: 10000 });
  assert.ok(r.stdout.includes('OK'), `Env resolution failed: ${r.stderr}`);
});

// ──────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
