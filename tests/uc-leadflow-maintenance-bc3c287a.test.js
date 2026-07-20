'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const VERDICT_PATH = path.resolve(__dirname, '..', 'docs', 'orphan-branch-verdict-bc3c287a.json')
const EXPECTED_BRANCH = 'dev/bc3c287a-auto-activation-email-on-verification'
const ALLOWED_VERDICTS = ['needs-human-review', 'shippable-needs-task-pr', 'safe-to-delete', 'duplicate/superseded', 'already-merged']

// 1. File exists
assert.ok(fs.existsSync(VERDICT_PATH), `Verdict file missing: ${VERDICT_PATH}`)

const data = JSON.parse(fs.readFileSync(VERDICT_PATH, 'utf8'))

// 2. Branch identity
assert.strictEqual(data.branch, EXPECTED_BRANCH, 'branch field must match orphan branch name')

// 3. Verdict is a known valid value
assert.ok(
  ALLOWED_VERDICTS.includes(data.verdict),
  `verdict "${data.verdict}" not in allowed set: ${ALLOWED_VERDICTS.join(', ')}`
)

// 4. rootCauseAnalysis has all three required fields with non-trivial content
const rca = data.rootCauseAnalysis
assert.ok(rca && typeof rca === 'object', 'rootCauseAnalysis must be an object')
assert.ok(typeof rca.failurePoint === 'string' && rca.failurePoint.length > 30,
  'failurePoint must be a specific, non-trivial string')
assert.ok(typeof rca.why === 'string' && rca.why.length > 30,
  'why must explain the root cause with sufficient detail')
assert.ok(typeof rca.fix === 'string' && rca.fix.length > 10,
  'fix must describe the corrective action')

// 5. Evidence is structured
assert.ok(data.evidence && typeof data.evidence === 'object', 'evidence must be an object')
assert.ok(typeof data.evidence.commitsAheadOfMain === 'number',
  'evidence.commitsAheadOfMain must be a number')

// 6. Command provenance (at least 10 commands run)
assert.ok(Array.isArray(data.commandsRun) && data.commandsRun.length >= 10,
  `commandsRun must have >=10 entries (got ${Array.isArray(data.commandsRun) ? data.commandsRun.length : 'non-array'})`)

// 7. Recommendation is actionable
assert.ok(typeof data.recommendation === 'string' && data.recommendation.length > 20,
  'recommendation must be an actionable string')

// 8. Risk assessment present
assert.ok(data.risk && data.risk.level && data.risk.reason,
  'risk must have level and reason fields')

console.log('PASS: orphan-branch-verdict-bc3c287a.json is valid and complete')
console.log(`  verdict: ${data.verdict}`)
console.log(`  commitsAheadOfMain: ${data.evidence.commitsAheadOfMain}`)
console.log(`  commandsRun: ${data.commandsRun.length}`)
console.log(`  risk: ${data.risk.level}`)
