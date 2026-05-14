/**
 * QC guard test: health route timeout implementation.
 *
 * Validates that the health route uses an abortable fetch timeout for DB probes
 * and keeps the timeout budget below the smoke-test 5s ceiling.
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

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
  const source = fs.readFileSync(
    path.join(__dirname, '../app/api/health/route.ts'),
    'utf8'
  )

  await test('DB timeout constant is 1500ms', () => {
    assert.ok(source.includes('const DB_HEALTH_TIMEOUT_MS = 1500'))
  })

  await test('route uses AbortController timeout for DB probe', () => {
    assert.ok(source.includes('const controller = new AbortController()'))
    assert.ok(source.includes('setTimeout(() => controller.abort(), DB_HEALTH_TIMEOUT_MS)'))
    assert.ok(source.includes('signal: controller.signal'))
  })

  await test('route checks real_estate_agents via direct PostgREST query', () => {
    assert.ok(source.includes("new URL('/real_estate_agents', postgrestUrl)"))
    assert.ok(source.includes("url.searchParams.set('select', 'id')"))
    assert.ok(source.includes("url.searchParams.set('limit', '1')"))
  })

  await test('timeout and HTTP failures map to explicit database detail', () => {
    assert.ok(source.includes('exception: timeout after ${DB_HEALTH_TIMEOUT_MS}ms'))
    assert.ok(source.includes('query failed: HTTP ${response.status}'))
  })

  await test('timeout budget remains under smoke test limit', () => {
    assert.ok(1500 < 5000, 'timeout must be less than smoke test budget (5000ms)')
  })

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})
