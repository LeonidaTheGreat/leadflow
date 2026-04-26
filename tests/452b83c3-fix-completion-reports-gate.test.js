'use strict'

const assert = require('assert')
const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '..')

function runGate(cwd = PROJECT_ROOT) {
  return execSync('npm run completion_reports', { cwd, encoding: 'utf-8', stdio: 'pipe' })
}

function makeReportFile(dir, index) {
  const filename = `COMPLETION-task-${index}-${Date.now()}.json`
  const filepath = path.join(dir, filename)
  fs.writeFileSync(filepath, JSON.stringify({ index }))
  const mtime = new Date(Date.now() - (600 - index) * 1000)
  fs.utimesSync(filepath, mtime, mtime)
}

// Test 1: npm script wires up and exits 0 on compliant state
console.log('Test 1: npm run completion_reports exits 0 on compliant project')
const output = runGate()
assert.ok(output.includes('completion reports (max 500)'), `expected gate output, got: ${output}`)
const match = output.match(/(\d+) completion reports/)
assert.ok(match, 'output must contain report count')
const count = parseInt(match[1], 10)
assert.ok(count <= 500, `count ${count} must be <= 500 after gate runs`)
console.log(`  OK — ${count} reports, gate passed`)

// Test 2: gate archives excess and exits 0 in isolated temp dir
console.log('Test 2: gate archives overflow and exits 0')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-e2e-'))
try {
  const reportsDir = path.join(tempRoot, 'completion-reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  const initialCount = 520
  for (let i = 0; i < initialCount; i++) {
    makeReportFile(reportsDir, i)
  }
  const { enforceCompletionReportCap } = require('../scripts/quality/completion-reports')
  const result = enforceCompletionReportCap(tempRoot)
  assert.strictEqual(result.archivedCount, 20, `expected 20 archived, got ${result.archivedCount}`)
  assert.strictEqual(result.remainingCount, 500, `expected 500 remaining, got ${result.remainingCount}`)
  const archiveDir = path.join(reportsDir, 'archive')
  const archivedFiles = fs.readdirSync(archiveDir).filter(f => f.startsWith('COMPLETION-')).length
  assert.strictEqual(archivedFiles, 20, `expected 20 in archive, got ${archivedFiles}`)
  console.log('  OK — archived 20, 500 remaining')
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}

// Test 3: gate does not disturb reports when under limit
console.log('Test 3: gate leaves sub-limit directories untouched')
const tempRoot2 = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-e2e2-'))
try {
  const reportsDir = path.join(tempRoot2, 'completion-reports')
  fs.mkdirSync(reportsDir, { recursive: true })
  for (let i = 0; i < 10; i++) {
    makeReportFile(reportsDir, i)
  }
  const { enforceCompletionReportCap } = require('../scripts/quality/completion-reports')
  const result = enforceCompletionReportCap(tempRoot2)
  assert.strictEqual(result.archivedCount, 0, `expected 0 archived, got ${result.archivedCount}`)
  assert.strictEqual(result.remainingCount, 10, `expected 10 remaining, got ${result.remainingCount}`)
  const archiveDir = path.join(reportsDir, 'archive')
  assert.ok(!fs.existsSync(archiveDir), 'archive dir should not be created when under limit')
  console.log('  OK — no archive dir created, 10 reports unchanged')
} finally {
  fs.rmSync(tempRoot2, { recursive: true, force: true })
}

console.log('\nAll tests passed.')
