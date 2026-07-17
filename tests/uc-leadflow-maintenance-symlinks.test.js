'use strict'
// E2E test for PR #1895: verify genome symlinks resolve to correct targets
// Tests that project-config-loader.js, subagent-completion-report.js, and task-store.js
// point to ~/projects/genome/core/ (not the old ~/.openclaw/genome/core/ path).

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const os = require('os')

const REPO_ROOT = path.join(__dirname, '..')
const GENOME_CORE = path.join(os.homedir(), 'projects', 'genome', 'core')
const OLD_GENOME_CORE = path.join(os.homedir(), '.openclaw', 'genome', 'core')

const SYMLINKS = [
  'project-config-loader.js',
  'subagent-completion-report.js',
  'task-store.js',
]

let passed = 0
let failed = 0

function ok(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`)
    failed++
  }
}

console.log('\n🧪 PR #1895 — Genome symlink path fix\n')

for (const name of SYMLINKS) {
  const symPath = path.join(REPO_ROOT, name)
  const expectedTarget = path.join(GENOME_CORE, name)

  ok(`${name} is a symlink`, () => {
    const stat = fs.lstatSync(symPath)
    assert.ok(stat.isSymbolicLink(), `${name} is not a symlink`)
  })

  ok(`${name} points to projects/genome/core/ (not .openclaw)`, () => {
    const target = fs.readlinkSync(symPath)
    assert.ok(
      target.includes('/projects/genome/core/'),
      `Expected target under projects/genome/core/, got: ${target}`
    )
    assert.ok(
      !target.includes('/.openclaw/'),
      `Target still points to old .openclaw path: ${target}`
    )
  })

  ok(`${name} target file exists and is readable`, () => {
    fs.accessSync(expectedTarget, fs.constants.R_OK)
  })

  ok(`${name} resolves (require works)`, () => {
    const mod = require(symPath)
    assert.ok(mod && typeof mod === 'object', `require(${name}) returned non-object`)
  })
}

ok('Old .openclaw/genome/core path does not exist (confirming migration)', () => {
  assert.ok(
    !fs.existsSync(OLD_GENOME_CORE),
    `Old path still exists: ${OLD_GENOME_CORE} — stale symlinks would work too`
  )
})

// Confirm lint won't fail due to broken symlinks (ESLint errors on unresolvable symlinks)
ok('ESLint can read project-config-loader.js (no ENOENT)', () => {
  const content = fs.readFileSync(path.join(REPO_ROOT, 'project-config-loader.js'), 'utf-8')
  assert.ok(content.length > 100, 'File appears empty or unreadable')
})

console.log(`\n============================================================`)
console.log(`📊 SYMLINK TEST REPORT`)
console.log(`============================================================`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)
console.log(`============================================================`)

if (failed > 0) {
  process.exit(1)
}
