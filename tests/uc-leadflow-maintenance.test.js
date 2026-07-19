#!/usr/bin/env node
'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const expectedBranch = 'dev/2aee86f1-dev-fix-nps-cron-pipeline-broken-cron-se'
const reportFiles = [
  'docs/orphan-branch-dec4ee35-verdict.json',
  'docs/reports/orphan-branch-2aee86f1-nps-cron-investigation.json',
  'docs/reports/orphan-branch-2aee86f1-verdict.json',
  'docs/reports/orphan-branch-investigation-2aee86f1.json'
]

function readReport(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  assert.ok(fs.existsSync(absolutePath), relativePath + ' should exist')
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

function normalizeRecommendation(report) {
  return String(report.recommendation || report.recommendationDetail || '').toLowerCase()
}

const reports = reportFiles.map((file) => ({ file, data: readReport(file) }))

for (const { file, data } of reports) {
  const branch = data.branch || data.investigatedBranch
  assert.strictEqual(branch, expectedBranch, file + ' should investigate the orphan branch')
  assert.strictEqual(data.verdict, 'duplicate/superseded', file + ' should mark the branch superseded')
  assert.match(normalizeRecommendation(data), /safe.*delete/, file + ' should recommend safe delete')
}

const supersedingPrs = new Set()
for (const { data } of reports) {
  const evidence = data.evidence || {}
  const candidates = [
    ...(evidence.supersedingMerges || []),
    ...(evidence.supersedingMergedWork || []),
    ...(evidence.supersededBy || [])
  ]

  for (const candidate of candidates) {
    if (candidate.pr) supersedingPrs.add(Number(candidate.pr))
  }
}

assert.ok(supersedingPrs.has(1392), 'reports should cite PR #1392 as superseding NPS eligibility work')
assert.ok(supersedingPrs.has(1546), 'reports should cite PR #1546 as superseding NPS backfill work')

const verdictReport = reports.find(({ file }) => file.endsWith('orphan-branch-2aee86f1-verdict.json')).data
assert.strictEqual(verdictReport.evidence.priorPR.state, 'CLOSED', 'prior PR should be closed')
assert.strictEqual(verdictReport.evidence.priorPR.mergedAt, null, 'prior PR should not be merged')

console.log('PASS uc-leadflow-maintenance orphan branch reports are consistent')
