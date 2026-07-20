'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const setupPath = path.join(repoRoot, 'scripts/playwright-browser-setup.js')
const unitTestPath = path.join(repoRoot, 'tests/unit/genome-replenish-queue-ready-fix.test.js')

// 1. playwright-browser-setup.js exports a function
const globalSetup = require(setupPath)
assert.strictEqual(typeof globalSetup, 'function', 'globalSetup must be a function')

// 2. URL constants are present and well-formed
const src = fs.readFileSync(setupPath, 'utf8')
assert.ok(src.includes("'http://localhost:3030'"), 'LOCAL_URL must be http://localhost:3030')
assert.ok(src.includes("'https://leadflow-ai-five.vercel.app'"), 'VERCEL_URL must reference Vercel deployment')

// 3. env-guard logic: PLAYWRIGHT_BASE_URL is respected when pre-set
assert.ok(
  src.includes("if (!process.env.PLAYWRIGHT_BASE_URL)"),
  'Must skip URL selection when PLAYWRIGHT_BASE_URL already set'
)

// 4. genome unit test path is ~/projects/genome (not ~/.openclaw/genome)
const unitSrc = fs.readFileSync(unitTestPath, 'utf8')
assert.ok(
  unitSrc.includes("projects/genome/core/loops/execution-loop.js"),
  'Unit test must reference ~/projects/genome path'
)
assert.ok(
  !unitSrc.includes(".openclaw/genome/core/loops/execution-loop.js"),
  'Unit test must NOT reference stale ~/.openclaw/genome path'
)

// 5. Completion report for the investigation task exists and is valid JSON
const reportGlob = fs.readdirSync(path.join(repoRoot, 'completion-reports'))
  .filter(f => f.includes('8cc21210') && f.endsWith('.json'))
assert.strictEqual(reportGlob.length, 1, 'Exactly one completion report for task 8cc21210 must exist')
const report = JSON.parse(fs.readFileSync(path.join(repoRoot, 'completion-reports', reportGlob[0]), 'utf8'))
assert.strictEqual(report.taskId, '8cc21210-3594-4a51-8ce0-428253abe82a', 'Report must match task ID')
assert.ok(['completed', 'failed'].includes(report.status), 'Report status must be completed or failed')
assert.ok(report.rootCauseAnalysis && report.rootCauseAnalysis.failurePoint, 'Report must have rootCauseAnalysis.failurePoint')
assert.ok(
  report.rootCauseAnalysis.failurePoint.length > 20,
  'rootCauseAnalysis.failurePoint must be specific (>20 chars)'
)
assert.ok(
  typeof report.recommendation === 'string' && report.recommendation.length > 20,
  'Report must include an actionable recommendation'
)

console.log('PASS: QC-2049 playwright-setup and investigation report checks passed')
