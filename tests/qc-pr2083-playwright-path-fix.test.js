'use strict'
/**
 * QC E2E test for PR #2083
 * Verifies:
 * 1. Genome test paths resolve to real files (the path fix in genome-replenish-queue-ready-fix.test.js)
 * 2. playwright-browser-setup.js isLocalServerReachable is a proper Promise-returning function
 * 3. The investigation report for bc26753b is valid JSON with required fields
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const HOME = process.env.HOME

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n🧪 PR #2083 QC verification\n')

// 1. Genome path fix — both paths in the fixed unit test must point to real files
test('execution-loop.js exists at projects/genome path', () => {
  const p = path.join(HOME, 'projects/genome/core/loops/execution-loop.js')
  assert.ok(fs.existsSync(p), `Missing: ${p}`)
})

test('queue-replenisher.js exists at projects/genome path', () => {
  const p = path.join(HOME, 'projects/genome/core/loops/queue-replenisher.js')
  assert.ok(fs.existsSync(p), `Missing: ${p}`)
})

test('old .openclaw/genome/core/loops/ path does not exist (path was wrong)', () => {
  const oldPath = path.join(HOME, '.openclaw/genome/core/loops')
  assert.ok(!fs.existsSync(oldPath), `Old path still exists — path fix may be premature: ${oldPath}`)
})

// 2. playwright-browser-setup.js — isLocalServerReachable function is present and async
test('playwright-browser-setup.js has isLocalServerReachable function', () => {
  const setupPath = path.join(REPO_ROOT, 'scripts/playwright-browser-setup.js')
  const content = fs.readFileSync(setupPath, 'utf-8')
  assert.ok(content.includes('isLocalServerReachable'), 'isLocalServerReachable not found')
  assert.ok(content.includes('new Promise'), 'should return a Promise')
  assert.ok(content.includes('PLAYWRIGHT_BASE_URL'), 'should set PLAYWRIGHT_BASE_URL')
})

test('playwright-browser-setup.js falls back to Vercel URL when local unavailable', () => {
  const setupPath = path.join(REPO_ROOT, 'scripts/playwright-browser-setup.js')
  const content = fs.readFileSync(setupPath, 'utf-8')
  assert.ok(content.includes('leadflow-ai-five.vercel.app'), 'Vercel fallback URL missing')
  assert.ok(content.includes('localhost:3030'), 'local port 3030 not referenced')
})

// 3. Investigation report for this PR's target branch is valid
test('bc26753b investigation report has required fields', () => {
  const reportPath = path.join(REPO_ROOT, 'docs/orphan-branch-verdict-bc26753b.json')
  assert.ok(fs.existsSync(reportPath), 'verdict file missing')
  const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  assert.ok(data.verdict, 'verdict field missing')
  assert.ok(data.summary && data.summary.length > 20, 'summary too short or missing')
  assert.ok(data.evidence && typeof data.evidence === 'object', 'evidence field missing')
  const validVerdicts = ['already-shipped-safe-delete', 'shippable-needs-task-pr', 'duplicate/superseded', 'needs-review', 'stale-safe-delete']
  assert.ok(validVerdicts.includes(data.verdict), `unexpected verdict: ${data.verdict}`)
})

console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
console.log('\nPASS: PR #2083 QC checks complete\n')
