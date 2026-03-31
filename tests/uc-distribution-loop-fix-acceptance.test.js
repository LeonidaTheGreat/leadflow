#!/usr/bin/env node
/**
 * Acceptance test: uc-distribution-loop-fix
 * Verifies that distribution_channels table exists and has an active landing_page row for leadflow.
 * This mirrors the acceptance check stored in use_cases.acceptance_checks for uc-distribution-loop-fix.
 */

const { execSync } = require('child_process');
const assert = require('assert');

const PSQL = '/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql';
const DB_URL = 'postgresql://clawdbot@localhost/openclaw';

function psql(query) {
  return execSync(`${PSQL} "${DB_URL}" -tAc "${query}"`, { encoding: 'utf-8' }).trim();
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 uc-distribution-loop-fix acceptance tests\n');

// 1. distribution_channels table exists
test('distribution_channels table exists in local postgres', () => {
  const result = psql("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='distribution_channels'");
  assert.strictEqual(result, '1', `Expected table to exist, got: ${result}`);
});

// 2. Active landing_page row for leadflow
test('distribution_channels has active landing_page row for leadflow', () => {
  const result = psql("SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'");
  assert.strictEqual(result, '1', `Expected 1 active landing_page row, got: ${result}`);
});

// 3. Acceptance check command is properly configured (full psql path)
test('acceptance check in use_cases uses full psql path', () => {
  const raw = psql("SELECT acceptance_checks FROM use_cases WHERE id='uc-distribution-loop-fix'");
  assert.ok(raw, 'Expected acceptance_checks to be non-empty');
  const checks = JSON.parse(raw);
  assert.ok(Array.isArray(checks) && checks.length > 0, 'Expected at least one check');
  const distCheck = checks.find(c => c.id === 'check-dist-channels');
  assert.ok(distCheck, 'Expected check-dist-channels to exist');
  assert.ok(
    distCheck.command.includes('/opt/homebrew/'),
    `Expected full psql path in command, got: ${distCheck.command}`
  );
  assert.strictEqual(distCheck.expected, '1', 'Expected expected value to be "1"');
});

// 4. Acceptance check command actually passes when run
test('check-dist-channels command executes and returns "1"', () => {
  const checks = JSON.parse(psql("SELECT acceptance_checks FROM use_cases WHERE id='uc-distribution-loop-fix'"));
  const distCheck = checks.find(c => c.id === 'check-dist-channels');
  assert.ok(distCheck, 'check-dist-channels must exist');
  const result = execSync(distCheck.command, { encoding: 'utf-8', timeout: 15000 }).trim();
  assert.strictEqual(result, distCheck.expected, `Expected "${distCheck.expected}", got "${result}"`);
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
