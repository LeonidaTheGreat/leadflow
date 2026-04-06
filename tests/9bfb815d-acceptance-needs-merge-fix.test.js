/**
 * QC E2E Test: 9bfb815d - Skip acceptance checks for needs_merge UCs
 * Tests that the PRODUCTION heartbeat-executor.js has the two bug fixes:
 * 1. needs_merge/stuck UCs skip acceptance checks before execSync block
 * 2. findTaskByTitle or equivalent 4h cooldown dedup for done acceptance tasks
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const HEARTBEAT_PATH = path.join(process.env.HOME, '.openclaw/genome/core/heartbeat-executor.js')
const TASK_STORE_PATH = path.join(process.env.HOME, '.openclaw/genome/core/task-store.js')

let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`PASS: ${name}`)
    passed++
  } else {
    console.log(`FAIL: ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

// Read production files
const heartbeat = fs.readFileSync(HEARTBEAT_PATH, 'utf-8')
const taskStore = fs.readFileSync(TASK_STORE_PATH, 'utf-8')

// --- Bug 1: Skip acceptance checks for needs_merge/stuck UCs ---

// The sweepUCCompletions function fetches UCs with needs_merge/stuck status (line ~7153)
// but the acceptance check block (line ~7199) must NOT run for those statuses.
// A proper fix would be: if needs_merge or stuck, skip before reaching execSync.

// Check 1a: The query does include needs_merge/stuck in its IN clause
const fetchesNeedsMerge = heartbeat.includes("'needs_merge'") &&
  heartbeat.includes("in('implementation_status'")
check(
  'Bug1 - sweepUCCompletions query includes needs_merge',
  fetchesNeedsMerge
)

// Check 1b: There is an EXPLICIT early-continue guard for needs_merge OR stuck status
// before the acceptance_checks block runs (not just the merge gate which handles no-merged-PR).
// The acceptance block starts with "// Acceptance verification:" — look for a guard just before it.
const sweepStart = heartbeat.indexOf('async sweepUCCompletions()')
const acceptanceStart = heartbeat.indexOf('// Acceptance verification:', sweepStart)
const mergeGateEnd = heartbeat.indexOf('// Acceptance verification:', sweepStart)
const codeBeforeAcceptance = heartbeat.substring(sweepStart, mergeGateEnd)

const hasExplicitSkipForNeedsMerge =
  /implementation_status.*needs_merge.*continue|needs_merge.*implementation_status.*continue/.test(codeBeforeAcceptance) ||
  /if.*needs_merge.*stuck.*continue|if.*stuck.*needs_merge.*continue/.test(codeBeforeAcceptance) ||
  /skip.*acceptance.*needs_merge|needs_merge.*skip.*acceptance/.test(codeBeforeAcceptance)

check(
  'Bug1 - explicit skip guard for needs_merge/stuck before acceptance block',
  hasExplicitSkipForNeedsMerge,
  'Production code lacks explicit guard — needs_merge UCs could trigger acceptance checks if they somehow pass merge gate'
)

// Check 1c: The merge gate (no merged PR → continue) implicitly handles needs_merge when
// hasMergedPR is false. Verify this path exists.
const hasMergeGate = heartbeat.includes('hasMergedPR') && heartbeat.includes('continue')
check(
  'Bug1 - merge gate exists as fallback protection',
  hasMergeGate
)

// --- Bug 2: 4h cooldown dedup for done acceptance fix tasks ---

// findTaskByTitle excludes done/failed/cancelled tasks
const findTaskByTitleExcludesDone = taskStore.includes('"done","failed","cancelled"') ||
  taskStore.includes("'done','failed','cancelled'") ||
  taskStore.includes('done","failed","cancelled')
check(
  'Bug2 - findTaskByTitle excludes done tasks (blind to completed fix tasks)',
  findTaskByTitleExcludesDone
)

// Check 2b: Is there a findRecentlyDoneTask or equivalent 4h cooldown query added to production?
const hasFindRecentlyDone = taskStore.includes('findRecentlyDoneTask') ||
  taskStore.includes('findRecentlyDone')
check(
  'Bug2 - findRecentlyDoneTask method added to task-store.js',
  hasFindRecentlyDone,
  'Method not found — Bug 2 not fixed in production task-store.js'
)

// Check 2c: Is 4h cooldown used in the acceptance check creation path in heartbeat-executor?
const sweepFunc = heartbeat.substring(
  heartbeat.indexOf('async sweepUCCompletions()'),
  heartbeat.indexOf('async sweepUCCompletions()') + 5000
)
const has4hCooldown = /4 \* 60 \* 60|4h.*cooldown|cooldown.*4h|fourHoursAgo|findRecentlyDone/.test(sweepFunc)
check(
  'Bug2 - 4h cooldown applied in sweepUCCompletions acceptance path',
  has4hCooldown,
  'No 4h cooldown in sweepUCCompletions — done fix tasks will trigger duplicate creation'
)

// --- State-change dedup (existing mechanism) ---
// There IS a hasChanged() state-change detection, check it exists as partial mitigation
const hasStateChange = heartbeat.includes("hasChanged(`acceptance_") ||
  heartbeat.includes('hasChanged(`acceptance_')
check(
  'Existing dedup - state-change detection present (partial mitigation only)',
  hasStateChange
)

console.log(`\nResults: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
