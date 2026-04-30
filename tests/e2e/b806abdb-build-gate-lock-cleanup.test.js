'use strict'

/**
 * E2E: build gate lock-cleanup fix (task b806abdb)
 *
 * Verifies:
 * 1. cleanup-next-build-lock.js removes a stale .next/lock
 * 2. cleanup-next-build-lock.js is a no-op when no lock present
 * 3. root package.json build script uses npm --prefix (prebuild fires)
 * 4. dashboard package.json prebuild chains cleanup script
 *
 * Run: node tests/e2e/b806abdb-build-gate-lock-cleanup.test.js
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const assert = require('assert')

const ROOT = path.resolve(__dirname, '..', '..')
const DASHBOARD = path.join(ROOT, 'product', 'lead-response', 'dashboard')
const LOCK_PATH = path.join(DASHBOARD, '.next', 'lock')
const CLEANUP_SCRIPT = path.join(DASHBOARD, 'scripts', 'cleanup-next-build-lock.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`)
    failed++
  }
}

function runCleanupScript() {
  return spawnSync(process.execPath, [CLEANUP_SCRIPT], {
    cwd: path.join(DASHBOARD, 'scripts'),
    encoding: 'utf8',
  })
}

// ── Test 1: script file exists ───────────────────────────────────────────────
test('cleanup-next-build-lock.js exists at expected path', () => {
  assert.ok(fs.existsSync(CLEANUP_SCRIPT), `Missing: ${CLEANUP_SCRIPT}`)
})

// ── Test 2: removes stale lock ────────────────────────────────────────────────
test('removes .next/lock when stale lock is present', () => {
  fs.mkdirSync(path.join(DASHBOARD, '.next'), { recursive: true })
  fs.writeFileSync(LOCK_PATH, 'stale', 'utf8')
  assert.ok(fs.existsSync(LOCK_PATH), 'Precondition: lock file must exist')

  const result = runCleanupScript()
  assert.strictEqual(result.status, 0, `Script exited non-zero:\n${result.stderr}`)
  assert.ok(!fs.existsSync(LOCK_PATH), '.next/lock should be removed after cleanup')
  assert.ok(result.stdout.includes('Removed stale .next/lock'), 'Should log removal message')
})

// ── Test 3: no-op when lock absent ────────────────────────────────────────────
test('exits 0 without throw when .next/lock is absent', () => {
  if (fs.existsSync(LOCK_PATH)) fs.rmSync(LOCK_PATH)
  const result = runCleanupScript()
  assert.strictEqual(result.status, 0, `Script should exit 0 with no lock: ${result.stderr}`)
  assert.ok(!fs.existsSync(LOCK_PATH), 'No lock should appear after no-op run')
})

// ── Test 4: root build uses npm --prefix ─────────────────────────────────────
test('root package.json build script uses npm --prefix (ensures prebuild runs)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const buildCmd = (pkg.scripts || {}).build
  assert.ok(buildCmd, 'build script must exist in root package.json')
  assert.ok(
    buildCmd.includes('npm --prefix'),
    `Expected 'npm --prefix' in build script, got: ${buildCmd}`
  )
  assert.ok(
    !buildCmd.includes('npx next build'),
    `build script must not invoke 'npx next build' directly (bypasses prebuild): ${buildCmd}`
  )
})

// ── Test 5: dashboard prebuild includes cleanup ───────────────────────────────
test('dashboard package.json prebuild includes cleanup-next-build-lock.js', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(DASHBOARD, 'package.json'), 'utf8'))
  const prebuild = (pkg.scripts || {}).prebuild
  assert.ok(prebuild, 'prebuild script must exist in dashboard package.json')
  assert.ok(
    prebuild.includes('cleanup-next-build-lock.js'),
    `prebuild must include cleanup-next-build-lock.js, got: ${prebuild}`
  )
})

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
