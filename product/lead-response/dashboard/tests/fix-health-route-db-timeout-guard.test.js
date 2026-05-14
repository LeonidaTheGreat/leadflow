/**
 * E2E Guardrail Test: health route DB timeout protection
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROUTE_FILE = path.join(__dirname, '../app/api/health/route.ts')
const source = fs.readFileSync(ROUTE_FILE, 'utf8')

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

console.log('\n=== E2E Guardrail: fix-health-route-db-timeout-guard ===\n')

test('defines explicit DB health timeout constant', () => {
  assert.ok(source.includes('const DB_HEALTH_TIMEOUT_MS = 1500'), 'missing DB_HEALTH_TIMEOUT_MS constant')
})

test('implements abortable DB probe helper', () => {
  assert.ok(source.includes('async function checkDatabaseHealth'), 'missing checkDatabaseHealth helper')
  assert.ok(source.includes('const controller = new AbortController()'), 'missing AbortController timeout guard')
  assert.ok(source.includes('setTimeout(() => controller.abort(), DB_HEALTH_TIMEOUT_MS)'), 'abort timeout not configured')
})

test('applies timeout guard to real_estate_agents query', () => {
  assert.ok(source.includes("new URL('/real_estate_agents', postgrestUrl)"), 'db query table should remain real_estate_agents')
  assert.ok(source.includes('signal: controller.signal'), 'fetch should bind abort signal')
})

test('database errors still flow into check detail', () => {
  assert.ok(source.includes('query failed: HTTP ${response.status}'), 'expected HTTP query failed detail handling')
  assert.ok(source.includes('exception: timeout after ${DB_HEALTH_TIMEOUT_MS}ms'), 'expected timeout exception detail handling')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
