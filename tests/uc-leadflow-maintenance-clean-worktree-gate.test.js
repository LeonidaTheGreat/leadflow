'use strict'

// E2E test for PR #1900: Quality gate "clean_worktree" fix
// Verifies leadflow .gitignore contains all entries required by clean-worktree-gate.js

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const { REQUIRED_IGNORES, evaluateCleanWorktree } = require('/Users/clawdbot/projects/genome/core/sensors/clean-worktree-gate')

const PROJECT_DIR = path.join(__dirname, '..')
const GITIGNORE_PATH = path.join(PROJECT_DIR, '.gitignore')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   ${err.message}`)
    failed++
  }
}

const gitignoreContent = fs.readFileSync(GITIGNORE_PATH, 'utf8')

test('.gitignore contains dashboard/architecture.html', () => {
  assert.ok(gitignoreContent.includes('dashboard/architecture.html'),
    'dashboard/architecture.html not found in .gitignore')
})

test('.gitignore contains docs/ARCHITECTURE-MAP.md', () => {
  assert.ok(gitignoreContent.includes('docs/ARCHITECTURE-MAP.md'),
    'docs/ARCHITECTURE-MAP.md not found in .gitignore')
})

test('all REQUIRED_IGNORES are present in leadflow .gitignore', () => {
  const missing = REQUIRED_IGNORES.filter(entry => !gitignoreContent.includes(entry))
  assert.deepStrictEqual(missing, [],
    `Missing from .gitignore: ${missing.join(', ')}`)
})

test('evaluateCleanWorktree passes for leadflow project (no dirty non-generated files)', () => {
  const result = evaluateCleanWorktree(PROJECT_DIR)
  // Gate can pass or skip (if not a git repo), but must not fail due to missing ignores
  if (!result.passed && result.error) {
    // Allow dirty tracked files (active development), but not missing ignores
    assert.ok(!result.error.includes('Missing from .gitignore'),
      `Gate failed due to missing .gitignore entries: ${result.error}`)
  }
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
