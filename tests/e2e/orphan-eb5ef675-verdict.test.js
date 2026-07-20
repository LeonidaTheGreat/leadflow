'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '../..')
const REPORT = path.join(
  repoRoot,
  'completion-reports',
  'COMPLETION-560bf45f-a596-4922-9e96-db22e8c6d99f-20260720T095504Z.json'
)

// File must exist
assert.ok(fs.existsSync(REPORT), `Completion report must exist at ${REPORT}`)

const data = JSON.parse(fs.readFileSync(REPORT, 'utf8'))

// Task identity
assert.strictEqual(data.taskId, '560bf45f-a596-4922-9e96-db22e8c6d99f', 'taskId must match')
assert.strictEqual(data.status, 'completed', 'status must be completed')

// Verdict is safe-to-delete (patch already on main)
assert.strictEqual(data.verdict, 'already-shipped-safe-delete', 'verdict must be already-shipped-safe-delete')

// rootCauseAnalysis completeness: must name a specific ref/commit, not be symptom-level
assert.ok(data.rootCauseAnalysis, 'rootCauseAnalysis must be present')
assert.ok(
  typeof data.rootCauseAnalysis.failurePoint === 'string' && data.rootCauseAnalysis.failurePoint.length > 20,
  'failurePoint must be a non-trivial string'
)
assert.ok(
  typeof data.rootCauseAnalysis.why === 'string' && /c317afb4|b6282957|#1506/.test(data.rootCauseAnalysis.why),
  'why must reference at least one specific commit SHA or PR number'
)
assert.ok(
  typeof data.rootCauseAnalysis.fix === 'string' && data.rootCauseAnalysis.fix.length > 10,
  'fix must be non-trivial'
)

// Evidence must include patch-equivalence proof
assert.ok(data.evidence, 'evidence must be present')
assert.ok(
  data.evidence.patchEquivalence && /git cherry/.test(data.evidence.patchEquivalence),
  'evidence.patchEquivalence must reference git cherry output'
)
assert.ok(
  data.evidence.mainContainment && /exited 0/.test(data.evidence.mainContainment),
  'evidence.mainContainment must confirm ancestor check passed'
)

// Tests must have passed
assert.ok(data.testResults, 'testResults must be present')
assert.strictEqual(data.testResults.passed, 9, 'testResults.passed must be 9')
assert.strictEqual(data.testResults.total, 9, 'testResults.total must be 9')
assert.strictEqual(data.testResults.passRate, 1.0, 'testResults.passRate must be 1.0')

// Risk level documented
assert.ok(data.risk && data.risk.level, 'risk.level must be present')

// Recommendation must be actionable
assert.ok(
  typeof data.recommendation === 'string' && data.recommendation.length > 20,
  'recommendation must be non-trivial'
)

// commandsRun must prove investigation depth (at least git cherry was run)
assert.ok(Array.isArray(data.commandsRun), 'commandsRun must be an array')
assert.ok(
  data.commandsRun.some(cmd => /git cherry/.test(cmd)),
  'commandsRun must include git cherry call'
)

console.log('PASS: orphan eb5ef675 completion report is valid and investigation is thorough')
