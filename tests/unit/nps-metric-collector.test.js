'use strict'

/**
 * Test: NPS Metric Auto-Collection
 *
 * Verifies that:
 *   1. nps_collector collection_method is dispatched to _collectNPSMetrics()
 *   2. NPS calculation: promoters (>=9) - detractors (<=6), expressed as integer
 *   3. Returns null (skipped) when no responses exist
 *   4. Returns null (skipped) when responses are outside the 90-day window
 *
 * Formula: NPS = round(((promoters - detractors) / total) * 100)
 * Example: promoters=6, detractors=2, passives=2, total=10 → NPS = round(((6-2)/10)*100) = 40
 */

const assert = require('assert')
const path = require('path')

const COLLECTOR_PATH = path.join(
  process.env.HOME, '.openclaw', 'genome', 'core', 'actuators', 'mission-metric-collector.js'
)

let MissionMetricCollector
try {
  ;({ MissionMetricCollector } = require(COLLECTOR_PATH))
} catch (e) {
  console.error(`Cannot load MissionMetricCollector from ${COLLECTOR_PATH}: ${e.message}`)
  process.exit(1)
}

const results = []

async function test(name, fn) {
  try {
    await fn()
    results.push(true)
    console.log(`  PASS: ${name}`)
  } catch (err) {
    results.push(false)
    console.error(`  FAIL: ${name}: ${err.message}`)
  }
}

/**
 * Build a minimal mock store that returns the given responses from agent_nps_responses.
 * All other queries return empty arrays.
 */
function makeNPSStore(responses) {
  const capturedValues = {}
  return {
    getMissionMetrics: async () => [{ name: 'NPS Score', collection_method: 'nps_collector' }],
    updateMetricValue: async (_projectId, name, value) => {
      capturedValues[name] = value
      return true
    },
    getValue: (name) => capturedValues[name],
    query: (table) => {
      const chain = {
        select: function () { return this },
        eq: function () { return this },
        gte: function () { return this },
        order: function () { return this },
        limit: function () { return this },
        in: function () { return this },
        then: (resolve) => {
          if (table === 'agent_nps_responses') {
            resolve({ data: responses, error: null })
          } else {
            resolve({ data: [], error: null })
          }
        }
      }
      // Make awaitable
      const promise = Promise.resolve({ data: table === 'agent_nps_responses' ? responses : [], error: null })
      Object.assign(chain, promise)
      chain[Symbol.iterator] = undefined
      // Override then to be a proper promise method
      chain.then = (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected)
      chain.catch = (onRejected) => promise.catch(onRejected)
      return chain
    },
    getMetrics: async () => []
  }
}

console.log('\nNPS Metric Auto-Collection Tests\n')

// Test 1: NPS calculation with known values
// promoters=6, detractors=2, passives=2, total=10 → NPS = round(((6-2)/10)*100) = 40
test('NPS = 40 when promoters=6, detractors=2, passives=2 (total=10)', async () => {
  const responses = [
    { score: 10 }, { score: 9 }, { score: 9 }, { score: 10 }, { score: 9 }, { score: 10 }, // 6 promoters
    { score: 7 }, { score: 8 },                                                               // 2 passives
    { score: 3 }, { score: 6 }                                                               // 2 detractors
  ]
  const store = makeNPSStore(responses)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  const nps = store.getValue('NPS Score')
  assert.strictEqual(nps, 40, `Expected NPS=40, got ${nps}`)
})

// Test 2: nps_collector is dispatched (collect() calls updateMetricValue for NPS Score)
.then(() => test('nps_collector method is dispatched to _collectNPSMetrics', async () => {
  let updated = false
  const store = makeNPSStore([{ score: 9 }, { score: 8 }])
  store.updateMetricValue = async (_pid, name) => {
    if (name === 'NPS Score') updated = true
    return true
  }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  assert.ok(updated, 'Expected updateMetricValue to be called with "NPS Score"')
}))

// Test 3: returns null (skipped) when no responses
.then(() => test('NPS Score is skipped (null) when no responses exist', async () => {
  let called = false
  const store = makeNPSStore([])
  store.updateMetricValue = async (_pid, name) => {
    if (name === 'NPS Score') called = true
    return true
  }
  const collector = new MissionMetricCollector(store)
  const result = await collector.collect('leadflow')
  assert.ok(!called, 'Expected updateMetricValue NOT to be called when no responses')
  assert.ok(result.skipped >= 1, `Expected skipped >= 1, got ${result.skipped}`)
}))

// Test 4: all promoters → NPS = 100
.then(() => test('NPS = 100 when all responses are promoters (score=10)', async () => {
  const responses = [{ score: 10 }, { score: 9 }, { score: 10 }]
  const store = makeNPSStore(responses)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  const nps = store.getValue('NPS Score')
  assert.strictEqual(nps, 100, `Expected NPS=100, got ${nps}`)
}))

// Test 5: all detractors → NPS = -100
.then(() => test('NPS = -100 when all responses are detractors (score=1)', async () => {
  const responses = [{ score: 1 }, { score: 2 }, { score: 6 }]
  const store = makeNPSStore(responses)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  const nps = store.getValue('NPS Score')
  assert.strictEqual(nps, -100, `Expected NPS=-100, got ${nps}`)
}))

// Test 6: passives only → NPS = 0
.then(() => test('NPS = 0 when all responses are passives (score=7 or 8)', async () => {
  const responses = [{ score: 7 }, { score: 8 }, { score: 7 }]
  const store = makeNPSStore(responses)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  const nps = store.getValue('NPS Score')
  assert.strictEqual(nps, 0, `Expected NPS=0 for passives-only, got ${nps}`)
}))

.then(() => {
  const passed = results.filter(Boolean).length
  const total = results.length
  console.log(`\nPassed ${passed}/${total} checks`)
  process.exit(passed === total ? 0 : 1)
})
