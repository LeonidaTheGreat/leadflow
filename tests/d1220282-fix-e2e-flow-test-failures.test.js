#!/usr/bin/env node
// E2E test: infra-watchdog.sh + e2e-flow-tests.sh --skip-watchdog flag
// Verifies the infrastructure watchdog added in PR #1304

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const watchdog = path.join(root, 'scripts', 'infra-watchdog.sh');
const e2eScript = path.join(root, 'scripts', 'e2e-flow-tests.sh');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('=== PR #1304: E2E infra-watchdog integration test ===\n');

// 1. File existence
test('infra-watchdog.sh exists', () => {
  assert.ok(fs.existsSync(watchdog), `Not found: ${watchdog}`);
});

test('infra-watchdog.sh is executable', () => {
  const { mode } = fs.statSync(watchdog);
  assert.ok((mode & 0o111) !== 0, 'File is not executable');
});

// 2. Bash syntax check (no interpreter needed)
test('infra-watchdog.sh passes bash -n syntax check', () => {
  const r = spawnSync('/bin/bash', ['-n', watchdog], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `Syntax error: ${r.stderr}`);
});

test('e2e-flow-tests.sh passes bash -n syntax check', () => {
  const r = spawnSync('/bin/bash', ['-n', e2eScript], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `Syntax error: ${r.stderr}`);
});

// 3. --skip-watchdog flag wired in the test runner
test('e2e-flow-tests.sh declares SKIP_WATCHDOG variable', () => {
  const src = fs.readFileSync(e2eScript, 'utf8');
  assert.ok(src.includes('SKIP_WATCHDOG=false'), 'Missing SKIP_WATCHDOG=false default');
  assert.ok(src.includes('SKIP_WATCHDOG=true'), 'Missing --skip-watchdog handler');
});

test('e2e-flow-tests.sh calls infra-watchdog.sh', () => {
  const src = fs.readFileSync(e2eScript, 'utf8');
  assert.ok(src.includes('infra-watchdog.sh'), 'Watchdog not called from test runner');
});

test('e2e-flow-tests.sh guards watchdog call with SKIP_WATCHDOG check', () => {
  const src = fs.readFileSync(e2eScript, 'utf8');
  // The SKIP_WATCHDOG guard must appear before the watchdog call
  const skipIdx = src.indexOf('SKIP_WATCHDOG');
  const callIdx = src.indexOf('infra-watchdog.sh');
  assert.ok(skipIdx !== -1 && callIdx !== -1, 'SKIP_WATCHDOG or watchdog call missing');
  assert.ok(skipIdx < callIdx, 'SKIP_WATCHDOG guard appears after watchdog call');
});

// 4. watchdog --check-only exits cleanly (0 or 1, never crashes)
test('infra-watchdog.sh --check-only --quiet exits 0 or 1', () => {
  const r = spawnSync('/bin/bash', [watchdog, '--check-only', '--quiet']);
  assert.ok(r.status === 0 || r.status === 1,
    `Unexpected exit code ${r.status}: ${r.stderr?.toString()}`);
});

// 5. --check-only must not spawn new processes
test('infra-watchdog.sh --check-only does not start new processes', () => {
  const before = spawnSync('pgrep', ['-f', 'cloudflared tunnel run'], { encoding: 'utf8' });
  const beforePids = before.stdout.trim().split('\n').filter(Boolean);

  spawnSync('/bin/bash', [watchdog, '--check-only', '--quiet']);

  const after = spawnSync('pgrep', ['-f', 'cloudflared tunnel run'], { encoding: 'utf8' });
  const afterPids = after.stdout.trim().split('\n').filter(Boolean);

  assert.strictEqual(beforePids.length, afterPids.length,
    `cloudflared process count changed: ${beforePids.length} → ${afterPids.length}`);
});

// 6. Watchdog sets configurable defaults for all paths
test('infra-watchdog.sh exposes env-overridable config variables', () => {
  const src = fs.readFileSync(watchdog, 'utf8');
  assert.ok(src.includes('CLOUDFLARED_BIN='), 'CLOUDFLARED_BIN default missing');
  assert.ok(src.includes('API_SERVER_JS='), 'API_SERVER_JS default missing');
  assert.ok(src.includes('NODE_BIN='), 'NODE_BIN default missing');
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
