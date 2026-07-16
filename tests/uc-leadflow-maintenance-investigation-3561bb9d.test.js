'use strict'
/**
 * E2E Test: Orphan branch investigation PR #1888 (task 3561bb9d)
 *
 * Verifies:
 * 1. Completion report has correct structure (rootCauseAnalysis with failurePoint/why/fix)
 * 2. Investigation claims are accurate against actual git state
 * 3. The orphan branch only touches LOG.md (no shippable product code)
 */

const assert = require('assert')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const REPO_ROOT = path.resolve(__dirname, '..')
const PR_BRANCH = 'origin/dev/3561bb9d-investigate-orphan-branch-dev-f015a494-f'
const ORPHAN_BRANCH = 'origin/dev/f015a494-fix-wcd-metrics-agent-quality'
const REPORT_PATH = 'completion-reports/COMPLETION-3561bb9d-1665-4cc3-b447-770267830e1b-20260716.json'

function git(cmd) {
  return execSync(`git -C "${REPO_ROOT}" ${cmd}`, { encoding: 'utf8' }).trim()
}

// Test 1: Completion report exists on PR branch
function testReportExists() {
  console.log('Test 1: Completion report exists on PR branch...')
  const content = git(`show ${PR_BRANCH}:${REPORT_PATH}`)
  assert.ok(content.length > 0, 'Completion report must be non-empty')
  console.log('  PASS: completion report found on PR branch')
  return JSON.parse(content)
}

// Test 2: rootCauseAnalysis has all required fields with specific content
function testRootCauseAnalysis(report) {
  console.log('Test 2: rootCauseAnalysis has failurePoint, why, fix with specific content...')
  const rca = report.rootCauseAnalysis
  assert.ok(rca, 'rootCauseAnalysis must be present')
  assert.ok(rca.failurePoint && rca.failurePoint.length > 20,
    'failurePoint must be specific (not a one-liner generic)')
  assert.ok(rca.why && rca.why.length > 40,
    'why must explain root cause in detail')
  assert.ok(rca.fix && rca.fix.length > 40,
    'fix must explain the resolution')
  // failurePoint must name the orphan branch specifically
  assert.ok(rca.failurePoint.includes('f015a494'),
    'failurePoint must name the orphan branch by task ID')
  console.log('  PASS: rootCauseAnalysis is specific and complete')
}

// Test 3: Investigation block has required fields
function testInvestigationBlock(report) {
  console.log('Test 3: Investigation block has required fields...')
  const inv = report.investigation
  assert.ok(inv, 'investigation block must be present')
  assert.ok(inv.orphanBranch, 'investigation.orphanBranch must be set')
  assert.ok(typeof inv.commitsAheadOfMain === 'number',
    'investigation.commitsAheadOfMain must be a number')
  assert.ok(inv.filesChanged && inv.filesChanged.length > 0,
    'investigation.filesChanged must list files')
  assert.ok(typeof inv.safeToDelete === 'boolean',
    'investigation.safeToDelete must be a boolean')
  console.log('  PASS: investigation block is well-formed')
}

// Test 4: Verify git fact — orphan branch has exactly 1 commit ahead of main
function testOrphanBranchCommitCount() {
  console.log('Test 4: Orphan branch has exactly 1 commit ahead of main (git verification)...')
  const output = git(`log origin/main..${ORPHAN_BRANCH} --oneline`)
  const commits = output.split('\n').filter(Boolean)
  assert.strictEqual(commits.length, 1,
    `Expected 1 commit ahead of main, got ${commits.length}: ${output}`)
  console.log(`  PASS: 1 commit ahead of main (${commits[0].substring(0, 7)})`)
}

// Test 5: Verify git fact — orphan branch only modifies LOG.md (no product code)
function testOrphanBranchFilesChanged() {
  console.log('Test 5: Orphan branch only modifies LOG.md, no product code...')
  const diffStat = git(`diff --name-only origin/main...${ORPHAN_BRANCH}`)
  const files = diffStat.split('\n').filter(Boolean)
  assert.ok(files.length > 0, 'Branch must have file changes')
  for (const f of files) {
    assert.ok(f === 'LOG.md', `Expected only LOG.md, found: ${f}`)
  }
  console.log(`  PASS: only LOG.md changed (${files.join(', ')})`)
}

// Test 6: Report recommendation matches git findings (safeToDelete=true for LOG.md-only branch)
function testRecommendationConsistency(report) {
  console.log('Test 6: Report recommendation is consistent with findings...')
  const inv = report.investigation
  // Branch touches only LOG.md → safe to delete (no product code)
  assert.strictEqual(inv.safeToDelete, true,
    'safeToDelete must be true — branch only modifies auto-generated LOG.md')
  assert.ok(inv.recommendation && inv.recommendation.toLowerCase().includes('delete'),
    'recommendation must include "DELETE" instruction')
  // codeChanges (sibling of contentAnalysis) must accurately say "None"
  assert.ok(inv.codeChanges &&
    inv.codeChanges.toLowerCase().includes('none'),
    'codeChanges must state "None"')
  console.log('  PASS: recommendation is consistent with git evidence')
}

function runTests() {
  console.log('\nOrphan branch investigation PR #1888 — E2E verification\n')

  // Fetch remote branches so git commands work
  try {
    git('fetch origin dev/3561bb9d-investigate-orphan-branch-dev-f015a494-f dev/f015a494-fix-wcd-metrics-agent-quality 2>&1')
  } catch (_) {
    // branches may already be fetched
  }

  const tests = []
  let report = null
  let passed = 0
  let failed = 0

  // Test 1 returns the parsed report for subsequent tests
  function run(fn, ...args) {
    try {
      const result = fn(...args)
      passed++
      return result
    } catch (err) {
      console.error(`  FAIL: ${fn.name}`)
      console.error(`    ${err.message}`)
      failed++
      return null
    }
  }

  report = run(testReportExists)
  if (report) {
    run(testRootCauseAnalysis, report)
    run(testInvestigationBlock, report)
  }
  run(testOrphanBranchCommitCount)
  run(testOrphanBranchFilesChanged)
  if (report) {
    run(testRecommendationConsistency, report)
  }

  const total = 6
  console.log(`\n${failed === 0 ? 'All tests passed' : 'Some tests FAILED'}: ${passed}/${total}\n`)
  return { passed, total, passRate: passed / total }
}

if (require.main === module) {
  const results = runTests()
  process.exit(results.passRate === 1.0 ? 0 : 1)
}

module.exports = { runTests }
