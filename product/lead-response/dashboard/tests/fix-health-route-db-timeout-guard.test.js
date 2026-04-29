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

test('implements withTimeout wrapper', () => {
  assert.ok(source.includes('function withTimeout'), 'missing withTimeout helper')
  assert.ok(source.includes('timeout after ${timeoutMs}ms'), 'timeout error detail missing')
})

test('applies timeout wrapper to real_estate_agents query', () => {
  assert.ok(source.includes('withTimeout('), 'db query should use withTimeout')
  assert.ok(source.includes(".from('real_estate_agents')"), 'db query table should remain real_estate_agents')
})

test('database errors still flow into check detail', () => {
  assert.ok(source.includes('detail: error ? `query failed: ${error.message}` : \'connected\''), 'expected query failed detail handling')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
