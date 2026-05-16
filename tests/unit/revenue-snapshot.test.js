'use strict'

const assert = require('assert')
const {
  toRate,
  toPriceCents,
  computeConversionRate,
  computeAlertBreaches,
} = require('../../scripts/tasks/revenue-snapshot-lib')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log(`PASS: ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL: ${name}`)
    console.error(error.message)
  }
}

test('toRate guards divide-by-zero', () => {
  assert.strictEqual(toRate(1, 0), 0)
})

test('plan tier maps to expected cents', () => {
  assert.strictEqual(toPriceCents('starter'), 4900)
  assert.strictEqual(toPriceCents('pro'), 14900)
  assert.strictEqual(toPriceCents('team'), 39900)
})

test('conversion rate uses active/(active+trial)', () => {
  assert.strictEqual(computeConversionRate(2, 8), 0.2)
})

test('alerts breach when below threshold', () => {
  const breaches = computeAlertBreaches({ fubActivationRate: 0.19, ahaCompletionRate: 0.29 })
  assert.strictEqual(breaches.length, 2)
})

test('alerts clear when above threshold', () => {
  const breaches = computeAlertBreaches({ fubActivationRate: 0.25, ahaCompletionRate: 0.35 })
  assert.strictEqual(breaches.length, 0)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
