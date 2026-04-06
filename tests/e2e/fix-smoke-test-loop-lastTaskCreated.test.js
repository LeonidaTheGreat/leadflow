/**
 * E2E Regression Test: fix-smoke-test-loop-lastTaskCreated
 *
 * Root cause: Two code paths in heartbeat-executor.js (QC→Dev escalation ~line 2849
 * and Dev→Dev retry ~line 2781) failed to write lastTaskCreated after creating
 * dev fix tasks. Without this update the 2-hour cooldown never fired for dev tasks
 * and the same fix task was recreated every heartbeat cycle.
 *
 * Fix: Both paths now set state.results[failure.id].lastTaskCreated = new Date().toISOString()
 * immediately after creating the dev task and calling smokeTests.saveState(state).
 *
 * PRD: docs/prd/PRD-SMOKE-TEST-LOOP-FIX.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HEARTBEAT_PATH = path.join(process.env.HOME, '.openclaw/genome/core/heartbeat-executor.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function runAll() {
  console.log('\n=== E2E Regression: smoke-test-loop lastTaskCreated fix ===\n');

  // Verify genome file exists
  test('heartbeat-executor.js exists at expected genome path', () => {
    assert.ok(fs.existsSync(HEARTBEAT_PATH), `Missing: ${HEARTBEAT_PATH}`);
  });

  const src = fs.readFileSync(HEARTBEAT_PATH, 'utf8');
  const lines = src.split('\n');

  // --- AC-1: QC→Dev escalation path sets lastTaskCreated ---
  console.log('AC-1: QC→Dev escalation path (devRetries: 1) sets lastTaskCreated');

  test('QC→Dev escalation block contains devRetries: 1', () => {
    assert.ok(src.includes('devRetries: 1'), 'Expected devRetries: 1 assignment in escalation path');
  });

  test('lastTaskCreated set in the same state block as devRetries: 1', () => {
    // Find the state assignment block containing devRetries: 1
    // and verify lastTaskCreated appears within the next 5 lines
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('devRetries: 1')) {
        const window = lines.slice(i, i + 6).join('\n');
        if (window.includes('lastTaskCreated')) {
          found = true;
          break;
        }
      }
    }
    assert.ok(found, 'lastTaskCreated must appear within 5 lines of devRetries: 1 (QC→Dev path)');
  });

  // --- AC-2: Dev→Dev retry path sets lastTaskCreated ---
  console.log('\nAC-2: Dev→Dev retry path (devRetries: retryCount) sets lastTaskCreated');

  test('Dev→Dev retry block contains devRetries: retryCount + 1', () => {
    assert.ok(
      src.includes('devRetries: retryCount + 1'),
      'Expected devRetries: retryCount + 1 assignment in retry path'
    );
  });

  test('lastTaskCreated set in the same state block as devRetries: retryCount + 1', () => {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('devRetries: retryCount + 1')) {
        const window = lines.slice(i, i + 8).join('\n');
        if (window.includes('lastTaskCreated')) {
          found = true;
          break;
        }
      }
    }
    assert.ok(found, 'lastTaskCreated must appear within 8 lines of devRetries: retryCount + 1 (Dev→Dev path)');
  });

  // --- AC-3: saveState called after both state assignments ---
  console.log('\nAC-3: smokeTests.saveState() called after lastTaskCreated is set');

  test('saveState() called after QC→Dev escalation state assignment', () => {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('devRetries: 1') && lines[i].includes('lastTaskCreated')) {
        // single-line form: check next few lines for saveState
        const window = lines.slice(i, i + 4).join('\n');
        if (window.includes('saveState')) { found = true; break; }
      }
      if (lines[i].includes('devRetries: 1')) {
        // multi-line object: look for closing brace + saveState within 8 lines
        const window = lines.slice(i, i + 8).join('\n');
        if (window.includes('lastTaskCreated') && window.includes('saveState')) {
          found = true;
          break;
        }
      }
    }
    assert.ok(found, 'smokeTests.saveState() must be called after setting lastTaskCreated in QC→Dev path');
  });

  test('saveState() called after Dev→Dev retry state assignment', () => {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('devRetries: retryCount + 1')) {
        const window = lines.slice(i, i + 10).join('\n');
        if (window.includes('lastTaskCreated') && window.includes('saveState')) {
          found = true;
          break;
        }
      }
    }
    assert.ok(found, 'smokeTests.saveState() must be called after setting lastTaskCreated in Dev→Dev path');
  });

  // --- AC-4: Initial QC failure path still sets lastTaskCreated (unchanged) ---
  console.log('\nAC-4: Initial QC failure path unchanged — still sets lastTaskCreated');

  test('At least two distinct lastTaskCreated assignments exist in smoke handler', () => {
    const matches = (src.match(/lastTaskCreated:\s*new Date\(\)\.toISOString\(\)/g) || []);
    assert.ok(
      matches.length >= 2,
      `Expected at least 2 lastTaskCreated assignments, found ${matches.length}`
    );
  });

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

runAll();
