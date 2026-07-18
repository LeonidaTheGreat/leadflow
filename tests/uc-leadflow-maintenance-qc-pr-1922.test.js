'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

// Load cleanupBuildArtifacts from the branch under review
const SCRIPT_PATH = path.resolve(
  '/private/var/folders/6d/xd0z4ldx1l17klqt54scqxsc0000gp/T/leadflow-2402c9a6-809a-4c96-b563-605ff7c92218',
  'product/lead-response/dashboard/scripts/cleanup-next-build-lock.js'
)

const { cleanupBuildArtifacts, BUILD_TRACE_PATH, BUILD_CACHE_PATH } = require(SCRIPT_PATH)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\ncleanupBuildArtifacts — real-filesystem E2E\n')

// Test 1: removes .next/trace file and .next/cache directory when both exist
test('removes trace file and cache directory from a real temp .next dir', () => {
  const tmpNext = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-next-'))
  const tracePath = path.join(tmpNext, 'trace')
  const cachePath = path.join(tmpNext, 'cache')
  const cacheFile = path.join(cachePath, 'some-cached-module.js')

  fs.writeFileSync(tracePath, '{"traceEvents":[]}')
  fs.mkdirSync(cachePath)
  fs.writeFileSync(cacheFile, '// cached')

  cleanupBuildArtifacts(tmpNext)

  assert.ok(!fs.existsSync(tracePath), `trace file should be removed`)
  assert.ok(!fs.existsSync(cachePath), `cache directory should be removed`)

  fs.rmSync(tmpNext, { recursive: true, force: true })
})

// Test 2: no-op when .next directory does not exist at all
test('is a no-op when buildDir does not exist', () => {
  const ghost = path.join(os.tmpdir(), 'qc-next-nonexistent-' + process.pid)
  assert.ok(!fs.existsSync(ghost), 'precondition: directory must not exist')

  assert.doesNotThrow(() => cleanupBuildArtifacts(ghost))
})

// Test 3: no-op when trace and cache are already absent (no throw on missing targets)
test('is a no-op when .next exists but trace/cache are absent', () => {
  const tmpNext = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-next-empty-'))
  // Only the lock file exists — not trace or cache
  fs.writeFileSync(path.join(tmpNext, 'lock'), '')

  assert.doesNotThrow(() => cleanupBuildArtifacts(tmpNext))
  assert.ok(fs.existsSync(path.join(tmpNext, 'lock')), 'lock file must be untouched')

  fs.rmSync(tmpNext, { recursive: true, force: true })
})

// Test 4: exported constants reference the correct default paths relative to the script
test('BUILD_TRACE_PATH and BUILD_CACHE_PATH point inside the dashboard .next dir', () => {
  assert.ok(BUILD_TRACE_PATH.includes('.next'), `expected .next in trace path: ${BUILD_TRACE_PATH}`)
  assert.ok(BUILD_TRACE_PATH.endsWith('/trace'), `expected /trace suffix: ${BUILD_TRACE_PATH}`)
  assert.ok(BUILD_CACHE_PATH.includes('.next'), `expected .next in cache path: ${BUILD_CACHE_PATH}`)
  assert.ok(BUILD_CACHE_PATH.endsWith('/cache'), `expected /cache suffix: ${BUILD_CACHE_PATH}`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
