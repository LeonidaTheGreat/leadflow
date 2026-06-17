/**
 * Regression test: sweepUCCompletions must not include blocked_human in its
 * UC status query. blocked_human is a terminal state requiring human action
 * and must never be overwritten by automated sweeps.
 *
 * Bug: Including blocked_human caused an infinite oscillation:
 *   blocked_human → needs_merge → Merge: task → blocked_human → repeat
 * feat-revenue-funnel-visibility accumulated 399 cancelled Merge: tasks
 * from this loop before the fix (genome commit 9b454a1).
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const EXECUTION_LOOP_PATH = path.join(
  require('os').homedir(),
  'projects/genome/core/loops/execution-loop.js'
)

if (!fs.existsSync(EXECUTION_LOOP_PATH)) {
  console.log('SKIP: genome not present at', EXECUTION_LOOP_PATH)
  process.exit(0)
}

const src = fs.readFileSync(EXECUTION_LOOP_PATH, 'utf8')

const sweepStart = src.indexOf('async sweepUCCompletions()')
assert.ok(sweepStart > -1, 'sweepUCCompletions function not found in execution-loop.js')

const sweepSnippet = src.slice(sweepStart, sweepStart + 2000)
const inQueryMatch = sweepSnippet.match(/\.in\('implementation_status',\s*\[([^\]]+)\]/)
assert.ok(inQueryMatch, '.in() implementation_status query not found in sweepUCCompletions')

const statusList = inQueryMatch[1]
assert.ok(
  !statusList.includes('blocked_human'),
  `sweepUCCompletions must not include blocked_human in status query. Found: ${statusList}`
)

console.log('PASS: sweepUCCompletions does not include blocked_human in status query')
console.log('      Status list:', statusList.trim())
