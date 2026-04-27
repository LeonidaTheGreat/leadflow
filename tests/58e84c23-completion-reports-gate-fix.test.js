'use strict'

/**
 * QC E2E test: Quality gate "completion_reports" stays under the 500-file hard limit.
 * PR #1347 — dev/bf9448cd-fix-quality-gate-completion-reports-fail
 */

const assert = require('assert')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const COMPLETION_DIR = path.join(ROOT, 'completion-reports')

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

describe('completion_reports quality gate (PR #1347)', () => {
  test('npm run completion_reports exits 0', () => {
    let exitCode = 0
    try {
      run('npm run completion_reports')
    } catch (err) {
      exitCode = err.status || 1
    }
    assert.strictEqual(exitCode, 0, 'completion_reports gate must pass (exit 0)')
  })

  test('completion-reports count is under 500', () => {
    const files = fs.existsSync(COMPLETION_DIR)
      ? fs.readdirSync(COMPLETION_DIR).filter(f => f.startsWith('COMPLETION-'))
      : []
    assert.ok(files.length < 500, `Expected <500 completion reports, got ${files.length}`)
  })

  test('pruned tracked completion reports are no longer git-tracked', () => {
    const tracked = run('git ls-files completion-reports/').trim().split('\n').filter(Boolean)
    const stale = [
      'completion-reports/COMPLETION-11667dc7-8058-4753-a02e-d422b88f0162-20260425.json',
      'completion-reports/COMPLETION-da237aa5-69ea-4a20-b5f6-c7232b172aeb-20260426T060613Z.json',
    ]
    for (const f of stale) {
      assert.ok(!tracked.includes(f), `${f} must not be git-tracked`)
    }
  })

  test('retention script module exports are importable', () => {
    const { enforceCompletionReportRetention, listCompletionReportFiles, DEFAULT_MAX_REPORTS } =
      require('../scripts/tasks/completion-reports-retention')
    assert.strictEqual(typeof enforceCompletionReportRetention, 'function')
    assert.strictEqual(typeof listCompletionReportFiles, 'function')
    assert.strictEqual(DEFAULT_MAX_REPORTS, 500)
  })
})
