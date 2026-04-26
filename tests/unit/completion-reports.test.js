'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const {
  enforceCompletionReportCap,
  MAX_COMPLETION_REPORTS
} = require('../../scripts/quality/completion-reports')

function makeReportFile(dir, index) {
  const filename = `COMPLETION-task-${index}.json`
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, JSON.stringify({ index }))

  const mtime = new Date(Date.now() - ((MAX_COMPLETION_REPORTS + 50 - index) * 1000))
  fs.utimesSync(filepath, mtime, mtime)
}

function listReports(dir) {
  return fs.readdirSync(dir).filter((name) => name.startsWith('COMPLETION-'))
}

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-reports-test-'))

  try {
    const reportsDir = path.join(tempRoot, 'completion-reports')
    fs.mkdirSync(reportsDir, { recursive: true })

    const initialCount = MAX_COMPLETION_REPORTS + 50
    for (let i = 0; i < initialCount; i += 1) {
      makeReportFile(reportsDir, i)
    }

    const result = enforceCompletionReportCap(tempRoot)

    assert.strictEqual(result.archivedCount, 50, 'should archive only over-limit reports')
    assert.strictEqual(result.remainingCount, MAX_COMPLETION_REPORTS, 'should keep exactly max reports')

    const currentCount = listReports(reportsDir).length
    assert.strictEqual(currentCount, MAX_COMPLETION_REPORTS, 'reports dir should be capped')

    const archiveDir = path.join(reportsDir, 'archive')
    const archivedCount = listReports(archiveDir).length
    assert.strictEqual(archivedCount, 50, 'archive should receive overflow reports')

    console.log('completion-reports.test.js passed')
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

run()
