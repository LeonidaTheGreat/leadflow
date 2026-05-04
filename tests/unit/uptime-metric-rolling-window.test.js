'use strict'

/**
 * Test: Uptime Metric Rolling 24h Window
 *
 * Verifies that _collectSmokeTestMetrics uses a rolling 24h window (limit: 288)
 * instead of a point-in-time snapshot (limit: 1), and that only critical-severity
 * failures count against uptime.
 *
 * PRD: docs/prd/PRD-UPTIME-METRIC-ROLLING-WINDOW.md
 */

const assert = require('assert')
const path = require('path')

const COLLECTOR_PATH = path.join(
  process.env.HOME, '.openclaw', 'genome', 'core', 'mission-metric-collector.js'
)

let MissionMetricCollector
try {
  ({ MissionMetricCollector } = require(COLLECTOR_PATH))
} catch (e) {
  console.error(`Cannot load MissionMetricCollector from ${COLLECTOR_PATH}: ${e.message}`)
  process.exit(1)
}

const results = []

function test(name, fn) {
  try {
    fn()
    results.push(true)
    console.log(`  ✅ ${name}`)
  } catch (error) {
    results.push(false)
    console.error(`  ❌ ${name}: ${error.message}`)
  }
}

async function asyncTest(name, fn) {
  try {
    await fn()
    results.push(true)
    console.log(`  ✅ ${name}`)
  } catch (error) {
    results.push(false)
    console.error(`  ❌ ${name}: ${error.message}`)
  }
}

function makeStore(getMetricsResult) {
  return {
    getMissionMetrics: async () => [{ name: 'Uptime', collection_method: 'smoke_tests' }],
    updateMetricValue: async () => true,
    getMetrics: async (projectId, opts) => {
      makeStore._lastGetMetricsOpts = opts
      return getMetricsResult
    },
    query: () => ({
      select: function () { return this },
      eq: function () { return this },
      gte: function () { return this },
      order: function () { return this },
      limit: function () { return this },
      in: function () { return this },
      then: (res) => res({ data: [], error: null })
    })
  }
}

function recentTS(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
}

console.log('\nUptime Metric Rolling 24h Window Tests\n')

// Test 1: queries with limit 288 (not limit 1)
asyncTest('queries smoke_tests with limit: 288 for 24h window', async () => {
  const runs = [{ data: { passed: [{ id: 'a' }], failed: [] }, timestamp: recentTS(5) }]
  const store = makeStore(runs)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')

  const opts = makeStore._lastGetMetricsOpts
  assert.strictEqual(opts.limit, 288, `Expected limit: 288, got ${opts.limit}`)
  assert.strictEqual(opts.domain, 'smoke_tests')
})

// Test 2: rolling window — one critical failure in 10 runs = 90% uptime
.then(() => asyncTest('one critical failure in 10 runs yields 90% uptime', async () => {
  const runs = []
  for (let i = 0; i < 10; i++) {
    runs.push({
      data: {
        passed: [{ id: 'a', name: 'Dashboard' }],
        failed: i === 0 ? [{ id: 'c', name: 'Webhook', severity: 'critical' }] : []
      },
      timestamp: recentTS(i * 5)
    })
  }
  let uptimeValue = null
  const store = makeStore(runs)
  store.updateMetricValue = async (proj, name, value) => { if (name === 'Uptime') uptimeValue = value }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  assert.strictEqual(uptimeValue, 90, `Expected 90% uptime, got ${uptimeValue}`)
}))

// Test 3: warning-severity failures do NOT count against uptime
.then(() => asyncTest('warning-severity failures do not reduce uptime', async () => {
  const runs = [
    {
      data: { passed: [{ id: 'a' }], failed: [{ id: 'b', name: 'LeadSim', severity: 'warning' }] },
      timestamp: recentTS(5)
    },
    {
      data: { passed: [{ id: 'a' }], failed: [] },
      timestamp: recentTS(10)
    }
  ]
  let uptimeValue = null
  const store = makeStore(runs)
  store.updateMetricValue = async (proj, name, value) => { if (name === 'Uptime') uptimeValue = value }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  assert.strictEqual(uptimeValue, 100, `Expected 100% (warnings ignored), got ${uptimeValue}`)
}))

// Test 4: runs older than 24h are excluded
.then(() => asyncTest('runs older than 24h are excluded from the window', async () => {
  const runs = [
    { data: { passed: [{ id: 'a' }], failed: [] }, timestamp: recentTS(5) },
    { data: { passed: [], failed: [{ id: 'b', severity: 'critical' }] }, timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() }
  ]
  let uptimeValue = null
  const store = makeStore(runs)
  store.updateMetricValue = async (proj, name, value) => { if (name === 'Uptime') uptimeValue = value }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  assert.strictEqual(uptimeValue, 100, `Expected 100% (old run excluded), got ${uptimeValue}`)
}))

// Test 5: 20-min blip scenario from PRD — ~98.6% not 42.9%
.then(() => asyncTest('20-min outage in 24h yields ~98.6% (PRD scenario)', async () => {
  const runs = []
  const FIVE_MIN_MS = 5 * 60 * 1000
  // 288 runs = 24h at 5-min cadence. 4 runs fail (20 min outage).
  for (let i = 0; i < 288; i++) {
    const isFailing = i >= 280 && i < 284
    runs.push({
      data: {
        passed: isFailing ? [] : [{ id: 'a' }, { id: 'b' }],
        failed: isFailing ? [
          { id: 'c', name: 'signup-page', severity: 'critical' },
          { id: 'd', name: 'login-page', severity: 'critical' }
        ] : []
      },
      timestamp: new Date(Date.now() - i * FIVE_MIN_MS).toISOString()
    })
  }
  let uptimeValue = null
  const store = makeStore(runs)
  store.updateMetricValue = async (proj, name, value) => { if (name === 'Uptime') uptimeValue = value }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  // 284 healthy / 288 total = 98.6%
  assert.ok(uptimeValue >= 98 && uptimeValue <= 99, `Expected ~98.6% uptime for 20-min blip, got ${uptimeValue}`)
}))

// Test 6: returns null when no smoke metrics exist
.then(() => asyncTest('returns null (skipped) when no smoke runs exist', async () => {
  let uptimeValue = 'not-set'
  const store = makeStore([])
  store.updateMetricValue = async (proj, name, value) => { if (name === 'Uptime') uptimeValue = value }
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')
  assert.strictEqual(uptimeValue, 'not-set', `Expected Uptime to be skipped (null), but updateMetricValue was called with ${uptimeValue}`)
}))

.then(() => {
  const passed = results.filter(Boolean).length
  const total = results.length
  console.log(`\nPassed ${passed}/${total} checks`)
  process.exit(passed === total ? 0 : 1)
})
