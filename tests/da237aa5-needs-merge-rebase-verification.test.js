#!/usr/bin/env node
'use strict';

/**
 * E2E test: Verifies the rebase work for the 3 needs-merge branches (task da237aa5)
 * Tests:
 * 1. All 3 branches exist on remote
 * 2. Each branch is rebased onto origin/main (no behind commits)
 * 3. No unresolved conflict markers left in any file on any branch
 * 4. Each branch merges cleanly into main (no conflicts)
 */

const { execSync } = require('child_process');
const assert = require('assert');

const REPO = '/Users/clawdbot/projects/leadflow';

const BRANCHES = [
  'dev/b883cbeb-improve-uc-no-tasks-uc-marketing-campaig',
  'dev/d9da03d7-dev-feat-revenue-funnel-visibility-reven',
  'feat-subscription-funnel-tracking',
];

function exec(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).trim();
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 Needs-Merge Rebase Verification (task da237aa5)\n');

// 1. Verify all branches exist on remote
console.log('--- Branch Existence ---');
for (const branch of BRANCHES) {
  test(`Branch exists on remote: ${branch}`, () => {
    const result = exec(`git ls-remote --heads origin ${branch}`);
    assert.ok(result.length > 0, `Branch not found on remote: ${branch}`);
  });
}

// 2. Verify each branch is rebased onto main (no behind commits)
console.log('\n--- Rebase Freshness (0 commits behind main) ---');
exec('git fetch origin --quiet');
for (const branch of BRANCHES) {
  test(`No commits behind main: ${branch}`, () => {
    const behind = exec(`git rev-list --count origin/${branch}..origin/main`);
    assert.strictEqual(behind, '0', `Branch is ${behind} commit(s) behind main — needs rebase`);
  });
}

// 3. Check for unresolved conflict markers
console.log('\n--- No Conflict Markers ---');
for (const branch of BRANCHES) {
  test(`No conflict markers in ${branch}`, () => {
    let conflictFiles;
    try {
      conflictFiles = exec(
        `git diff origin/main...origin/${branch} --name-only`
      ).split('\n').filter(Boolean);
    } catch {
      conflictFiles = [];
    }
    for (const file of conflictFiles) {
      let content;
      try {
        content = exec(`git show origin/${branch}:${file}`);
      } catch {
        continue; // file may be deleted
      }
      const hasMarker = /<<<<<<<|=======|>>>>>>>/.test(content);
      assert.ok(
        !hasMarker,
        `Unresolved conflict markers in ${file} on branch ${branch}`
      );
    }
  });
}

// 4. Verify clean merge into main (no conflicts via merge-tree)
console.log('\n--- Clean Merge into Main ---');
for (const branch of BRANCHES) {
  test(`Clean merge into main: ${branch}`, () => {
    const mergeBase = exec(`git merge-base origin/main origin/${branch}`);
    const mergeTree = exec(
      `git merge-tree ${mergeBase} origin/main origin/${branch}`
    );
    const hasConflict = /<<<<<<</.test(mergeTree);
    assert.ok(!hasConflict, `Merge conflict detected when merging ${branch} into main`);
  });
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
