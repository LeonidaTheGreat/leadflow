/**
 * QC E2E Test — Task 1b7f9196-f5c7-47f1-9587-00f57dd636f7
 * Fix: E2E flow test failures (1 critical)
 *
 * PR #1898 fixes test_reset_password_chain in scripts/e2e-flow-tests.sh.
 * Root cause: Vercel cold-start causes curl --max-time 10 to timeout before
 * the forgot-password token write completes, making the test fail non-deterministically.
 *
 * Fix: move agent_id lookup before retry loop (local PostgREST, no cold-start),
 * increase forgot-password timeout to 15s, retry up to 3 times with 3s sleep.
 *
 * Validates:
 * 1. Bash syntax is valid
 * 2. agent_id lookup precedes the retry loop (ordering fix)
 * 3. Retry loop runs exactly 3 attempts
 * 4. forgot-password timeout increased to 15s (was 10s)
 * 5. used=false filter still present in token query
 * 6. return 0 on success is inside the loop (early exit on first pass)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT = path.resolve(__dirname, '../../scripts/e2e-flow-tests.sh');

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  PASS: ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  FAIL: ${name} — ${reason}`);
  failed++;
}

// ── Helper: extract the test_reset_password_chain function body ───────────────
function extractFunctionBody(content, fnName) {
  const start = content.indexOf(`\n${fnName}()`);
  if (start === -1) return null;
  let depth = 0;
  let i = start;
  let inFn = false;
  while (i < content.length) {
    if (content[i] === '{') { depth++; inFn = true; }
    if (content[i] === '}') {
      depth--;
      if (inFn && depth === 0) return content.slice(start, i + 1);
    }
    i++;
  }
  return null;
}

// ── Test 1: Script exists ─────────────────────────────────────────────────────
{
  try {
    assert.ok(fs.existsSync(SCRIPT), `Script not found at ${SCRIPT}`);
    pass('scripts/e2e-flow-tests.sh exists');
  } catch (e) {
    fail('scripts/e2e-flow-tests.sh exists', e.message);
  }
}

// ── Test 2: Bash syntax check ─────────────────────────────────────────────────
{
  try {
    execSync(`bash -n "${SCRIPT}"`, { stdio: 'pipe' });
    pass('bash -n syntax check passes');
  } catch (e) {
    fail('bash -n syntax check passes', e.stderr?.toString() || e.message);
  }
}

const content = fs.readFileSync(SCRIPT, 'utf8');
const fnBody = extractFunctionBody(content, 'test_reset_password_chain');

// ── Test 3: function body extracted ──────────────────────────────────────────
{
  try {
    assert.ok(fnBody !== null, 'Could not extract test_reset_password_chain body');
    pass('test_reset_password_chain function found');
  } catch (e) {
    fail('test_reset_password_chain function found', e.message);
  }
}

if (fnBody) {
  // ── Test 4: agent_id lookup precedes the retry loop ───────────────────────
  {
    try {
      const agentIdPos = fnBody.indexOf('real_estate_agents?select=id');
      const retryLoopPos = fnBody.indexOf('for attempt in');
      assert.ok(agentIdPos !== -1, 'agent_id lookup for real_estate_agents not found');
      assert.ok(retryLoopPos !== -1, 'retry loop "for attempt in" not found');
      assert.ok(agentIdPos < retryLoopPos,
        `agent_id lookup (pos ${agentIdPos}) must come before retry loop (pos ${retryLoopPos})`);
      pass('agent_id lookup precedes retry loop');
    } catch (e) {
      fail('agent_id lookup precedes retry loop', e.message);
    }
  }

  // ── Test 5: retry loop attempts exactly 3 ────────────────────────────────
  {
    try {
      assert.ok(fnBody.includes('for attempt in 1 2 3'),
        'Retry loop must iterate over exactly "1 2 3"');
      pass('retry loop runs exactly 3 attempts');
    } catch (e) {
      fail('retry loop runs exactly 3 attempts', e.message);
    }
  }

  // ── Test 6: forgot-password timeout is 15s ────────────────────────────────
  {
    try {
      // Match the forgot-password curl call — it should use --max-time 15
      const forgotPassSection = fnBody.slice(fnBody.indexOf('for attempt in'));
      assert.ok(
        /--max-time 15.*api\/auth\/forgot-password|api\/auth\/forgot-password.*--max-time 15/.test(forgotPassSection) ||
        forgotPassSection.match(/--max-time 15/),
        'forgot-password curl call must use --max-time 15'
      );
      // Confirm 10s timeout is NOT used for the forgot-password call inside the loop
      const loopBody = forgotPassSection.slice(0, forgotPassSection.indexOf('password_reset_tokens'));
      assert.ok(!loopBody.includes('--max-time 10') || loopBody.indexOf('--max-time 15') < loopBody.indexOf('--max-time 10'),
        'forgot-password curl must use 15s timeout, not 10s');
      pass('forgot-password curl uses --max-time 15');
    } catch (e) {
      fail('forgot-password curl uses --max-time 15', e.message);
    }
  }

  // ── Test 7: used=false filter preserved in token query ────────────────────
  {
    try {
      assert.ok(fnBody.includes('used=eq.false'),
        'Token query must still filter used=eq.false');
      pass('used=eq.false filter preserved in token query');
    } catch (e) {
      fail('used=eq.false filter preserved in token query', e.message);
    }
  }

  // ── Test 8: return 0 on success is inside the loop ───────────────────────
  {
    try {
      const loopContent = fnBody.slice(fnBody.indexOf('for attempt in'));
      const returnZeroPos = loopContent.indexOf('&& return 0');
      const donePos = loopContent.indexOf('done');
      assert.ok(returnZeroPos !== -1, '"&& return 0" not found in retry loop');
      assert.ok(returnZeroPos < donePos,
        'return 0 must be inside loop body (before "done")');
      pass('return 0 on success is inside the retry loop');
    } catch (e) {
      fail('return 0 on success is inside the retry loop', e.message);
    }
  }

  // ── Test 9: return 1 final fallback after loop ────────────────────────────
  {
    try {
      const afterDone = fnBody.slice(fnBody.indexOf('\n  done') + 7);
      assert.ok(afterDone.includes('return 1'),
        'Must return 1 after exhausting all retry attempts');
      pass('return 1 after loop exhausted');
    } catch (e) {
      fail('return 1 after loop exhausted', e.message);
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
