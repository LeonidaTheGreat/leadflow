'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync, spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..')
const DASHBOARD_DIR = path.join(ROOT, 'product', 'lead-response', 'dashboard')
const LOCK_PATH = path.join(DASHBOARD_DIR, '.next', 'lock')
const CLEANUP_SCRIPT = path.join(DASHBOARD_DIR, 'scripts', 'cleanup-next-build-lock.js')

function ensureNextDir() {
  fs.mkdirSync(path.join(DASHBOARD_DIR, '.next'), { recursive: true })
}

function writeStaleLock() {
  ensureNextDir()
  fs.writeFileSync(LOCK_PATH, 'stale')
}

function removeLockIfExists() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
}

function isNextBuildRunning() {
  try {
    const ps = execSync('pgrep -f "node_modules/.bin/next"', { encoding: 'utf8' })
    return ps.trim().length > 0
  } catch {
    return false
  }
}

// Test 1: cleanup script behaviour respects the active-build guard
;(function testLockCleanupBehaviourWithGuard() {
  writeStaleLock()
  assert.ok(fs.existsSync(LOCK_PATH), 'Setup: lock should exist before cleanup')

  const buildRunning = isNextBuildRunning()
  const result = spawnSync(process.execPath, [CLEANUP_SCRIPT], { encoding: 'utf8' })
  assert.strictEqual(result.status, 0, `Cleanup script should exit 0. stderr: ${result.stderr}`)

  if (buildRunning) {
    // Guard must preserve lock when a real build is active
    assert.ok(fs.existsSync(LOCK_PATH), 'Lock should be preserved when a next build is running')
    assert.ok(
      result.stdout.includes('already running') || result.stdout.includes('skipping'),
      `Should log skip message when build is running. stdout: ${result.stdout}`
    )
    console.log('✅ Test 1 passed: lock preserved while next build is active (guard working)')
  } else {
    // Guard must remove lock when no build is active
    assert.ok(!fs.existsSync(LOCK_PATH), 'Lock should be removed when no next build is running')
    assert.ok(result.stdout.includes('Removed stale'), `Should log removal. stdout: ${result.stdout}`)
    console.log('✅ Test 1 passed: stale lock removed when no build running')
  }
})()

// Cleanup for subsequent tests
removeLockIfExists()

// Test 2: cleanup script is a no-op when lock does not exist
;(function testNoOpWhenNoLock() {
  removeLockIfExists()
  assert.ok(!fs.existsSync(LOCK_PATH), 'Setup: lock should not exist')

  const result = spawnSync(process.execPath, [CLEANUP_SCRIPT], { encoding: 'utf8' })
  assert.strictEqual(result.status, 0, `Cleanup script should exit 0 with no lock present: ${result.stderr}`)
  assert.ok(!fs.existsSync(LOCK_PATH), 'Lock should still not exist')
  console.log('✅ Test 2 passed: no-op when lock absent')
})()

// Test 3: root package.json build script uses npm --prefix (ensuring prebuild runs)
;(function testRootBuildScriptUsesPrefix() {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const buildScript = pkgJson.scripts && pkgJson.scripts.build
  assert.ok(buildScript, 'root package.json must have a build script')
  assert.ok(
    buildScript.includes('npm --prefix') || (buildScript.includes('npm') && buildScript.includes('run build')),
    `build script must use npm to invoke dashboard build (so prebuild runs). Got: ${buildScript}`
  )
  assert.ok(!buildScript.match(/^cd .+&& npx next build/), 'build script must not use bare cd+npx (bypasses prebuild)')
  console.log('✅ Test 3 passed: root build script delegates via npm (prebuild runs)')
})()

// Test 4: dashboard prebuild includes cleanup script
;(function testPrebuildIncludesCleanup() {
  const pkgJson = JSON.parse(fs.readFileSync(path.join(DASHBOARD_DIR, 'package.json'), 'utf8'))
  const prebuild = pkgJson.scripts && pkgJson.scripts.prebuild
  assert.ok(prebuild, 'dashboard package.json must have a prebuild script')
  assert.ok(
    prebuild.includes('cleanup-next-build-lock'),
    `prebuild must include cleanup-next-build-lock.js. Got: ${prebuild}`
  )
  console.log('✅ Test 4 passed: dashboard prebuild includes lock cleanup')
})()

// Test 5: cleanup script has process guard (references child_process and pgrep)
;(function testCleanupScriptHasProcessGuard() {
  const src = fs.readFileSync(CLEANUP_SCRIPT, 'utf8')
  assert.ok(src.includes('child_process'), 'cleanup script must require child_process for process check')
  assert.ok(src.includes('pgrep'), 'cleanup script must use pgrep to check for active next build')
  assert.ok(src.includes('node_modules/.bin/next'), 'cleanup script must match the actual next.js binary path')
  console.log('✅ Test 5 passed: cleanup script has specific process guard')
})()

console.log('\n✅ All 5 build-lock-fix tests passed.')
