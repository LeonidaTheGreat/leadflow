'use strict'

const assert = require('assert')
const path = require('path')

const collectorPath = path.join(process.env.HOME, '.openclaw', 'genome', 'core', 'mission-metric-collector.js')
const { MissionMetricCollector } = require(collectorPath)

function recentTS(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()
}

function makeStore(runs) {
  let uptimeValue = null
  return {
    getMissionMetrics: async () => [{ name: 'Uptime', collection_method: 'smoke_tests' }],
    getMetrics: async () => runs,
    updateMetricValue: async (_projectId, metricName, value) => {
      if (metricName === 'Uptime') uptimeValue = value
    },
    getUptimeValue: () => uptimeValue,
    query: () => ({
      select: function () { return this },
      eq: function () { return this },
      gte: function () { return this },
      order: function () { return this },
      limit: function () { return this },
      in: function () { return this },
      then: (resolve) => resolve({ data: [], error: null })
    })
  }
}

async function main() {
  const runs = []
  for (let i = 0; i < 10; i++) {
    runs.push({
      data: {
        passed: [{ id: `pass-${i}` }],
        failed: i === 0 ? [{ id: 'critical-fail', severity: 'critical' }] : []
      },
      timestamp: recentTS(i * 5)
    })
  }

  const store = makeStore(runs)
  const collector = new MissionMetricCollector(store)
  await collector.collect('leadflow')

  assert.strictEqual(store.getUptimeValue(), 90, `Expected 90, got ${store.getUptimeValue()}`)
  console.log('PASS: rolling-window uptime = 90% for 1/10 critical-failing runs')
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exit(1)
})
