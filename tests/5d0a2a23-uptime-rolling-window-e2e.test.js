'use strict'

const assert = require('assert')
const path = require('path')

const collectorPath = path.join(process.env.HOME, '.openclaw', 'genome', 'core', 'mission-metric-collector.js')
const { MissionMetricCollector } = require(collectorPath)

function recentTS(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
}

function makeRun(minutesAgo, { criticalFails = 0, warningFails = 0, passCount = 3 } = {}) {
  const failed = []
  for (let i = 0; i < criticalFails; i++) failed.push({ id: `crit-${i}`, severity: 'critical' })
  for (let i = 0; i < warningFails; i++) failed.push({ id: `warn-${i}`, severity: 'warning' })
  const passed = Array.from({ length: passCount }, (_, i) => ({ id: `pass-${i}` }))
  return { data: { passed, failed }, timestamp: recentTS(minutesAgo) }
}

function makeStore(smokeRuns) {
  const values = {}
  return {
    getMissionMetrics: async () => [{ name: 'Uptime', collection_method: 'smoke_tests' }],
    getMetrics: async () => smokeRuns,
    updateMetricValue: async (_pid, name, val) => { values[name] = val },
    getValue: (name) => values[name],
    query: () => ({
      select: function () { return this },
      eq: function () { return this },
      gte: function () { return this },
      order: function () { return this },
      limit: function () { return this },
      in: function () { return this },
      then: (resolve) => resolve({ data: smokeRuns, error: null })
    })
  }
}

async function run() {
  const runs = []
  for (let i = 0; i < 10; i++) runs.push(makeRun(i * 5, { criticalFails: i === 0 ? 1 : 0 }))

  const store = makeStore(runs)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')

  assert.strictEqual(store.getValue('Uptime'), 96.8, 'Expected rolling uptime to aggregate passed/total checks across rows')
  console.log('PASS 5d0a2a23 uptime rolling-window e2e')
}

run().catch((err) => {
  console.error('FAIL 5d0a2a23 uptime rolling-window e2e')
  console.error(err)
  process.exit(1)
})
