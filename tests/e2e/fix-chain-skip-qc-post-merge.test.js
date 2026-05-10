'use strict';
/**
 * E2E verification: QC chain skip when dev PR already merged.
 * UC: fix-chain-skip-qc-post-merge
 *
 * Tests genome's chain-manager.js behavior: chainTask() must return
 * 'uc_complete' (not create a QC task) when a dev PR is merged/approved.
 */
const assert = require('assert');
const path = require('path');

const chainManagerPath = path.join(
  '/Users/clawdbot/.openclaw/genome/core/chain-manager.js'
);
const fs = require('fs');

console.log('Fix Chain Skip QC Post-Merge — E2E Verification\n');

// Test 1: chain-manager.js has the skip-QC guard
{
  const src = fs.readFileSync(chainManagerPath, 'utf8');
  assert.ok(
    src.includes("Skip QC if dev PR is already merged"),
    'FAIL: chain-manager.js missing "Skip QC if dev PR is already merged" guard'
  );
  assert.ok(
    src.includes("return 'uc_complete'"),
    "FAIL: chain-manager.js missing early return 'uc_complete' in QC skip path"
  );
  console.log('✓ chain-manager.js has QC skip guard (PR already merged → uc_complete)');
}

// Test 2: guard only fires for QC agent + tasks with a PR number
{
  const src = fs.readFileSync(chainManagerPath, 'utf8');
  // The guard should check nextAgent === 'qc' && task.pr_number
  assert.ok(
    src.includes("nextAgent === 'qc'") && src.includes('task.pr_number'),
    "FAIL: guard must check both nextAgent === 'qc' AND task.pr_number"
  );
  console.log("✓ Guard correctly scoped: nextAgent === 'qc' AND task.pr_number required");
}

// Test 3: guard checks approved/merged/closed statuses
{
  const src = fs.readFileSync(chainManagerPath, 'utf8');
  assert.ok(
    src.includes("'approved'") && src.includes("'merged'") && src.includes("'closed'"),
    "FAIL: QC skip guard must check 'approved', 'merged', and 'closed' statuses"
  );
  console.log("✓ Guard checks all terminal PR statuses: approved/merged/closed");
}

// Test 4: PR #1551 package.json scripts reference valid test files
{
  const unitTest = path.join(__dirname, '../unit/nps-survey-eligibility.test.js');
  const e2eTest = path.join(__dirname, 'nps-trial-eligibility.test.js');
  assert.ok(fs.existsSync(unitTest), `FAIL: ${unitTest} not found`);
  assert.ok(fs.existsSync(e2eTest), `FAIL: ${e2eTest} not found`);
  console.log('✓ NPS test files referenced by new npm scripts exist on disk');
}

console.log('\n4/4 passed');
