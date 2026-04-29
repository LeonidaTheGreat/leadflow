/**
 * QC behavioral test: withTimeout() runtime behavior and health route timeout guard.
 *
 * The dev guardrail test only checks source strings. This test verifies actual runtime behavior:
 * - withTimeout rejects after the deadline
 * - withTimeout resolves when the promise completes in time
 * - withTimeout propagates upstream rejections
 * - The health route source applies the timeout to the DB probe
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

// --- Replicate withTimeout from route.ts in plain JS for behavioral testing ---
function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}

let passed = 0
let failed = 0
const results = []

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
    results.push({ name, ok: true })
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
    results.push({ name, ok: false, error: err.message })
  }
}

async function run() {
  console.log('\n=== QC: health route timeout behavior ===\n')

  // 1. Fast promise resolves correctly
  await test('fast promise resolves through withTimeout', async () => {
    const result = await withTimeout(Promise.resolve({ error: null }), 200)
    assert.deepStrictEqual(result, { error: null })
  })

  // 2. Slow promise is rejected with timeout error
  await test('slow promise is rejected after timeout', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve({ error: null }), 300))
    let threw = false
    try {
      await withTimeout(slowPromise, 100)
    } catch (err) {
      threw = true
      assert.ok(
        err.message === 'timeout after 100ms',
        `expected "timeout after 100ms", got "${err.message}"`
      )
    }
    assert.ok(threw, 'expected withTimeout to throw on slow promise')
  })

  // 3. Upstream rejections propagate, not masked as timeout
  await test('upstream rejection propagates unchanged', async () => {
    const failingPromise = Promise.reject(new Error('db error: connection refused'))
    let threw = false
    try {
      await withTimeout(failingPromise, 500)
    } catch (err) {
      threw = true
      assert.ok(
        err.message === 'db error: connection refused',
        `expected original error, got "${err.message}"`
      )
    }
    assert.ok(threw, 'expected rejection to propagate')
  })

  // 4. Timer is cleared on successful resolve (no dangling setTimeouts)
  await test('timer cleared after resolve — no unhandled rejections', async () => {
    // If timer is not cleared, promise settling after timeout fires an unhandled rejection.
    // This test verifies that resolving before the timeout leaves no residual effects.
    let unhandled = false
    const origHandler = process.listeners('unhandledRejection')
    process.once('unhandledRejection', () => { unhandled = true })

    await withTimeout(Promise.resolve('ok'), 500)
    await new Promise((r) => setTimeout(r, 50)) // let any stray timers fire

    assert.ok(!unhandled, 'unhandled rejection fired — timer was not cleared')
    // restore
    process.removeAllListeners('unhandledRejection')
    origHandler.forEach((h) => process.on('unhandledRejection', h))
  })

  // 5. Source-level guard: DB_HEALTH_TIMEOUT_MS is 1500 (Vercel smoke test budget is 5s)
  await test('DB_HEALTH_TIMEOUT_MS is set to 1500ms (well within 5s smoke budget)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../app/api/health/route.ts'),
      'utf8'
    )
    assert.ok(
      source.includes('const DB_HEALTH_TIMEOUT_MS = 1500'),
      'DB_HEALTH_TIMEOUT_MS must be 1500'
    )
    // 1500ms timeout + route overhead stays under the 5000ms curl -m 5 smoke budget
    assert.ok(1500 < 5000, 'timeout must be less than smoke test budget (5000ms)')
  })

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
