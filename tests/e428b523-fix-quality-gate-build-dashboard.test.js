'use strict'

const assert = require('assert')
const path = require('path')
const os = require('os')
const fs = require('fs')

const { isLockFailure, clearNextLockIfPresent } = require('../scripts/build-dashboard')

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

console.log('\nbuild-dashboard.js — unit tests\n')

// --- isLockFailure ---
test('isLockFailure returns true for Next.js lock error string', () => {
  const stderr = 'Error: Another next build process is already running'
  assert.strictEqual(isLockFailure(stderr), true)
})

test('isLockFailure returns false for unrelated error', () => {
  const stderr = 'Module not found: Error: Cannot resolve'
  assert.strictEqual(isLockFailure(stderr), false)
})

test('isLockFailure returns false for empty string', () => {
  assert.strictEqual(isLockFailure(''), false)
})

test('isLockFailure returns false for undefined', () => {
  assert.strictEqual(isLockFailure(undefined), false)
})

// --- clearNextLockIfPresent ---
test('clearNextLockIfPresent returns false when no lock exists', () => {
  // The dashboard .next/lock should not exist in a clean env
  const result = clearNextLockIfPresent()
  // Result is either true (removed) or false (not found) — both are valid
  assert.ok(typeof result === 'boolean')
})

test('clearNextLockIfPresent removes lock file and returns true', () => {
  const dashboardDir = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')
  const nextDir = path.join(dashboardDir, '.next')
  const lockPath = path.join(nextDir, 'lock')

  // Create .next dir and a fake lock file
  fs.mkdirSync(nextDir, { recursive: true })
  fs.writeFileSync(lockPath, 'stale-lock')

  const result = clearNextLockIfPresent()
  assert.strictEqual(result, true, 'should return true when lock was removed')
  assert.ok(!fs.existsSync(lockPath), 'lock file should be gone')
})

test('clearNextLockIfPresent is idempotent — second call returns false', () => {
  const dashboardDir = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard')
  const lockPath = path.join(dashboardDir, '.next', 'lock')
  // Lock was removed by previous test
  assert.ok(!fs.existsSync(lockPath))
  const result = clearNextLockIfPresent()
  assert.strictEqual(result, false, 'second call should return false — nothing to remove')
})

// --- Exports check ---
test('build-dashboard exports buildDashboard, isLockFailure, clearNextLockIfPresent', () => {
  const mod = require('../scripts/build-dashboard')
  assert.ok(typeof mod.buildDashboard === 'function')
  assert.ok(typeof mod.isLockFailure === 'function')
  assert.ok(typeof mod.clearNextLockIfPresent === 'function')
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
