'use strict'

const assert = require('assert')
const path = require('path')
const os = require('os')
const fs = require('fs')

const { evaluateCleanWorktree, REQUIRED_IGNORES, isGeneratedArtifactPath } = require(require('path').join(require('os').homedir(), '.openclaw', 'genome', 'core', 'clean-worktree-gate'))

const LEADFLOW_DIR = path.resolve(__dirname, '..')
const GITIGNORE_PATH = path.join(LEADFLOW_DIR, '.gitignore')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}`)
    console.error(`     ${err.message}`)
    failed++
  }
}

console.log('\nclean_worktree gate — .gitignore completeness\n')

// Verify all REQUIRED_IGNORES entries are present in the actual .gitignore
test('REQUIRED_IGNORES is defined and non-empty', () => {
  assert.ok(Array.isArray(REQUIRED_IGNORES))
  assert.ok(REQUIRED_IGNORES.length > 0)
})

const gitignoreContent = fs.readFileSync(GITIGNORE_PATH, 'utf8')

for (const entry of REQUIRED_IGNORES) {
  test(`".gitignore" contains required entry: ${entry}`, () => {
    assert.ok(
      gitignoreContent.includes(entry),
      `Expected .gitignore to include "${entry}" but it does not`
    )
  })
}

// Verify isGeneratedArtifactPath correctly classifies entries
test('isGeneratedArtifactPath returns true for ARCHITECTURE.md', () => {
  assert.strictEqual(isGeneratedArtifactPath('ARCHITECTURE.md'), true)
})
test('isGeneratedArtifactPath returns true for DISCOVERIES.md', () => {
  assert.strictEqual(isGeneratedArtifactPath('DISCOVERIES.md'), true)
})
test('isGeneratedArtifactPath returns true for MODULE_INDEX.md.generated', () => {
  assert.strictEqual(isGeneratedArtifactPath('MODULE_INDEX.md.generated'), true)
})
test('isGeneratedArtifactPath returns false for server.js (source file)', () => {
  assert.strictEqual(isGeneratedArtifactPath('server.js'), false)
})

// Simulate the gate with a minimal mock that only has the three new entries
test('gate passes when .gitignore contains all REQUIRED_IGNORES', () => {
  const mockGitignore = REQUIRED_IGNORES.join('\n')
  const mockFs = {
    existsSync: (p) => p.endsWith('.git') || p.endsWith('.gitignore'),
    readFileSync: () => mockGitignore
  }
  const mockExec = () => '' // no dirty files
  const result = evaluateCleanWorktree('/fake/dir', { fsModule: mockFs, execSyncFn: mockExec })
  assert.strictEqual(result.passed, true, `Expected gate to pass but got: ${JSON.stringify(result)}`)
})

test('gate fails when ARCHITECTURE.md is missing from .gitignore', () => {
  const incomplete = REQUIRED_IGNORES.filter(e => e !== 'ARCHITECTURE.md').join('\n')
  const mockFs = {
    existsSync: (p) => p.endsWith('.git') || p.endsWith('.gitignore'),
    readFileSync: () => incomplete
  }
  const mockExec = () => ''
  const result = evaluateCleanWorktree('/fake/dir', { fsModule: mockFs, execSyncFn: mockExec })
  assert.strictEqual(result.passed, false)
  assert.ok(result.error.includes('ARCHITECTURE.md'), `Expected error to mention ARCHITECTURE.md: ${result.error}`)
})

test('gate fails when DISCOVERIES.md is missing from .gitignore', () => {
  const incomplete = REQUIRED_IGNORES.filter(e => e !== 'DISCOVERIES.md').join('\n')
  const mockFs = {
    existsSync: (p) => p.endsWith('.git') || p.endsWith('.gitignore'),
    readFileSync: () => incomplete
  }
  const mockExec = () => ''
  const result = evaluateCleanWorktree('/fake/dir', { fsModule: mockFs, execSyncFn: mockExec })
  assert.strictEqual(result.passed, false)
  assert.ok(result.error.includes('DISCOVERIES.md'))
})

test('gate fails when MODULE_INDEX.md.generated is missing from .gitignore', () => {
  const incomplete = REQUIRED_IGNORES.filter(e => e !== 'MODULE_INDEX.md.generated').join('\n')
  const mockFs = {
    existsSync: (p) => p.endsWith('.git') || p.endsWith('.gitignore'),
    readFileSync: () => incomplete
  }
  const mockExec = () => ''
  const result = evaluateCleanWorktree('/fake/dir', { fsModule: mockFs, execSyncFn: mockExec })
  assert.strictEqual(result.passed, false)
  assert.ok(result.error.includes('MODULE_INDEX.md.generated'))
})

// Verify the gate does NOT fail due to dirty ARCHITECTURE.md / DISCOVERIES.md (they are generated artifacts)
test('gate ignores dirty ARCHITECTURE.md as a generated artifact', () => {
  const mockGitignore = REQUIRED_IGNORES.join('\n')
  const mockFs = {
    existsSync: (p) => p.endsWith('.git') || p.endsWith('.gitignore'),
    readFileSync: () => mockGitignore
  }
  const mockExec = () => 'ARCHITECTURE.md\nDISCOVERIES.md'
  const result = evaluateCleanWorktree('/fake/dir', { fsModule: mockFs, execSyncFn: mockExec })
  assert.strictEqual(result.passed, true, `Expected dirty generated artifacts to be ignored: ${JSON.stringify(result)}`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
