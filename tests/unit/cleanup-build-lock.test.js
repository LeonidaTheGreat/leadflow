'use strict';

/**
 * Tests for product/lead-response/dashboard/scripts/cleanup-next-build-lock.js
 * Verifies orphan-process detection and stale lock removal logic.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCK_PATH = path.resolve(
  __dirname, '../../product/lead-response/dashboard/.next/lock'
);
const LOCK_DIR = path.dirname(LOCK_PATH);
const SCRIPT = path.resolve(
  __dirname, '../../product/lead-response/dashboard/scripts/cleanup-next-build-lock.js'
);

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function createLock(ageMs = 0) {
  if (!fs.existsSync(LOCK_DIR)) fs.mkdirSync(LOCK_DIR, { recursive: true });
  fs.writeFileSync(LOCK_PATH, '');
  if (ageMs > 0) {
    const oldTime = new Date(Date.now() - ageMs);
    fs.utimesSync(LOCK_PATH, oldTime, oldTime);
  }
}

function lockExists() {
  return fs.existsSync(LOCK_PATH);
}

function runScript() {
  execSync(`node "${SCRIPT}"`, { stdio: 'pipe' });
}

function run() {
  console.log('\n=== unit: cleanup-next-build-lock ===\n');

  // Baseline: script runs without error when no lock exists
  check('script is a no-op when no lock file exists', () => {
    if (lockExists()) fs.rmSync(LOCK_PATH);
    runScript();
    assert.strictEqual(lockExists(), false);
  });

  // Core case: stale lock (older than STALE_AGE_MS = 10 min) is always removed
  check('removes lock file older than 10 minutes unconditionally', () => {
    createLock(11 * 60 * 1000); // 11 min old
    assert.strictEqual(lockExists(), true);
    runScript();
    assert.strictEqual(lockExists(), false, 'stale lock should be removed');
  });

  // Core case: fresh lock with no build running is removed
  check('removes fresh lock when no next build process is running', () => {
    // Ensure no next build is running (test environment)
    createLock(0); // fresh
    runScript();
    assert.strictEqual(lockExists(), false, 'orphaned fresh lock should be removed');
  });

  // Cleanup: ensure no lock left behind by this test
  check('cleanup: no stale lock file left after tests', () => {
    if (lockExists()) fs.rmSync(LOCK_PATH);
    assert.strictEqual(lockExists(), false);
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run();
