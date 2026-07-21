'use strict'
/**
 * QC E2E: fc3d7a4b — regression guard for isValidPriceId absence.
 * Verifies the bug fix (checkout regex blocked all Stripe payments) is guarded.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const PROJECT = path.join(__dirname, '..')
const GUARD_TEST = path.join(PROJECT, 'tests', 'unit', 'revenue-config-health.test.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try { fn(); console.log(`  PASS: ${name}`); passed++ }
  catch (err) { console.error(`  FAIL: ${name} — ${err.message}`); failed++ }
}

function scanForString(dir, needle) {
  if (!fs.existsSync(dir)) return []
  const hits = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) hits.push(...scanForString(full, needle))
    else if (entry.isFile() && entry.name.endsWith('.js') && fs.readFileSync(full, 'utf8').includes(needle)) hits.push(full)
  }
  return hits
}

console.log('\n=== QC: fc3d7a4b — isValidPriceId regression guard ===\n')

test('isValidPriceId absent from routes/', () => {
  const hits = scanForString(path.join(PROJECT, 'routes'), 'isValidPriceId')
  assert.strictEqual(hits.length, 0, `Found in routes: ${hits.join(', ')}`)
})

test('isValidPriceId absent from lib/', () => {
  const hits = scanForString(path.join(PROJECT, 'lib'), 'isValidPriceId')
  assert.strictEqual(hits.length, 0, `Found in lib: ${hits.join(', ')}`)
})

test('isValidPriceId absent from server.js', () => {
  const src = fs.readFileSync(path.join(PROJECT, 'server.js'), 'utf8')
  assert.ok(!src.includes('isValidPriceId'), 'server.js contains isValidPriceId')
})

test('regression guard section exists in revenue-config-health.test.js', () => {
  const src = fs.readFileSync(GUARD_TEST, 'utf8')
  assert.ok(src.includes('isValidPriceId not in routes/'), 'missing routes/ guard test')
  assert.ok(src.includes('isValidPriceId not in lib/'), 'missing lib/ guard test')
  assert.ok(src.includes('isValidPriceId not in server.js'), 'missing server.js guard test')
})

test('regression guard test passes (node execution)', () => {
  execSync(`node "${GUARD_TEST}"`, { stdio: 'pipe' })
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
