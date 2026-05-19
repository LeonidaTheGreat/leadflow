'use strict';
/**
 * Regression guard for task b28633c4:
 * sweepUCCompletions must resolve needs_merge (and blocked_human) UCs
 * when a merged PR exists, even if the UC has exhausted retry attempts.
 *
 * Root cause: retryNeedsMergeUCs called _checkUCExhausted BEFORE checking
 * for a merged PR. A UC with pmInvestigationCount >= 1 would be marked
 * blocked_human (and the loop would continue), so the merged-PR check at
 * line 583+ was never reached. Example: uc-revenue-aha-moment had PR 991
 * merged but stayed in needs_merge because _checkUCExhausted short-circuited.
 *
 * Fix 1 (rescue-strategies.js): merged PR check moved BEFORE _checkUCExhausted.
 * Fix 2 (execution-loop.js): 'blocked_human' added to sweepUCCompletions filter.
 *
 * These tests verify the genome source files reflect both fixes.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const GENOME_DIR = path.join(process.env.HOME, '.openclaw/genome/core/loops');
const RESCUE_FILE = path.join(GENOME_DIR, 'rescue-strategies.js');
const EXEC_LOOP_FILE = path.join(GENOME_DIR, 'execution-loop.js');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n=== b28633c4: needs_merge merged-PR-before-exhaustion regression guard ===\n');

const rescueCode = fs.existsSync(RESCUE_FILE) ? fs.readFileSync(RESCUE_FILE, 'utf8') : '';
const execLoopCode = fs.existsSync(EXEC_LOOP_FILE) ? fs.readFileSync(EXEC_LOOP_FILE, 'utf8') : '';

// 1. Both files exist
check('rescue-strategies.js exists in genome', () => {
  assert(fs.existsSync(RESCUE_FILE), `File not found: ${RESCUE_FILE}`);
});

check('execution-loop.js exists in genome', () => {
  assert(fs.existsSync(EXEC_LOOP_FILE), `File not found: ${EXEC_LOOP_FILE}`);
});

// 2. Fix 1: In retryNeedsMergeUCs, getCodeReviews(status:merged) appears
//    BEFORE _checkUCExhausted in the source. We verify this by checking the
//    character position of each pattern in the retryNeedsMergeUCs function block.
check('rescue-strategies.js: merged PR check appears before _checkUCExhausted in retryNeedsMergeUCs', () => {
  const retryFnStart = rescueCode.indexOf('RescueCoordinator.prototype.retryNeedsMergeUCs');
  assert(retryFnStart !== -1, 'retryNeedsMergeUCs function not found in rescue-strategies.js');

  // Find both key patterns within the function body (search from function start)
  const fnBody = rescueCode.slice(retryFnStart);

  const mergedCheckPos = fnBody.indexOf("status: 'merged'");
  // Use the actual function call pattern (with await), not a comment mention
  const exhaustionPos = fnBody.indexOf('await this.executor._checkUCExhausted');

  assert(mergedCheckPos !== -1, "merged PR check (status: 'merged') not found in retryNeedsMergeUCs");
  assert(exhaustionPos !== -1, '_checkUCExhausted actual call not found in retryNeedsMergeUCs');

  assert(
    mergedCheckPos < exhaustionPos,
    `merged PR check (pos ${mergedCheckPos}) must appear BEFORE _checkUCExhausted call (pos ${exhaustionPos}) in retryNeedsMergeUCs`
  );
});

// 3. Fix 1: The comment explaining the ordering is present (documents intent for future maintainers)
check('rescue-strategies.js: ordering comment documents why merged PR check runs first', () => {
  assert(
    rescueCode.includes('BEFORE exhaustion check') ||
    rescueCode.includes('before _checkUCExhausted') ||
    rescueCode.includes('MUST run before'),
    'Missing comment explaining that merged PR check must run before _checkUCExhausted'
  );
});

// 4. Fix 2: 'blocked_human' is included in the sweepUCCompletions status filter
check("execution-loop.js: sweepUCCompletions includes 'blocked_human' in status filter", () => {
  // Find the sweepUCCompletions function
  const sweepStart = execLoopCode.indexOf('async sweepUCCompletions()');
  assert(sweepStart !== -1, 'sweepUCCompletions function not found in execution-loop.js');

  const sweepBody = execLoopCode.slice(sweepStart, sweepStart + 2000);
  assert(
    sweepBody.includes("'blocked_human'"),
    "sweepUCCompletions status filter must include 'blocked_human'"
  );
});

// 5. Fix 2: The existing statuses are still all present in the sweep filter
check('execution-loop.js: sweepUCCompletions still includes needs_merge in filter', () => {
  const sweepStart = execLoopCode.indexOf('async sweepUCCompletions()');
  const sweepBody = execLoopCode.slice(sweepStart, sweepStart + 2000);
  assert(sweepBody.includes("'needs_merge'"), "sweepUCCompletions filter must still include 'needs_merge'");
});

check('execution-loop.js: sweepUCCompletions still includes stuck in filter', () => {
  const sweepStart = execLoopCode.indexOf('async sweepUCCompletions()');
  const sweepBody = execLoopCode.slice(sweepStart, sweepStart + 2000);
  assert(sweepBody.includes("'stuck'"), "sweepUCCompletions filter must still include 'stuck'");
});

// Summary
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}

console.log('Both fixes confirmed:');
console.log('  1. retryNeedsMergeUCs: merged PR check runs before _checkUCExhausted');
console.log('     → A UC with many retry attempts + merged PR is marked complete, not blocked_human');
console.log('  2. sweepUCCompletions: blocked_human UCs are now included in the sweep filter');
console.log('     → Defense-in-depth: UCs that reach blocked_human are still swept to complete');
console.log('        if all workflow steps are done and a PR is merged');
